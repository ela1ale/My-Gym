/* ============================================================
   app-core.js — هسته: ذخیره‌سازی، کاربران، برنامه‌ریزی هوشمند
   ============================================================ */

let users = [], currentUserId = null;
let exerciseBank = {}, userProgram = { days: [] }, workoutData = {};
let currentDay = 'all', completedExercises = {}, collapsedExercises = {};
let activeTimers = {}, cardioTimers = {}, exerciseLogs = {}, setTimers = {}, openLoggers = {};
let userSettings = {}, chartInstance = null, globalTicker = null;
let autosaveIntervalId = null, saveIndicatorTimer = null;
let history = {};
let chartRange = 'week';
let exerciseObserver = null;
let pendingPwdUserId = null;
let pendingSmartSetup = null;

/* ============ Helpers ============ */
function getStateKey(){ return STATE_KEY_PREFIX + currentUserId; }
function getSettingsKey(){ return SETTINGS_KEY_PREFIX + currentUserId; }
function getBankKey(){ return BANK_KEY_PREFIX + currentUserId; }
function getProgramKey(){ return PROGRAM_KEY_PREFIX + currentUserId; }
function getHistoryKey(){ return HISTORY_KEY_PREFIX + currentUserId; }
function getWeekStartKey(){ return WEEK_START_KEY_PREFIX + currentUserId; }
function getCurrentUser(){ return users.find(u=>u.id===currentUserId) || null; }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

function showToast(msg, type='success', duration=5000){
  if(!userSettings.toastsEnabled) return;
  const c = document.getElementById('toastContainer'); if(!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type==='success'?'':type);
  const icons = {success:'✅', warn:'⚠️', info:'ℹ️'};
  t.innerHTML = `<span class="icon">${icons[type]||'✅'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>{ if(t.parentNode) t.parentNode.removeChild(t); }, duration+300);
}

function formatNum(n){
  if(n === null || n === undefined || isNaN(n)) return '—';
  n = Number(n);
  return userSettings.numberFormat === 'fa' ? n.toLocaleString('fa-IR') : n.toLocaleString('en-US');
}

function formatTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60), s = sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function getRemaining(st){ if(!st) return 0;
  if(st.running && st.endTimestamp) return Math.max(0, Math.ceil((st.endTimestamp - Date.now())/1000));
  return Math.max(0, st.remaining); }

function getSetElapsed(key){ const st = setTimers[key]; if(!st) return 0;
  if(st.running && st.startedAt) return Math.floor((Date.now()-st.startedAt)/1000) + (st.elapsed||0);
  return st.elapsed || 0; }

function isCollapsed(key){
  const isDone = !!completedExercises[key];
  if(collapsedExercises[key] === 'expanded') return false;
  if(collapsedExercises[key] === 'collapsed') return true;
  return isDone && userSettings.autoCollapseDone;
}

function dateKey(d = new Date()){
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`;
}

function getWeekStart(date = new Date()){
  const d = new Date(date); const day = d.getDay(); const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff); d.setHours(0,0,0,0); return d;
}

function toJalali(gy, gm, gd){
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365*gy) + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400) - 80 + gd + g_d_m[gm-1];
  jy += 33 * Math.floor(days/12053); days %= 12053;
  jy += 4 * Math.floor(days/1461); days %= 1461;
  if(days > 365){ jy += Math.floor((days-1)/365); days = (days-1) % 365; }
  const jm = (days < 186) ? 1 + Math.floor(days/31) : 7 + Math.floor((days-186)/30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days-186) % 30));
  return [jy, jm, jd];
}

function jalaliToGregorian(jy, jm, jd){
  jy += 1595;
  let days = -355668 + (365 * jy) + (Math.floor(jy/33) * 8) + Math.floor(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097); days %= 146097;
  if(days > 36524){ gy += 100 * Math.floor(--days / 36524); days %= 36524; if(days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461); days %= 1461;
  if(days > 365){ gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for(gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

function jalaliMonthDays(jy, jm){
  if(jm <= 6) return 31; if(jm <= 11) return 30;
  const mod = jy % 33; return [1,5,9,13,17,22,26,30].includes(mod) ? 30 : 29;
}

/* ============ Password (light obfuscation - client side only) ============ */
async function hashPassword(pwd){
  if(!pwd) return '';
  if(window.crypto && crypto.subtle){
    const buf = new TextEncoder().encode('profit::' + pwd);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  // Fallback: simple hash
  let h = 0; const s = 'profit::' + pwd;
  for(let i = 0; i < s.length; i++){ h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return 'fb_' + Math.abs(h).toString(16);
}

/* ============ History ============ */
function loadHistory(){
  try{ const raw = localStorage.getItem(getHistoryKey()); history = raw ? JSON.parse(raw) : {}; }catch(e){ history = {}; }
}
function saveHistory(){ try{ localStorage.setItem(getHistoryKey(), JSON.stringify(history)); }catch(e){} }

function logTodayStats(){
  const todayKey = getTodayDayKey(); if(!todayKey) return;
  const day = workoutData[todayKey]; if(!day) return;
  let completed = 0, volume = 0;
  day.exercises.forEach((_,i)=>{
    const key = `${todayKey}-${i}`;
    if(completedExercises[key]) completed++;
    const logs = exerciseLogs[key] || [];
    logs.forEach(l=>{ if(l.weight && l.reps) volume += l.weight * l.reps; });
  });
  const dk = dateKey();
  if(completed === 0 && volume === 0){ if(!history[dk]) return; }
  history[dk] = { dayKey: todayKey, completed, total: day.exercises.length, volume: Math.round(volume) };
  saveHistory();
}

function checkWeekReset(){
  const currentWeekStart = dateKey(getWeekStart());
  const savedWeekStart = localStorage.getItem(getWeekStartKey()) || '';
  if(!savedWeekStart){ try{ localStorage.setItem(getWeekStartKey(), currentWeekStart); }catch(e){} return null; }
  if(savedWeekStart !== currentWeekStart){
    const prevCompleted = Object.keys(completedExercises).filter(k=>completedExercises[k]).length;
    completedExercises = {}; collapsedExercises = {};
    try{ localStorage.setItem(getWeekStartKey(), currentWeekStart); }catch(e){}
    saveAppState();
    return { prevCompleted, prevWeekStart: savedWeekStart, newWeekStart: currentWeekStart };
  }
  return null;
}

function showWeekResetBanner(info){
  const banner = document.getElementById('weekResetBanner'); if(!banner || !info) return;
  banner.innerHTML = `<div class="week-reset-banner">
    <div class="wr-icon">🎉</div>
    <div class="wr-text">هفته جدید شروع شد!<small>هفته قبل ${formatNum(info.prevCompleted)} حرکت انجام‌شده ثبت شد</small></div>
  </div>`;
  setTimeout(()=>{ if(banner) banner.innerHTML = ''; }, 12000);
}

/* ============ Users ============ */
function loadUsers(){
  try{ const raw = localStorage.getItem(USERS_KEY); users = raw ? JSON.parse(raw) : []; }catch(e){ users = []; }
  currentUserId = localStorage.getItem(CURRENT_USER_KEY);
  if(users.length === 0){
    const defaultUser = { id: 'u_' + Date.now(), name: 'کاربر من', emoji: '💪', color: '#3b82f6', createdAt: Date.now(), passwordHash: '', daysPerWeek: 3, level: 'intermediate' };
    users = [defaultUser]; currentUserId = defaultUser.id;
    saveUsers();
  }
  if(!currentUserId || !users.find(u=>u.id===currentUserId)){
    currentUserId = users[0].id;
    try{ localStorage.setItem(CURRENT_USER_KEY, currentUserId); }catch(e){}
  }
}
function saveUsers(){ try{ localStorage.setItem(USERS_KEY, JSON.stringify(users)); if(currentUserId) localStorage.setItem(CURRENT_USER_KEY, currentUserId); }catch(e){} }

function updateUserButton(){
  const u = getCurrentUser(); if(!u) return;
  const av = document.getElementById('userBtnAvatar'); const nm = document.getElementById('userBtnName'); const btn = document.getElementById('userBtn');
  if(av){ av.textContent = u.emoji; av.style.background = u.color; }
  if(nm) nm.textContent = u.name;
  if(btn) btn.style.setProperty('--user-color', u.color);
}

function openUserDrawer(){ renderUserList(); document.getElementById('userBackdrop').classList.add('open'); document.getElementById('userDrawer').classList.add('open'); }
function closeUserDrawer(){ document.getElementById('userBackdrop').classList.remove('open'); document.getElementById('userDrawer').classList.remove('open'); cancelUserForm(); }

function renderUserList(){
  const list = document.getElementById('userList'); if(!list) return;
  if(users.length === 0){ list.innerHTML = ''; return; }
  list.innerHTML = users.map(u=>{
    const isActive = u.id === currentUserId;
    const lockIcon = u.passwordHash ? ' 🔐' : '';
    return `<div class="user-card ${isActive?'active':''}" onclick="requestUserSwitch('${u.id}')">
      <div class="user-avatar" style="background:${u.color}">${u.emoji}</div>
      <div class="user-info"><div class="user-name">${escapeHtml(u.name)}${lockIcon}</div>
      <div class="user-meta">${isActive?'✓ کاربر فعال':'ایجاد: '+new Date(u.createdAt||Date.now()).toLocaleDateString('fa-IR')}</div></div>
      <div class="user-actions" onclick="event.stopPropagation()">
        <button class="user-action-btn" onclick="editUser('${u.id}')" title="ویرایش">✏️</button>
        ${users.length>1?`<button class="user-action-btn delete" onclick="deleteUser('${u.id}')" title="حذف">🗑️</button>`:''}
      </div>
    </div>`;
  }).join('');
}

let editingUserId = null;
function showUserForm(userId){
  editingUserId = userId || null;
  const title = document.getElementById('userFormTitle'); const nameInput = document.getElementById('userFormName');
  const pwdInput = document.getElementById('userFormPassword');
  const dpw = document.getElementById('userFormDaysPerWeek'); const level = document.getElementById('userFormLevel');
  const wdRow = document.getElementById('userFormWeekdaysRow');
  const lvRow = document.getElementById('userFormLevelRow');
  if(userId){
    const u = users.find(x=>x.id===userId); if(!u) return;
    title.innerHTML = '✏️ ویرایش کاربر'; nameInput.value = u.name;
    pwdInput.value = ''; pwdInput.placeholder = u.passwordHash ? 'رمز فعلی (خالی = بدون تغییر)' : 'اختیاری';
    renderEmojiPicker(u.emoji); renderColorPicker(u.color);
    if(dpw) dpw.value = u.daysPerWeek || 3;
    if(level) level.value = u.level || 'intermediate';
  } else {
    title.innerHTML = '➕ افزودن کاربر'; nameInput.value = '';
    pwdInput.value = ''; pwdInput.placeholder = 'اختیاری';
    renderEmojiPicker('💪'); renderColorPicker('#3b82f6');
    if(dpw) dpw.value = 3;
    if(level) level.value = 'intermediate';
  }
  renderUserFormWeekdays();
  document.getElementById('userForm').classList.add('open');
  setTimeout(()=>nameInput.focus(), 100);
}

function renderUserFormWeekdays(){
  const picker = document.getElementById('userFormWeekdayPicker'); if(!picker) return;
  const selected = picker.dataset.selected ? JSON.parse(picker.dataset.selected) : [];
  const todayJs = new Date().getDay();
  picker.innerHTML = WEEKDAYS.map(w=>{
    const isSel = selected.includes(w.jsDay);
    const isToday = w.jsDay === todayJs;
    return `<button type="button" class="weekday-chip ${isSel?'selected':''} ${isToday?'today':''}" onclick="toggleUserFormWeekday(${w.jsDay}, this)">${w.icon} ${w.name}</button>`;
  }).join('');
}

function toggleUserFormWeekday(jsDay, btn){
  const picker = document.getElementById('userFormWeekdayPicker');
  let selected = picker.dataset.selected ? JSON.parse(picker.dataset.selected) : [];
  if(selected.includes(jsDay)) selected = selected.filter(d=>d!==jsDay);
  else selected.push(jsDay);
  picker.dataset.selected = JSON.stringify(selected);
  btn.classList.toggle('selected');
}

function cancelUserForm(){
  editingUserId = null; pendingSmartSetup = null;
  document.getElementById('userForm').classList.remove('open');
}

function renderEmojiPicker(selected){
  document.getElementById('emojiPicker').innerHTML = EMOJI_OPTIONS.map(e=>
    `<button type="button" class="emoji-option ${e===selected?'selected':''}" onclick="selectEmoji('${e}',this)">${e}</button>`
  ).join('');
}
function selectEmoji(e, btn){ document.querySelectorAll('#emojiPicker .emoji-option').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); }

function renderColorPicker(selected){
  document.getElementById('colorPicker').innerHTML = COLOR_OPTIONS.map(c=>
    `<button type="button" class="color-option ${c===selected?'selected':''}" style="background:${c}" onclick="selectColor('${c}',this)"></button>`
  ).join('');
}
function selectColor(c, btn){ document.querySelectorAll('#colorPicker .color-option').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); }

function rgbToHex(rgb){
  if(!rgb) return '#3b82f6'; if(rgb.startsWith('#')) return rgb;
  const m = rgb.match(/\d+/g); if(!m) return '#3b82f6';
  return '#' + m.slice(0,3).map(n=>parseInt(n).toString(16).padStart(2,'0')).join('');
}

async function saveUserForm(){
  const name = document.getElementById('userFormName').value.trim();
  if(!name){ showToast('نام را وارد کنید', 'warn'); return; }
  const emojiEl = document.querySelector('#emojiPicker .emoji-option.selected');
  const colorEl = document.querySelector('#colorPicker .color-option.selected');
  const emoji = emojiEl ? emojiEl.textContent : '💪';
  const colorHex = colorEl ? rgbToHex(colorEl.style.background) : '#3b82f6';
  const pwd = document.getElementById('userFormPassword').value.trim();
  const daysPerWeek = parseInt(document.getElementById('userFormDaysPerWeek').value) || 0;
  const level = document.getElementById('userFormLevel').value || 'intermediate';
  const wdPicker = document.getElementById('userFormWeekdayPicker');
  const selectedWeekdays = wdPicker.dataset.selected ? JSON.parse(wdPicker.dataset.selected) : [];
  
  if(editingUserId){
    const u = users.find(x=>x.id===editingUserId);
    if(u){
      u.name = name; u.emoji = emoji; u.color = colorHex;
      u.daysPerWeek = daysPerWeek; u.level = level;
      if(pwd) u.passwordHash = await hashPassword(pwd);
    }
    showToast('کاربر ویرایش شد', 'success');
    if(editingUserId === currentUserId) updateUserButton();
    saveUsers(); renderUserList(); cancelUserForm(); closeUserDrawer();
  } else {
    const newId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const passwordHash = pwd ? await hashPassword(pwd) : '';
    users.push({ id: newId, name, emoji, color: colorHex, passwordHash, daysPerWeek, level, createdAt: Date.now() });
    saveUsers();
    
    if(daysPerWeek > 0){
      // Validate weekdays count
      if(selectedWeekdays.length !== daysPerWeek){
        showToast(`لطفاً ${daysPerWeek} روز را انتخاب کنید (${selectedWeekdays.length} انتخاب شده)`, 'warn', 4000);
        users.pop(); saveUsers();
        return;
      }
      showToast(`کاربر «${name}» ساخته شد`, 'success');
      renderUserList(); cancelUserForm(); closeUserDrawer();
      // Switch to new user & generate program
      await switchUser(newId, true);
      generateSmartProgram(daysPerWeek, selectedWeekdays, level);
    } else {
      showToast(`کاربر «${name}» ساخته شد (بدون برنامه)`, 'success');
      renderUserList(); cancelUserForm(); closeUserDrawer();
      await switchUser(newId, true);
    }
  }
}

function editUser(id){ showUserForm(id); }

async function requestUserSwitch(id){
  if(id === currentUserId){ closeUserDrawer(); return; }
  const u = users.find(x=>x.id===id); if(!u) return;
  if(u.passwordHash){
    pendingPwdUserId = id;
    document.getElementById('pwdGateTitle').textContent = `رمز «${u.name}» را وارد کنید`;
    document.getElementById('pwdGateInput').value = '';
    document.getElementById('pwdBackdrop').classList.add('open');
    document.getElementById('pwdDrawer').classList.add('open');
    setTimeout(()=>document.getElementById('pwdGateInput').focus(), 150);
  } else {
    await switchUser(id);
  }
}

function closePwdGate(){
  pendingPwdUserId = null;
  document.getElementById('pwdBackdrop').classList.remove('open');
  document.getElementById('pwdDrawer').classList.remove('open');
}

async function submitPwdGate(){
  const pwd = document.getElementById('pwdGateInput').value;
  if(!pwd){ showToast('رمز را وارد کنید', 'warn'); return; }
  const u = users.find(x=>x.id===pendingPwdUserId);
  if(!u){ closePwdGate(); return; }
  const hash = await hashPassword(pwd);
  if(hash === u.passwordHash){
    closePwdGate();
    await switchUser(u.id);
  } else {
    showToast('رمز اشتباه است', 'warn');
    document.getElementById('pwdGateInput').value = '';
    document.getElementById('pwdGateInput').focus();
  }
}

async function switchUser(id, silent){
  if(id === currentUserId && !silent){ closeUserDrawer(); return; }
  const u = users.find(x=>x.id===id); if(!u) return;
  saveAppState(); persistSettings();
  currentUserId = id;
  try{ localStorage.setItem(CURRENT_USER_KEY, currentUserId); }catch(e){}
  completedExercises = {}; collapsedExercises = {}; activeTimers = {}; cardioTimers = {};
  exerciseLogs = {}; setTimers = {}; openLoggers = {}; workoutData = {}; history = {};
  loadSettings(); loadExerciseBank(); loadUserProgram(); loadHistory();
  if(typeof loadNutritionData === 'function') loadNutritionData();
  if(typeof loadBodyData === 'function') loadBodyData();
  rebuildWorkoutData();
  checkWeekReset(); restoreAppState();
  applyScrollSnapSetting();
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  document.getElementById('themeToggle').innerHTML = `<span class="btn-icon">${theme==='light'?'☀️':'🌙'}</span><span class="btn-label">تم</span>`;
  const mIcon = document.getElementById('mobileThemeIcon'); if(mIcon) mIcon.textContent = theme==='light'?'☀️':'🌙';
  const todayKey = markTodayButton();
  currentDay = (userSettings.autoOpenToday && todayKey) ? todayKey : 'all';
  renderDayNav(); updateUserButton(); renderUserList();
  renderDays(); updateChart(); restartAutosaveTimer(); closeUserDrawer();
  if(!silent) showToast(`خوش آمدی ${u.name}! ${u.emoji}`, 'success');
}

async function deleteUser(id){
  if(users.length <= 1){ showToast('حداقل یک کاربر باید بماند', 'warn'); return; }
  const u = users.find(x=>x.id===id); if(!u) return;
  if(!confirm(`همه اطلاعات «${u.name}» پاک شود؟`)) return;
  try{
    localStorage.removeItem(STATE_KEY_PREFIX + id); localStorage.removeItem(SETTINGS_KEY_PREFIX + id);
    localStorage.removeItem(BANK_KEY_PREFIX + id); localStorage.removeItem(PROGRAM_KEY_PREFIX + id);
    localStorage.removeItem(HISTORY_KEY_PREFIX + id); localStorage.removeItem(WEEK_START_KEY_PREFIX + id);
    localStorage.removeItem(NUTRITION_KEY_PREFIX + id); localStorage.removeItem(BODY_KEY_PREFIX + id);
  }catch(e){}
  users = users.filter(x=>x.id !== id); saveUsers();
  showToast(`کاربر «${u.name}» حذف شد`, 'info');
  if(id === currentUserId){
    currentUserId = users[0].id;
    try{ localStorage.setItem(CURRENT_USER_KEY, currentUserId); }catch(e){}
    await switchUser(currentUserId, true);
  }
  updateUserButton(); renderUserList(); closeUserDrawer();
}

/* ============ Exercise Bank ============ */
function loadExerciseBank(){
  try{
    const raw = localStorage.getItem(getBankKey());
    if(raw){
      const arr = JSON.parse(raw); exerciseBank = {};
      arr.forEach(e=>{ exerciseBank[e.id] = e; });
      DEFAULT_EXERCISES.forEach(def => { if(!exerciseBank[def.id]) exerciseBank[def.id] = { ...def, custom: false }; });
      saveExerciseBank();
    } else {
      exerciseBank = {};
      DEFAULT_EXERCISES.forEach(e=>{ exerciseBank[e.id] = { ...e, custom: false }; });
      saveExerciseBank();
    }
  }catch(e){
    exerciseBank = {};
    DEFAULT_EXERCISES.forEach(ex=>{ exerciseBank[ex.id] = { ...ex, custom: false }; });
  }
}
function saveExerciseBank(){ try{ localStorage.setItem(getBankKey(), JSON.stringify(Object.values(exerciseBank))); }catch(e){} }
function getExercise(id){ return exerciseBank[id] || null; }

/* ============ Program ============ */
function loadUserProgram(){
  try{
    const raw = localStorage.getItem(getProgramKey());
    if(raw){ userProgram = JSON.parse(raw); }
    else { userProgram = { days: [] }; saveUserProgram(); }
    if(!userProgram.days) userProgram.days = [];
    const keyToWeekday = { sat: 6, sun: 0, tue: 2, wed: 3 };
    let changed = false;
    userProgram.days.forEach(day => {
      if(day.weekday === undefined){ day.weekday = (keyToWeekday[day.key] != null) ? keyToWeekday[day.key] : null; changed = true; }
      if(!day.type){ day.type = 'workout'; changed = true; }
    });
    if(changed) saveUserProgram(); else sortDaysByWeekday();
  }catch(e){ userProgram = { days: [] }; }
}
function sortDaysByWeekday(){
  const order = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
  userProgram.days.sort((a, b) => {
    const wa = a.weekday != null ? order[a.weekday] : 999;
    const wb = b.weekday != null ? order[b.weekday] : 999;
    return wa - wb;
  });
}
function saveUserProgram(){ sortDaysByWeekday(); try{ localStorage.setItem(getProgramKey(), JSON.stringify(userProgram)); }catch(e){} }

function rebuildWorkoutData(){
  workoutData = {};
  userProgram.days.forEach(day=>{
    const exs = (day.exercises || []).map(entry=>{
      const ex = getExercise(entry.exId); if(!ex) return null;
      return { ...ex, sets: entry.sets != null ? entry.sets : ex.sets, reps: entry.reps || ex.reps, rpe: entry.rpe || ex.rpe, rest: entry.rest != null ? entry.rest : ex.rest, _entry: entry };
    }).filter(Boolean);
    workoutData[day.key] = { ...day, exercises: exs };
  });
}

/* ============ Smart program generation ============ */
function generateSmartProgram(daysCount, selectedWeekdays, level){
  const splitKeys = SPLITS_BY_DAYS[daysCount];
  if(!splitKeys || !splitKeys.length){
    showToast('برنامه هوشمند نیاز به حداقل ۲ روز دارد', 'warn'); return;
  }
  const volConfig = VOLUME_BY_LEVEL[level] || VOLUME_BY_LEVEL.intermediate;
  const order = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
  const sortedDays = [...selectedWeekdays].sort((a,b)=>order[a]-order[b]);
  
  const newDays = sortedDays.map((jsDay, i) => {
    const splitKey = splitKeys[i % splitKeys.length];
    const tpl = SPLIT_TEMPLATES[splitKey];
    const wd = WEEKDAYS.find(w => w.jsDay === jsDay);
    const theme = 'day-' + ['sat','sun','tue','wed'][i % 4];
    const exercises = tpl.exs.map((exId, idx) => {
      const ex = getExercise(exId);
      if(!ex) return null;
      const isCompound = idx < 3;
      return {
        exId,
        sets: isCompound ? volConfig.sets : Math.max(3, volConfig.sets - 1),
        reps: isCompound ? volConfig.repsCompound : volConfig.repsIsolation,
        rpe: '۸',
        rest: isCompound ? volConfig.rest : 60
      };
    }).filter(Boolean);
    
    // Take only exsPerDay
    const limitedExs = exercises.slice(0, volConfig.exsPerDay);
    
    return {
      id: 'd_' + Date.now() + '_' + i,
      key: 'day_' + wd.key,
      weekday: jsDay,
      name: wd.defaultName,
      focus: tpl.focus + ' — ' + volConfig.sets + '×' + volConfig.repsCompound,
      icon: tpl.icon,
      theme,
      type: 'workout',
      cardio: '',
      cardioIcon: '🏃',
      cardioDefault: userSettings.defaultCardioMinutes || 20,
      exercises: limitedExs
    };
  });
  
  userProgram.days = newDays;
  saveUserProgram();
  rebuildWorkoutData();
  renderDayNav(); renderDays(); updateChart(); renderProgramDays();
  showToast(`🎉 برنامه هوشمند ${daysCount} روزه ساخته شد!`, 'success', 5000);
  setTimeout(()=>openProgramDrawer(), 800);
}

/* ============ Settings ============ */
function loadSettings(){
  try{ const raw = localStorage.getItem(getSettingsKey()); userSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }; }
  catch(e){ userSettings = { ...DEFAULT_SETTINGS }; }
}
function persistSettings(){ try{ localStorage.setItem(getSettingsKey(), JSON.stringify(userSettings)); }catch(e){} }

function applyScrollSnapSetting(){
  if(userSettings.scrollSnapEnabled){ document.documentElement.classList.add('snap-enabled'); }
  else { document.documentElement.classList.remove('snap-enabled'); }
  setTimeout(setupExerciseObserver, 150);
}

/* ============ State save/restore ============ */
function saveAppState(){
  try{
    logTodayStats();
    const cardio = {}; Object.keys(cardioTimers).forEach(k=>{ const s=cardioTimers[k]; cardio[k] = { total:s.total, remaining:getRemaining(s), running:!!s.running, endTimestamp:s.endTimestamp||null }; });
    const rest = {}; Object.keys(activeTimers).forEach(k=>{ const s=activeTimers[k]; rest[k] = { total:s.total, remaining:getRemaining(s), running:!!s.running, endTimestamp:s.endTimestamp||null }; });
    const sets = {}; Object.keys(setTimers).forEach(k=>{ const s=setTimers[k]; sets[k] = { activeSetIndex:s.activeSetIndex, startedAt:s.startedAt||null, elapsed:getSetElapsed(k), running:!!s.running }; });
    const payload = { v: 14, completedExercises, exerciseLogs, collapsedExercises, theme: document.documentElement.getAttribute('data-theme'), currentDay, cardio, rest, sets, openLoggers, savedAt: Date.now() };
    localStorage.setItem(getStateKey(), JSON.stringify(payload));
    showSaveIndicator();
  }catch(e){}
}

function restoreAppState(){
  let data = null;
  try{ const raw = localStorage.getItem(getStateKey()); if(raw) data = JSON.parse(raw); }catch(e){}
  if(!data) return { restored:false, finishedCardio:[], finishedRest:[] };
  if(data.completedExercises) completedExercises = data.completedExercises;
  if(data.exerciseLogs) exerciseLogs = data.exerciseLogs;
  if(data.collapsedExercises) collapsedExercises = data.collapsedExercises;
  if(data.theme) document.documentElement.setAttribute('data-theme', data.theme);
  if(data.currentDay) currentDay = data.currentDay;
  if(data.openLoggers) openLoggers = data.openLoggers;
  const finishedCardio = [];
  if(data.cardio) Object.keys(data.cardio).forEach(k=>{
    const s = data.cardio[k]; let remaining = s.remaining, running = false, endTimestamp = null;
    if(s.running && s.endTimestamp){
      const ms = s.endTimestamp - Date.now();
      if(ms > 0){ remaining = Math.ceil(ms/1000); running = true; endTimestamp = s.endTimestamp; }
      else { remaining = 0; running = false; if(s.remaining > 0) finishedCardio.push(k); }
    }
    cardioTimers[k] = { total:s.total, remaining, running, endTimestamp };
  });
  const finishedRest = [];
  if(data.rest) Object.keys(data.rest).forEach(k=>{
    const s = data.rest[k]; let remaining = s.remaining, running = false, endTimestamp = null;
    if(s.running && s.endTimestamp){
      const ms = s.endTimestamp - Date.now();
      if(ms > 0){ remaining = Math.ceil(ms/1000); running = true; endTimestamp = s.endTimestamp; }
      else { remaining = 0; running = false; if(s.remaining > 0) finishedRest.push(k); }
    }
    activeTimers[k] = { total:s.total, remaining, running, endTimestamp };
  });
  if(data.sets) Object.keys(data.sets).forEach(k=>{
    const s = data.sets[k]; let elapsed = s.elapsed||0, running = false, startedAt = null;
    if(s.running && s.startedAt){ startedAt = s.startedAt; running = true; }
    setTimers[k] = { activeSetIndex: s.activeSetIndex, startedAt, elapsed, running };
  });
  return { restored:true, finishedCardio, finishedRest };
}

function showSaveIndicator(){
  const ind = document.getElementById('autosaveIndicator'); const txt = document.getElementById('autosaveText');
  if(!ind || !txt) return;
  ind.classList.add('saving');
  const now = new Date();
  txt.textContent = `ذخیره ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  clearTimeout(saveIndicatorTimer);
  saveIndicatorTimer = setTimeout(()=>{ ind.classList.remove('saving'); txt.textContent = `ذخیره خودکار (${userSettings.autosaveInterval}ث)`; }, 2000);
}

/* ============ Day nav ============ */
function getTodayDayKey(){
  const d = new Date().getDay();
  for(const day of userProgram.days){ if(day.weekday === d) return day.key; }
  return null;
}
function markTodayButton(){
  const todayKey = getTodayDayKey();
  document.querySelectorAll('.day-nav-btn').forEach(b=>{ b.classList.remove('is-today'); if(todayKey && b.dataset.day === todayKey) b.classList.add('is-today'); });
  return todayKey;
}
function renderDayNav(){
  const nav = document.getElementById('dayNav'); if(!nav) return;
  let html = `<button class="day-nav-btn ${currentDay==='all'?'active':''}" data-day="all" onclick="switchDay('all',this)"><span class="dn-icon">📋</span><span class="dn-text">همه</span></button>`;
  userProgram.days.forEach(day=>{
    html += `<button class="day-nav-btn ${currentDay===day.key?'active':''}" data-day="${day.key}" onclick="switchDay('${day.key}',this)"><span class="dn-icon">${day.icon}</span><span class="dn-text">${escapeHtml(day.name.replace('روز ',''))}</span></button>`;
  });
  nav.innerHTML = html; markTodayButton();
}
function switchDay(day,btn){
  currentDay = day;
  document.querySelectorAll('.day-nav-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  saveAppState(); renderDays();
}

/* ============ Settings UI ============ */
function openSettings(tab){
  switchSettingsTab(tab || 'settings');
  const set = (id, val)=>{ const el = document.getElementById(id); if(el) el.checked = val; };
  const setVal = (id, val)=>{ const el = document.getElementById(id); if(el) el.value = val; };
  set('setScrollSnap', userSettings.scrollSnapEnabled);
  set('setAutoOpenLogger', userSettings.autoOpenLogger);
  set('setAutoOpenToday', userSettings.autoOpenToday);
  setVal('setAutosave', userSettings.autosaveInterval);
  set('setAutoCollapse', userSettings.autoCollapseDone);
  set('setSound', userSettings.soundEnabled);
  setVal('setVolume', userSettings.soundVolume);
  document.getElementById('volumeValue').textContent = Math.round(userSettings.soundVolume*100) + '%';
  setVal('setAlarmWave', userSettings.alarmWave);
  setVal('setAlarmRepeat', userSettings.alarmRepeat);
  set('setVibration', userSettings.vibrationEnabled);
  set('setToasts', userSettings.toastsEnabled);
  setVal('setNumberFormat', userSettings.numberFormat);
  setVal('setCardioDefault', userSettings.defaultCardioMinutes);
  set('setConfirmReset', userSettings.confirmBeforeReset);
  set('setAutoAnim', userSettings.autoAnimPlay);
  document.getElementById('volumeGroup').style.opacity = userSettings.soundEnabled ? '1' : '.4';
  document.getElementById('volumeGroup').style.pointerEvents = userSettings.soundEnabled ? 'auto' : 'none';
  document.getElementById('settingsBackdrop').classList.add('open');
  document.getElementById('settingsDrawer').classList.add('open');
}
function closeSettings(){
  document.getElementById('settingsBackdrop').classList.remove('open');
  document.getElementById('settingsDrawer').classList.remove('open');
}
function switchSettingsTab(tab){
  document.querySelectorAll('.drawer-tab[data-stab]').forEach(t=>t.classList.toggle('active', t.dataset.stab === tab));
  document.getElementById('stab-settings').classList.toggle('active', tab === 'settings');
  document.getElementById('stab-backup').classList.toggle('active', tab === 'backup');
  document.getElementById('stab-guide').classList.toggle('active', tab === 'guide');
  document.getElementById('settingsTitle').innerHTML = tab === 'guide' ? '📖 راهنما' : (tab === 'backup' ? '💾 پشتیبان' : '⚙️ تنظیمات');
  document.getElementById('settingsFooter').style.display = tab === 'settings' ? 'flex' : 'none';
}
function saveSettingsFromUI(){
  userSettings.scrollSnapEnabled = document.getElementById('setScrollSnap').checked;
  userSettings.autoOpenLogger = document.getElementById('setAutoOpenLogger').checked;
  userSettings.autoOpenToday = document.getElementById('setAutoOpenToday').checked;
  userSettings.autosaveInterval = parseInt(document.getElementById('setAutosave').value) || 15;
  userSettings.autoCollapseDone = document.getElementById('setAutoCollapse').checked;
  userSettings.soundEnabled = document.getElementById('setSound').checked;
  userSettings.soundVolume = parseFloat(document.getElementById('setVolume').value) || 0.7;
  userSettings.alarmWave = document.getElementById('setAlarmWave').value;
  userSettings.alarmRepeat = parseInt(document.getElementById('setAlarmRepeat').value) || 3;
  userSettings.vibrationEnabled = document.getElementById('setVibration').checked;
  userSettings.toastsEnabled = document.getElementById('setToasts').checked;
  userSettings.numberFormat = document.getElementById('setNumberFormat').value;
  userSettings.defaultCardioMinutes = Math.max(1, Math.min(90, parseInt(document.getElementById('setCardioDefault').value) || 20));
  userSettings.confirmBeforeReset = document.getElementById('setConfirmReset').checked;
  userSettings.autoAnimPlay = document.getElementById('setAutoAnim').checked;
  persistSettings(); restartAutosaveTimer(); applyScrollSnapSetting();
  renderDays(); updateStats();
  closeSettings();
  showToast('تنظیمات ذخیره شد', 'success');
}
function resetSettings(){
  if(!confirm('تنظیمات به حالت پیش‌فرض بازگردد؟')) return;
  userSettings = { ...DEFAULT_SETTINGS };
  persistSettings(); restartAutosaveTimer(); applyScrollSnapSetting();
  openSettings('settings'); renderDays();
  showToast('تنظیمات بازگشت', 'info');
}
function restartAutosaveTimer(){
  clearInterval(autosaveIntervalId);
  const sec = Math.max(5, userSettings.autosaveInterval || 15);
  autosaveIntervalId = setInterval(()=>{ saveAppState(); }, sec*1000);
  const txt = document.getElementById('autosaveText');
  if(txt) txt.textContent = `ذخیره خودکار (${sec}ث)`;
}
function testAlarm(){ playBeep([880,1046,1318]); showToast('تست آلارم پخش شد', 'info', 3000); }

/* ============ Reset/Export/Import ============ */
function resetAll(){
  if(userSettings.confirmBeforeReset && !confirm('اطلاعات کاربر فعلی پاک شوند؟')) return;
  completedExercises={}; exerciseLogs={}; activeTimers={}; cardioTimers={}; setTimers={}; openLoggers={}; collapsedExercises={};
  try{ localStorage.removeItem(getStateKey()); localStorage.removeItem(getHistoryKey()); }catch(e){}
  history = {};
  const t = getTodayDayKey();
  currentDay = (userSettings.autoOpenToday && t) ? t : 'all';
  renderDayNav(); renderDays(); updateChart();
  showToast('اطلاعات کاربر ریست شد', 'info');
}

/* ---------- EXPORT (فقط کاربر فعلی) ---------- */
function exportData(){
  const u = getCurrentUser(); if(!u) return;
  // Only current user's data — other users' data are in different localStorage keys
  const data = {
    _meta: { app:'ProFit', version:1, exportedAt: new Date().toISOString(), user: { name: u.name, emoji: u.emoji, color: u.color } },
    user: { name: u.name, emoji: u.emoji, color: u.color, daysPerWeek: u.daysPerWeek, level: u.level },
    completed: completedExercises, logs: exerciseLogs, collapsed: collapsedExercises, history: history,
    theme: document.documentElement.getAttribute('data-theme'), currentDay, settings: userSettings,
    program: userProgram, bank: Object.values(exerciseBank),
    nutrition: (typeof nutritionData !== 'undefined' && nutritionData) ? nutritionData : null,
    bodyMeasurements: (typeof bodyData !== 'undefined' && Array.isArray(bodyData)) ? bodyData : [],
    cardio: Object.fromEntries(Object.keys(cardioTimers).map(k=>{ const s=cardioTimers[k]; return [k,{total:s.total, remaining:getRemaining(s)}]; })),
    rest: Object.fromEntries(Object.keys(activeTimers).map(k=>{ const s=activeTimers[k]; return [k,{total:s.total, remaining:getRemaining(s)}]; })),
    sets: Object.fromEntries(Object.keys(setTimers).map(k=>{ const s=setTimers[k]; return [k,{activeSetIndex:s.activeSetIndex, elapsed:getSetElapsed(k)}]; }))
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `profit-${u.name.replace(/\s+/g,'_')}-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('پشتیبان کاربر فعلی دانلود شد 🔒', 'success', 4000);
}

/* ---------- IMPORT (فقط کاربر فعلی) ---------- */
function importData(e){
  const file = e.target.files[0]; if(!file) return;
  const u = getCurrentUser(); if(!u){ showToast('کاربر فعال یافت نشد', 'warn'); return; }
  const reader = new FileReader();
  reader.onload = ev=>{
    try{
      const data = JSON.parse(ev.target.result);
      // Security check
      if(data._meta && data._meta.app !== 'ProFit'){ showToast('فایل نامعتبر است', 'warn'); return; }
      if(!data.settings && !data.program && !data.completed && !data.bank){
        showToast('فایل خالی یا نامعتبر', 'warn'); return;
      }
      if(data.completed) completedExercises = data.completed;
      if(data.logs) exerciseLogs = data.logs;
      if(data.collapsed) collapsedExercises = data.collapsed;
      if(data.history) history = data.history;
      if(data.theme){
        document.documentElement.setAttribute('data-theme', data.theme);
        document.getElementById('themeToggle').innerHTML = `<span class="btn-icon">${data.theme==='light'?'☀️':'🌙'}</span><span class="btn-label">تم</span>`;
        const mIcon = document.getElementById('mobileThemeIcon'); if(mIcon) mIcon.textContent = data.theme==='light'?'☀️':'🌙';
      }
      if(data.currentDay) currentDay = data.currentDay;
      if(data.settings){ userSettings = { ...DEFAULT_SETTINGS, ...data.settings }; persistSettings(); restartAutosaveTimer(); applyScrollSnapSetting(); }
      if(data.bank && Array.isArray(data.bank)){ exerciseBank = {}; data.bank.forEach(ex=>{ exerciseBank[ex.id] = ex; }); saveExerciseBank(); }
      if(data.program){ userProgram = data.program; saveUserProgram(); rebuildWorkoutData(); }
      if(data.nutrition && typeof nutritionData !== 'undefined'){ nutritionData = { ...defaultNutritionData(), ...data.nutrition }; saveNutritionData(); }
      if(data.bodyMeasurements && Array.isArray(data.bodyMeasurements) && typeof bodyData !== 'undefined'){ bodyData = data.bodyMeasurements; saveBodyData(); }
      cardioTimers = {};
      if(data.cardio) Object.keys(data.cardio).forEach(k=>{ cardioTimers[k] = { total:data.cardio[k].total, remaining:data.cardio[k].remaining, running:false, endTimestamp:null }; });
      activeTimers = {};
      if(data.rest) Object.keys(data.rest).forEach(k=>{ activeTimers[k] = { total:data.rest[k].total, remaining:data.rest[k].remaining, running:false, endTimestamp:null }; });
      setTimers = {};
      if(data.sets) Object.keys(data.sets).forEach(k=>{ setTimers[k] = { activeSetIndex:data.sets[k].activeSetIndex, elapsed:data.sets[k].elapsed||0, running:false, startedAt:null }; });
      saveHistory(); saveAppState(); renderDayNav(); renderDays(); updateChart();
      showToast('اطلاعات فقط برای همین کاربر بازگردانی شد ✓', 'success', 4000);
    }catch(err){ showToast('فایل نامعتبر', 'warn'); }
  };
  reader.readAsText(file); e.target.value='';
}

/* ============ Guide content ============ */
function renderGuide(){
  const el = document.getElementById('guideContent'); if(!el) return;
  el.innerHTML = `
    <div class="guide-highlight">
      <strong style="color:var(--text-primary);font-size:1rem">📖 راهنمای کامل ProFit</strong><br>
      این راهنما همه امکانات برنامه را با جزئیات توضیح می‌دهد.
    </div>
    
    <div class="guide-section">
      <h3>🚀 شروع سریع</h3>
      <p>۱. اولین کاربر به‌صورت خودکار ساخته می‌شود. برای کاربران بعدی روی آیکن کاربر (گوشه راست بالای صفحه) بزنید.</p>
      <p>۲. با ساختن کاربر جدید می‌توانید رمز عبور بگذارید، تعداد روزهای تمرین و روزها را انتخاب کنید و برنامه به‌صورت هوشمند ساخته می‌شود.</p>
      <p>۳. هر روز تمرین شامل حرکات با ست/تکرار/RPE مشخص است. تیک هر حرکت را بزنید و وزنه‌ها را ثبت کنید.</p>
    </div>
    
    <div class="guide-section">
      <h3>👥 چند کاربری و رمز عبور</h3>
      <p>هر کاربر کاملاً مستقل است — حرکات، برنامه، تنظیمات، تغذیه، اندازه‌های بدن و تاریخچه جدا ذخیره می‌شوند.</p>
      <ul>
        <li><strong>ساخت کاربر:</strong> روی دکمه کاربر → «افزودن کاربر».</li>
        <li><strong>رمز عبور:</strong> در فرم افزودن کاربر، فیلد رمز را پر کنید. دفعه بعد هنگام تعویض کاربر، رمز پرسیده می‌شود.</li>
        <li><strong>ویرایش:</strong> نام، آواتار، رنگ و رمز قابل ویرایش است. برای تغییر رمز، رمز جدید را وارد کنید. برای حذف رمز، فیلد را خالی بگذارید.</li>
        <li><strong>حذف کاربر:</strong> فقط زمانی که حداقل ۲ کاربر دارید.</li>
      </ul>
    </div>
    
    <div class="guide-section">
      <h3>🏋️ برنامه‌ریزی هوشمند</h3>
      <p>هنگام ساخت کاربر جدید:</p>
      <ul>
        <li><strong>تعداد روز تمرین</strong> را انتخاب کنید (۲ تا ۶).</li>
        <li><strong>روزهای هفته</strong> را دقیقاً به همان تعداد انتخاب کنید.</li>
        <li><strong>سطح تجربه</strong> (مبتدی/متوسط/پیشرفته) تعیین می‌کند حجم تمرین چقدر باشد.</li>
      </ul>
      <p>برنامه به‌صورت خودکار با اسپلیت مناسب ساخته می‌شود:</p>
      <ul>
        <li><code>۲ روز → Full Body</code></li>
        <li><code>۳ روز → Push / Pull / Legs</code></li>
        <li><code>۴ روز → Upper / Lower</code></li>
        <li><code>۵ روز → PPL + Upper + Lower</code></li>
        <li><code>۶ روز → PPL × ۲</code></li>
      </ul>
      <p>اگر گزینه «بدون برنامه» را انتخاب کنید، برنامه خالی می‌ماند تا خودتان حرکات را اضافه کنید.</p>
    </div>
    
    <div class="guide-section">
      <h3>🗓️ ویرایش برنامه</h3>
      <p>روی دکمه 🗓️ برنامه بزنید. دو تب دارد:</p>
      <ul>
        <li><strong>روزها:</strong> افزودن، ویرایش، حذف روز. هر روز می‌تواند «تمرین»، «کاردیو» یا «استراحت» باشد.</li>
        <li><strong>بانک حرکات:</strong> بیش از ۲۰۰ حرکت آماده + افزودن حرکت سفارشی.</li>
      </ul>
      <p>با دکمه «🔀 جابجایی» می‌توانید ترتیب حرکات را با درگ یا دکمه‌های ▲▼ تغییر دهید.</p>
    </div>
    
    <div class="guide-section">
      <h3>💪 حرکات و ثبت تمرین</h3>
      <p>هر کارت حرکت شامل:</p>
      <ul>
        <li><strong>انیمیشن:</strong> پخش خودکار با دکمه ⏸/▶</li>
        <li><strong>اطلاعات:</strong> ست، تکرار، RPE، استراحت</li>
        <li><strong>تایمر استراحت:</strong> شروع، توقف، ادامه</li>
        <li><strong>ثبت وزنه هر ست:</strong> وزنه، تکرار، زمان هر ست با تایمر اختصاصی</li>
        <li><strong>خلاصه:</strong> حجم کل، بیشترین وزنه، زمان کل</li>
      </ul>
      <p>روی دکمه «📋 کپی وزنه ست قبل» بزنید تا وزنه‌های ست آخر روی ست‌های خالی کپی شوند.</p>
    </div>
    
    <div class="guide-section">
      <h3>📱 حالت تمرکز موبایل</h3>
      <p>در تنظیمات → موبایل:</p>
      <ul>
        <li><strong>حالت تمرکز:</strong> کارت‌ها تمام صفحه می‌شوند و اسکرول روی هر حرکت توقف می‌کند.</li>
        <li><strong>باز شدن خودکار ثبت وزنه:</strong> با اسکرول روی هر حرکت، منوی ثبت وزنه باز می‌شود و با رفتن به حرکت بعدی بسته می‌شود.</li>
      </ul>
    </div>
    
    <div class="guide-section">
      <h3>🥗 تغذیه و کالری</h3>
      <p>سه تب دارد:</p>
      <ul>
        <li><strong>🧮 کالری:</strong> محاسبه BMR با ۴ فرمول علمی (Mifflin, Harris-Benedict, Katch-McArdle, Cunningham) و فرمول دستی. انتخاب هدف، سطح فعالیت، و نمایش TDEE + درشت‌مغذی‌ها با نمودار میله‌ای.</li>
        <li><strong>🍽️ برنامه غذایی:</strong> ۵ وعده با واحدهای واقعی (عدد، فیله، پرس، لیوان...). می‌توانید از بین ۲۵۰+ غذا انتخاب کنید یا برنامه نمونه تولید کنید.</li>
        <li><strong>💊 مکمل‌ها:</strong> پیشنهاد خودکار بر اساس هدف، قابل ویرایش و افزودن مکمل سفارشی.</li>
      </ul>
      <p>مقادیر کالری/پروتئین/کرب/چربی هر وعده را می‌توانید دستی ویرایش کنید.</p>
    </div>
    
    <div class="guide-section">
      <h3>📏 اندازه‌های بدن</h3>
      <p>۱۰ متریک: وزن، چربی، گردن، سینه، کمر، باسن، بازو، ساعد، ران، ساق.</p>
      <p>نمودار تغییرات هر متریک + آمار (کمترین، بیشترین، تغییر کل، تعداد ثبت).</p>
      <p>ثبت با تاریخ شمسی. اگر همان تاریخ دوباره ثبت شود، قبلی به‌روزرسانی می‌شود.</p>
    </div>
    
    <div class="guide-section">
      <h3>📊 نمودار پیشرفت</h3>
      <p>سه بازه:</p>
      <ul>
        <li><strong>هفتگی:</strong> تعداد حرکات انجام‌شده در هر روز هفته جاری</li>
        <li><strong>ماهانه:</strong> مجموع حرکات هر هفته از ماه</li>
        <li><strong>سالانه:</strong> مجموع ماهانه بر اساس ماه‌های شمسی</li>
      </ul>
    </div>
    
    <div class="guide-section">
      <h3>🔔 آلارم و تایمر</h3>
      <p>در تنظیمات → آلارم:</p>
      <ul>
        <li>صدای تایمر روشن/خاموش، میزان صدا</li>
        <li>نوع موج (مربعی، سینوسی، اره‌ای، مثلثی)</li>
        <li>تعداد تکرار زنگ</li>
        <li>لرزش موبایل</li>
        <li>تست آلارم</li>
      </ul>
    </div>
    
    <div class="guide-section">
      <h3>💾 پشتیبان‌گیری و بازیابی</h3>
      <p>در تنظیمات → پشتیبان:</p>
      <ul>
        <li><strong>⬇️ دانلود:</strong> تمام اطلاعات <strong>کاربر فعلی</strong> در یک فایل JSON ذخیره می‌شود. اطلاعات سایر کاربران هرگز در فایل قرار نمی‌گیرد.</li>
        <li><strong>⬆️ بازیابی:</strong> فایل پشتیبان انتخاب کنید. اطلاعات <strong>فقط برای کاربر فعلی</strong> جایگزین می‌شود و به سایر کاربران دست نمی‌زند.</li>
      </ul>
      <p>فایل شامل: برنامه، بانک حرکات سفارشی، تیک‌ها، لاگ وزنه، تاریخچه، تنظیمات، تغذیه، اندازه‌های بدن و تایمرها.</p>
    </div>
    
    <div class="guide-section">
      <h3>🎨 ظاهر و تم</h3>
      <p>دکمه 🌙 تم روشن/تاریک را تغییر می‌دهد. اعداد می‌توانند فارسی یا انگلیسی باشند.</p>
    </div>
    
    <div class="guide-section">
      <h3>❓ سوالات متداول</h3>
      <p><strong>Q: چرا فایل‌های داده جدا هستند؟</strong><br>A: برای اینکه گسترش حرکات و غذاها راحت‌تر باشد. فایل <code>data-exercises.js</code> و <code>data-foods.js</code> را می‌توانید مستقل ویرایش کنید.</p>
      <p><strong>Q: چطور حرکات جدید اضافه کنم؟</strong><br>A: در فایل <code>data-exercises.js</code> آیتم جدید با همان ساختار به آرایه <code>DEFAULT_EXERCISES</code> اضافه کنید. یا از داخل برنامه → تب بانک حرکات → «افزودن حرکت سفارشی».</p>
      <p><strong>Q: داده‌های من کجا ذخیره می‌شود؟</strong><br>A: در <code>localStorage</code> مرورگر شما، با کلیدهای مجزا برای هر کاربر. هیچ داده‌ای به سرور فرستاده نمی‌شود.</p>
      <p><strong>Q: اگر مرورگر را پاک کنم؟</strong><br>A: داده‌ها از بین می‌روند. حتماً از پشتیبان‌گیری استفاده کنید.</p>
      <p><strong>Q: چطور برنامه هوشمند را دوباره بسازم؟</strong><br>A: کاربر را ویرایش کنید، تعداد روز و روزهای هفته را تغییر دهید و یک کاربر جدید بسازید. یا از تب برنامه دستی ویرایش کنید.</p>
    </div>
  `;
}