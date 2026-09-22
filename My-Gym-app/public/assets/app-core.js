/* ============================================================
   app-core.js — هسته: ذخیره‌سازی، برنامه‌ریزی هوشمند، تنظیمات
   (توابع احراز هویت و مدیریت کاربران در app-auth.js قرار دارند)
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

/* ============ Storage Keys Helpers ============ */
function getStateKey(){ return STATE_KEY_PREFIX + (currentUserId || 'guest'); }
function getSettingsKey(){ return SETTINGS_KEY_PREFIX + (currentUserId || 'guest'); }
function getBankKey(){ return BANK_KEY_PREFIX + (currentUserId || 'guest'); }
function getProgramKey(){ return PROGRAM_KEY_PREFIX + (currentUserId || 'guest'); }
function getHistoryKey(){ return HISTORY_KEY_PREFIX + (currentUserId || 'guest'); }
function getWeekStartKey(){ return WEEK_START_KEY_PREFIX + (currentUserId || 'guest'); }

function getCurrentUser(){ return users.find(u=>u.id===currentUserId) || null; }

function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

function showToast(msg, type='success', duration=5000){
  if(!userSettings || !userSettings.toastsEnabled) return;
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
  const fmt = (userSettings && userSettings.numberFormat) || 'fa';
  return fmt === 'fa' ? n.toLocaleString('fa-IR') : n.toLocaleString('en-US');
}

function formatTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60), s = sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function getRemaining(st){
  if(!st) return 0;
  if(st.running && st.endTimestamp) return Math.max(0, Math.ceil((st.endTimestamp - Date.now())/1000));
  return Math.max(0, st.remaining);
}

function getSetElapsed(key){
  const st = setTimers[key]; if(!st) return 0;
  if(st.running && st.startedAt) return Math.floor((Date.now()-st.startedAt)/1000) + (st.elapsed||0);
  return st.elapsed || 0;
}

function isCollapsed(key){
  const isDone = !!completedExercises[key];
  if(collapsedExercises[key] === 'expanded') return false;
  if(collapsedExercises[key] === 'collapsed') return true;
  return isDone && userSettings.autoCollapseDone;
}

function dateKey(d = new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function getWeekStart(date = new Date()){
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0,0,0,0);
  return d;
}

/* ============ Jalali ============ */
function toJalali(gy, gm, gd){
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365*gy) + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400) - 80 + gd + g_d_m[gm-1];
  jy += 33 * Math.floor(days/12053);
  days %= 12053;
  jy += 4 * Math.floor(days/1461);
  days %= 1461;
  if(days > 365){ jy += Math.floor((days-1)/365); days = (days-1) % 365; }
  const jm = (days < 186) ? 1 + Math.floor(days/31) : 7 + Math.floor((days-186)/30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days-186) % 30));
  return [jy, jm, jd];
}

function jalaliToGregorian(jy, jm, jd){
  jy += 1595;
  let days = -355668 + (365 * jy) + (Math.floor(jy/33) * 8) + Math.floor(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if(days > 36524){
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if(days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if(days > 365){
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for(gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

function jalaliMonthDays(jy, jm){
  if(jm <= 6) return 31;
  if(jm <= 11) return 30;
  const mod = jy % 33;
  return [1,5,9,13,17,22,26,30].includes(mod) ? 30 : 29;
}

/* ============ History ============ */
function loadHistory(){
  if(!currentUserId){ history = {}; return; }
  try{ const raw = localStorage.getItem(getHistoryKey()); history = raw ? JSON.parse(raw) : {}; }catch(e){ history = {}; }
}
function saveHistory(){
  if(!currentUserId) return;
  try{ localStorage.setItem(getHistoryKey(), JSON.stringify(history)); }catch(e){}
}

function logTodayStats(){
  const todayKey = getTodayDayKey(); if(!todayKey) return;
  const day = workoutData[todayKey]; if(!day) return;
  let completed = 0, volume = 0;
  day.exercises.forEach((_,i)=>{
    const key = `${todayKey}-${i}`;
    if(completedExercises[key]) completed++;
    const logs = exerciseLogs[key] || [];
    logs.forEach(l=>{ if(l && l.weight && l.reps) volume += l.weight * l.reps; });
  });
  const dk = dateKey();
  if(completed === 0 && volume === 0){ if(!history[dk]) return; }
  history[dk] = { dayKey: todayKey, completed, total: day.exercises.length, volume: Math.round(volume) };
  saveHistory();
}

function checkWeekReset(){
  if(!currentUserId) return null;
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

/* ============ Stubs (overridden by app-auth.js) ============ */
function loadUsers(){
  // در نسخه آنلاین، کاربران از سرور می‌آیند (app-auth.js)
  users = [];
  currentUserId = null;
}
function saveUsers(){ /* no-op — server handles */ }
function updateUserButton(){ /* no-op — app-auth.js override */ }
function openUserDrawer(){ /* no-op — app-auth.js override */ }
function closeUserDrawer(){ /* no-op — app-auth.js override */ }
function renderUserList(){ /* no-op — app-auth.js override */ }
function showUserForm(){ showToast('ایجاد کاربر فقط از پنل مربی/مدیر', 'info'); }
function cancelUserForm(){ /* no-op */ }
function saveUserForm(){ /* no-op */ }
function editUser(){ /* no-op */ }
function deleteUser(){ showToast('حذف کاربر فقط توسط مدیر انجام می‌شود', 'info'); }
function switchUser(){ /* no-op — token-based */ }
function requestUserSwitch(){ /* no-op */ }
function submitPwdGate(){ /* no-op */ }
function closePwdGate(){ /* no-op */ }
function renderEmojiPicker(){ /* no-op */ }
function selectEmoji(){ /* no-op */ }
function renderColorPicker(){ /* no-op */ }
function selectColor(){ /* no-op */ }
function rgbToHex(rgb){
  if(!rgb) return '#3b82f6'; if(rgb.startsWith('#')) return rgb;
  const m = rgb.match(/\d+/g); if(!m) return '#3b82f6';
  return '#' + m.slice(0,3).map(n=>parseInt(n).toString(16).padStart(2,'0')).join('');
}
function renderUserFormWeekdays(){ /* no-op */ }
function toggleUserFormWeekday(){ /* no-op */ }

/* ============ Exercise Bank ============ */
function loadExerciseBank(){
  if(!currentUserId){
    exerciseBank = {};
    DEFAULT_EXERCISES.forEach(e=>{ exerciseBank[e.id] = { ...e, custom: false }; });
    return;
  }
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
function saveExerciseBank(){
  if(!currentUserId) return;
  try{ localStorage.setItem(getBankKey(), JSON.stringify(Object.values(exerciseBank))); }catch(e){}
}
function getExercise(id){ return exerciseBank[id] || null; }

/* ============ Program ============ */
function loadUserProgram(){
  if(!currentUserId){ userProgram = { days: [] }; return; }
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
function saveUserProgram(){
  if(!currentUserId) return;
  sortDaysByWeekday();
  try{ localStorage.setItem(getProgramKey(), JSON.stringify(userProgram)); }catch(e){}
}

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
      cardioDefault: (userSettings && userSettings.defaultCardioMinutes) || 20,
      exercises: limitedExs
    };
  });

  userProgram.days = newDays;
  saveUserProgram();
  rebuildWorkoutData();
  renderDayNav(); renderDays(); updateChart();
  if(typeof renderProgramDays === 'function') renderProgramDays();
  showToast(`🎉 برنامه هوشمند ${daysCount} روزه ساخته شد!`, 'success', 5000);
}

/* ============ Settings ============ */
function loadSettings(){
  if(!currentUserId){ userSettings = { ...DEFAULT_SETTINGS }; return; }
  try{
    const raw = localStorage.getItem(getSettingsKey());
    userSettings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  }catch(e){ userSettings = { ...DEFAULT_SETTINGS }; }
}
function persistSettings(){
  if(!currentUserId) return;
  try{ localStorage.setItem(getSettingsKey(), JSON.stringify(userSettings)); }catch(e){}
}

function applyScrollSnapSetting(){
  if(userSettings.scrollSnapEnabled){ document.documentElement.classList.add('snap-enabled'); }
  else { document.documentElement.classList.remove('snap-enabled'); }
  setTimeout(setupExerciseObserver, 150);
}

/* ============ State save/restore ============ */
function saveAppState(){
  if(!currentUserId) return;
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
  if(!currentUserId) return { restored:false, finishedCardio:[], finishedRest:[] };
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
  saveIndicatorTimer = setTimeout(()=>{
    ind.classList.remove('saving');
    txt.textContent = `ذخیره خودکار (${(userSettings && userSettings.autosaveInterval) || 15}ث)`;
  }, 2000);
}

/* ============ Day nav ============ */
function getTodayDayKey(){
  const d = new Date().getDay();
  for(const day of userProgram.days){ if(day.weekday === d) return day.key; }
  return null;
}

function markTodayButton(){
  const todayKey = getTodayDayKey();
  document.querySelectorAll('.day-nav-btn').forEach(b=>{
    b.classList.remove('is-today');
    if(todayKey && b.dataset.day === todayKey) b.classList.add('is-today');
  });
  return todayKey;
}

function renderDayNav(){
  const nav = document.getElementById('dayNav'); if(!nav) return;
  let html = `<button class="day-nav-btn ${currentDay==='all'?'active':''}" data-day="all" onclick="switchDay('all',this)"><span class="dn-icon">📋</span><span class="dn-text">همه</span></button>`;
  userProgram.days.forEach(day=>{
    html += `<button class="day-nav-btn ${currentDay===day.key?'active':''}" data-day="${day.key}" onclick="switchDay('${day.key}',this)"><span class="dn-icon">${day.icon}</span><span class="dn-text">${escapeHtml(day.name.replace('روز ',''))}</span></button>`;
  });
  nav.innerHTML = html;
  markTodayButton();
}

function switchDay(day,btn){
  currentDay = day;
  document.querySelectorAll('.day-nav-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  saveAppState();
  renderDays();
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
  const vv = document.getElementById('volumeValue');
  if(vv) vv.textContent = Math.round(userSettings.soundVolume*100) + '%';
  setVal('setAlarmWave', userSettings.alarmWave);
  setVal('setAlarmRepeat', userSettings.alarmRepeat);
  set('setVibration', userSettings.vibrationEnabled);
  set('setToasts', userSettings.toastsEnabled);
  setVal('setNumberFormat', userSettings.numberFormat);
  setVal('setCardioDefault', userSettings.defaultCardioMinutes);
  set('setConfirmReset', userSettings.confirmBeforeReset);
  set('setAutoAnim', userSettings.autoAnimPlay);
  const vg = document.getElementById('volumeGroup');
  if(vg){
    vg.style.opacity = userSettings.soundEnabled ? '1' : '.4';
    vg.style.pointerEvents = userSettings.soundEnabled ? 'auto' : 'none';
  }
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
  persistSettings();
  restartAutosaveTimer();
  applyScrollSnapSetting();
  renderDays();
  updateStats();
  closeSettings();
  showToast('تنظیمات ذخیره شد', 'success');
}

function resetSettings(){
  if(!confirm('تنظیمات به حالت پیش‌فرض بازگردد؟')) return;
  userSettings = { ...DEFAULT_SETTINGS };
  persistSettings();
  restartAutosaveTimer();
  applyScrollSnapSetting();
  openSettings('settings');
  renderDays();
  showToast('تنظیمات بازگشت', 'info');
}

function restartAutosaveTimer(){
  clearInterval(autosaveIntervalId);
  const sec = Math.max(5, (userSettings && userSettings.autosaveInterval) || 15);
  autosaveIntervalId = setInterval(()=>{ saveAppState(); }, sec*1000);
  const txt = document.getElementById('autosaveText');
  if(txt) txt.textContent = `ذخیره خودکار (${sec}ث)`;
}

function testAlarm(){ playBeep([880,1046,1318]); showToast('تست آلارم پخش شد', 'info', 3000); }

/* ============ Reset / Export / Import ============ */
function resetAll(){
  if(!currentUserId){ showToast('ابتدا وارد شوید', 'warn'); return; }
  if(userSettings.confirmBeforeReset && !confirm('اطلاعات کاربر فعلی پاک شوند؟')) return;
  completedExercises={}; exerciseLogs={}; activeTimers={}; cardioTimers={}; setTimers={}; openLoggers={}; collapsedExercises={};
  try{ localStorage.removeItem(getStateKey()); localStorage.removeItem(getHistoryKey()); }catch(e){}
  history = {};
  const t = getTodayDayKey();
  currentDay = (userSettings.autoOpenToday && t) ? t : 'all';
  renderDayNav();
  renderDays();
  updateChart();
  showToast('اطلاعات کاربر ریست شد', 'info');
}

function exportData(){
  const u = getCurrentUser(); if(!u) return;
  // فقط داده‌های کاربر فعلی — چون کلیدهای localStorage با userID انتها دارند
  const data = {
    _meta: {
      app: 'ProFit',
      version: 1,
      exportedAt: new Date().toISOString(),
      user: { name: u.name, emoji: u.emoji, color: u.color }
    },
    user: { name: u.name, emoji: u.emoji, color: u.color, daysPerWeek: u.daysPerWeek, level: u.level },
    completed: completedExercises,
    logs: exerciseLogs,
    collapsed: collapsedExercises,
    history: history,
    theme: document.documentElement.getAttribute('data-theme'),
    currentDay,
    settings: userSettings,
    program: userProgram,
    bank: Object.values(exerciseBank),
    nutrition: (typeof nutritionData !== 'undefined' && nutritionData) ? nutritionData : null,
    bodyMeasurements: (typeof bodyData !== 'undefined' && Array.isArray(bodyData)) ? bodyData : [],
    cardio: Object.fromEntries(Object.keys(cardioTimers).map(k=>{ const s=cardioTimers[k]; return [k,{total:s.total, remaining:getRemaining(s)}]; })),
    rest: Object.fromEntries(Object.keys(activeTimers).map(k=>{ const s=activeTimers[k]; return [k,{total:s.total, remaining:getRemaining(s)}]; })),
    sets: Object.fromEntries(Object.keys(setTimers).map(k=>{ const s=setTimers[k]; return [k,{activeSetIndex:s.activeSetIndex, elapsed:getSetElapsed(k)}]; }))
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profit-${u.name.replace(/\s+/g,'_')}-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('پشتیبان کاربر فعلی دانلود شد 🔒', 'success', 4000);
}

function importData(e){
  const file = e.target.files[0]; if(!file) return;
  const u = getCurrentUser(); if(!u){ showToast('کاربر فعال یافت نشد', 'warn'); return; }
  const reader = new FileReader();
  reader.onload = ev=>{
    try{
      const data = JSON.parse(ev.target.result);
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
        const t = document.getElementById('themeToggle');
        if(t) t.innerHTML = `<span class="btn-icon">${data.theme==='light'?'☀️':'🌙'}</span><span class="btn-label">تم</span>`;
        const m = document.getElementById('mobileThemeIcon'); if(m) m.textContent = data.theme==='light'?'☀️':'🌙';
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
      saveHistory();
      saveAppState();
      renderDayNav();
      renderDays();
      updateChart();
      showToast('اطلاعات فقط برای همین کاربر بازگردانی شد ✓', 'success', 4000);
    }catch(err){ showToast('فایل نامعتبر', 'warn'); }
  };
  reader.readAsText(file);
  e.target.value='';
}

/* ============ Guide content ============ */
function renderGuide(){
  const el = document.getElementById('guideContent'); if(!el) return;
  el.innerHTML = `
    <div class="guide-highlight" style="background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(168,85,247,.08));border:1px solid rgba(59,130,246,.25);border-radius:12px;padding:14px 16px;margin-bottom:12px;font-size:.85rem;line-height:1.8">
      <strong style="color:var(--text-primary);font-size:1rem">📖 راهنمای کامل ProFit (نسخه آنلاین)</strong><br>
      این راهنما همه امکانات برنامه را با نقش‌های مدیر، مربی و شاگرد توضیح می‌دهد.
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">🔐 ورود و نقش‌ها</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">سیستم سه نقش دارد:</p>
      <ul style="padding-right:22px;font-size:.85rem;line-height:1.9;color:var(--text-secondary)">
        <li><strong>👑 مدیر:</strong> مدیریت کامل کاربران، تعیین نقش، حذف (با تأیید رمز)، مشاهده لاگ</li>
        <li><strong>👨‍🏫 مربی:</strong> ساخت شاگرد، مشاهده پیشرفت، ویرایش برنامه و تغذیه شاگردان، یادداشت آنالیز</li>
        <li><strong>🎓 شاگرد:</strong> فقط داده خودش را می‌بیند و ویرایش می‌کند</li>
      </ul>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">ورود با نام کاربری و رمز عبور. اگر رمز را فراموش کنید، مدیر می‌تواند بازنشانی کند.</p>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">👑 پنل مدیر</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">از دکمه «پنل مدیر» در نوار ابزار قابل دسترسی است.</p>
      <ul style="padding-right:22px;font-size:.85rem;line-height:1.9;color:var(--text-secondary)">
        <li><strong>ساخت کاربر:</strong> با تعیین نقش (شاگرد/مربی/مدیر) و اتصال شاگرد به مربی</li>
        <li><strong>ویرایش:</strong> تغییر نام، نقش، اتصال مربی و بازنشانی رمز</li>
        <li><strong>فعال/غیرفعال:</strong> مسدود کردن موقت بدون حذف داده</li>
        <li><strong>حذف:</strong> فقط مدیر — با تأیید رمز خودش. آخرین مدیر قابل حذف نیست.</li>
        <li><strong>لاگ فعالیت:</strong> ثبت ۳۰۰ رویداد آخر (ورود موفق، ورود ناموفق، ساخت، ویرایش، حذف، تغییر رمز)</li>
      </ul>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">👨‍🏫 پنل مربی</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">مربی می‌تواند شاگرد بسازد و پیشرفتشان را ببیند.</p>
      <ul style="padding-right:22px;font-size:.85rem;line-height:1.9;color:var(--text-secondary)">
        <li><strong>لیست شاگردان:</strong> با نمایش تعداد جلسات هفته و حجم تمرین</li>
        <li><strong>آنالیز خودکار:</strong> تعداد جلسات ۷ روز اخیر، تغییر حجم نسبت به هفته قبل، روزهای عقب‌مانده از برنامه</li>
        <li><strong>نمودار ۱۴ روزه:</strong> حجم تمرین هر روز به صورت ستونی</li>
        <li><strong>یادداشت:</strong> ثبت تحلیل و پیشنهاد برای هر شاگرد</li>
        <li><strong>ویرایش برنامه شاگرد:</strong> با دکمه «✏️ ویرایش برنامه شاگرد» وارد حساب او می‌شوید. تمام تغییرات روی داده‌های شاگرد ذخیره می‌شود. با بنر زرد بالای صفحه از حالت مربی خارج شوید.</li>
      </ul>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">🎓 برای شاگردان</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">شاگرد با ورود به حساب خودش می‌بیند:</p>
      <ul style="padding-right:22px;font-size:.85rem;line-height:1.9;color:var(--text-secondary)">
        <li>برنامه تمرینی که مربی برایش چیده</li>
        <li>ثبت وزنه، تکرار و زمان هر ست</li>
        <li>تیک زدن حرکات انجام‌شده</li>
        <li>محاسبه کالری و برنامه غذایی</li>
        <li>ثبت اندازه‌های بدن و مشاهده نمودار تغییرات</li>
        <li>محاسبه‌گر RPE و نمودار پیشرفت هفتگی/ماهانه/سالانه</li>
      </ul>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">💪 ثبت تمرین</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">هر کارت حرکت شامل: انیمیشن، ست/تکرار/RPE/استراحت، تایمر استراحت، ثبت وزنه هر ست با زمان‌سنج اختصاصی و خلاصه (حجم کل، بیشترین وزنه، زمان کل).</p>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">دکمه «📋 کپی وزنه ست قبل» وزنه‌های ست آخر را روی ست‌های خالی کپی می‌کند.</p>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">📱 حالت تمرکز موبایل</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">در تنظیمات → موبایل: کارت‌ها تمام صفحه می‌شوند و ثبت وزنه خودکار باز/بسته می‌شود.</p>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">🥗 تغذیه و مکمل</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">سه تب: کالری (۴ فرمول BMR)، برنامه غذایی (۲۵۰+ غذا)، مکمل (پیشنهاد خودکار بر اساس هدف).</p>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">📏 اندازه‌های بدن</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">۱۰ متریک: وزن، چربی، گردن، سینه، کمر، باسن، بازو، ساعد، ران، ساق. نمودار تغییرات + آمار.</p>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">💾 پشتیبان‌گیری</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)"><strong>⬇️ دانلود:</strong> تمام اطلاعات کاربر فعلی در یک فایل JSON. سایر کاربران در فایل نیستند.</p>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)"><strong>⬆️ بازیابی:</strong> فایل پشتیبان انتخابی فقط برای کاربر فعلی جایگزین می‌شود.</p>
    </div>

    <div class="guide-section" style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem;padding-bottom:6px;border-bottom:1px dashed var(--border)">❓ سوالات متداول</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)"><strong>Q: چرا هنگام ورود با مرورگر جدید، اطلاعاتی نمی‌بینم؟</strong><br>A: بعد از ورود، اطلاعات از سرور بارگذاری می‌شود. کمی صبر کنید.</p>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)"><strong>Q: رمز را فراموش کردم.</strong><br>A: از مدیر بخواهید رمز را بازنشانی کند.</p>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)"><strong>Q: مربی می‌تواند داده‌های من را تغییر دهد؟</strong><br>A: فقط برنامه، تغذیه و تنظیمات. داده‌های حساس فقط توسط خودتان قابل ویرایش است.</p>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)"><strong>Q: اطلاعات کجا ذخیره می‌شود؟</strong><br>A: روی سرور (SQLite) + کش محلی در مرورگر برای کارکرد آفلاین. هر تغییر به‌طور خودکار با سرور سینک می‌شود.</p>
    </div>
  `;
}