/* ============================================================
   app-core.js — هسته: ذخیره‌سازی، برنامه‌ریزی هوشمند، تنظیمات، ویرایش برنامه
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

/* ==== Program editing state ==== */
let editingDayKey = null;
let pendingExId = null;
let pickerSessionCount = 0;
let reorderMode = false;
let draggedItem = null;
let draggedFromDay = null;
let draggedExIndex = null;
let bankCat = 'all';
let pickerCat = 'all';
let selectedWeekday = null;
let selectedDayType = 'workout';
let currentCardioPresetId = null;

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
function loadUsers(){ users = []; currentUserId = null; }
function saveUsers(){ }
function updateUserButton(){ }
function openUserDrawer(){ }
function closeUserDrawer(){ }
function renderUserList(){ }
function showUserForm(){ showToast('ایجاد کاربر فقط از پنل مربی/مدیر', 'info'); }
function cancelUserForm(){ }
function saveUserForm(){ }
function editUser(){ }
function deleteUser(){ showToast('حذف کاربر فقط توسط مدیر انجام می‌شود', 'info'); }
function switchUser(){ }
function requestUserSwitch(){ }
function submitPwdGate(){ }
function closePwdGate(){ }
function renderEmojiPicker(){ }
function selectEmoji(){ }
function renderColorPicker(){ }
function selectColor(){ }
function rgbToHex(rgb){
  if(!rgb) return '#3b82f6'; if(rgb.startsWith('#')) return rgb;
  const m = rgb.match(/\d+/g); if(!m) return '#3b82f6';
  return '#' + m.slice(0,3).map(n=>parseInt(n).toString(16).padStart(2,'0')).join('');
}
function renderUserFormWeekdays(){ }
function toggleUserFormWeekday(){ }

/* ============ Exercise Bank ============ */
function loadExerciseBank(){
  if(!currentUserId){
    exerciseBank = {};
    if(typeof DEFAULT_EXERCISES !== 'undefined') DEFAULT_EXERCISES.forEach(e=>{ exerciseBank[e.id] = { ...e, custom: false }; });
    return;
  }
  try{
    const raw = localStorage.getItem(getBankKey());
    if(raw){
      const arr = JSON.parse(raw); exerciseBank = {};
      arr.forEach(e=>{ exerciseBank[e.id] = e; });
      if(typeof DEFAULT_EXERCISES !== 'undefined') DEFAULT_EXERCISES.forEach(def => { if(!exerciseBank[def.id]) exerciseBank[def.id] = { ...def, custom: false }; });
      saveExerciseBank();
    } else {
      exerciseBank = {};
      if(typeof DEFAULT_EXERCISES !== 'undefined') DEFAULT_EXERCISES.forEach(e=>{ exerciseBank[e.id] = { ...e, custom: false }; });
      saveExerciseBank();
    }
  }catch(e){
    exerciseBank = {};
    if(typeof DEFAULT_EXERCISES !== 'undefined') DEFAULT_EXERCISES.forEach(ex=>{ exerciseBank[ex.id] = { ...ex, custom: false }; });
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

/* ============ Smart program ============ */
function generateSmartProgram(daysCount, selectedWeekdays, level){
  const splitKeys = SPLITS_BY_DAYS[daysCount];
  if(!splitKeys || !splitKeys.length){ showToast('برنامه هوشمند نیاز به حداقل ۲ روز دارد', 'warn'); return; }
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

/* ============ Reset/Export/Import ============ */
function resetAll(){
  if(!currentUserId){ showToast('ابتدا وارد شوید', 'warn'); return; }
  if(userSettings.confirmBeforeReset && !confirm('اطلاعات کاربر فعلی پاک شوند؟')) return;
  completedExercises={}; exerciseLogs={}; activeTimers={}; cardioTimers={}; setTimers={}; openLoggers={}; collapsedExercises={};
  try{ localStorage.removeItem(getStateKey()); localStorage.removeItem(getHistoryKey()); }catch(e){}
  history = {};
  const t = getTodayDayKey();
  currentDay = (userSettings.autoOpenToday && t) ? t : 'all';
  renderDayNav(); renderDays(); updateChart();
  showToast('اطلاعات کاربر ریست شد', 'info');
}
function exportData(){
  const u = getCurrentUser(); if(!u) return;
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
      saveHistory(); saveAppState(); renderDayNav(); renderDays(); updateChart();
      showToast('اطلاعات فقط برای همین کاربر بازگردانی شد ✓', 'success', 4000);
    }catch(err){ showToast('فایل نامعتبر', 'warn'); }
  };
  reader.readAsText(file);
  e.target.value='';
}

/* ============ Guide ============ */
function renderGuide(){
  const el = document.getElementById('guideContent'); if(!el) return;
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(168,85,247,.08));border:1px solid rgba(59,130,246,.25);border-radius:12px;padding:14px 16px;margin-bottom:12px;font-size:.85rem;line-height:1.8">
      <strong style="color:var(--text-primary);font-size:1rem">📖 راهنمای کامل ProFit (نسخه آنلاین)</strong><br>
      این راهنما همه امکانات برنامه را با نقش‌های مدیر، مربی و شاگرد توضیح می‌دهد.
    </div>
    <div style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem">🔐 ورود و نقش‌ها</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">سه نقش: <strong>👑 مدیر</strong> (مدیریت کاربران)، <strong>👨‍🏫 مربی</strong> (ساخت شاگرد + تحلیل)، <strong>🎓 شاگرد</strong> (داده خودش).</p>
    </div>
    <div style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem">👑 پنل مدیر</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">ساخت/ویرایش/حذف کاربران، تغییر نقش، بازنشانی رمز، فعال/غیرفعال کردن، مشاهده لاگ فعالیت.</p>
    </div>
    <div style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem">👨‍🏫 پنل مربی</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">مشاهده شاگردان، آنالیز خودکار (تعداد جلسات، تغییر حجم)، نمودار ۱۴ روزه، ثبت یادداشت، ویرایش برنامه شاگرد.</p>
    </div>
    <div style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem">💪 ثبت تمرین</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">هر کارت: انیمیشن، ست/تکرار/RPE/استراحت، تایمر استراحت، ثبت وزنه هر ست با زمان‌سنج.</p>
    </div>
    <div style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem">🥗 تغذیه</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">محاسبه BMR با ۴ فرمول، برنامه غذایی با ۲۵۰+ غذا، پیشنهاد مکمل بر اساس هدف.</p>
    </div>
    <div style="margin-bottom:22px">
      <h3 style="color:var(--text-primary);margin:16px 0 8px;font-size:.98rem">📏 اندازه‌های بدن</h3>
      <p style="font-size:.85rem;line-height:1.9;color:var(--text-secondary)">۱۰ متریک با نمودار تغییرات و آمار.</p>
    </div>
  `;
}

/* ============================================================
   PROGRAM EDITING UI — (قبلاً جا افتاده بود، الان اضافه شده)
   ============================================================ */

function openProgramDrawer(){
  renderProgramDays();
  if(typeof renderCatFilter === 'function') renderCatFilter('catFilter');
  if(typeof renderBankList === 'function') renderBankList();
  document.getElementById('programBackdrop').classList.add('open');
  document.getElementById('programDrawer').classList.add('open');
}
function closeProgramDrawer(){
  document.getElementById('programBackdrop').classList.remove('open');
  document.getElementById('programDrawer').classList.remove('open');
  cancelDayForm();
}
function switchProgramTab(tab){
  document.querySelectorAll('.drawer-tab[data-ptab]').forEach(t=>t.classList.toggle('active', t.dataset.ptab === tab));
  document.getElementById('ptab-days').classList.toggle('active', tab === 'days');
  document.getElementById('ptab-bank').classList.toggle('active', tab === 'bank');
}
function toggleReorderMode(){
  reorderMode = !reorderMode;
  const btn = document.getElementById('reorderToggle');
  const icon = document.getElementById('reorderToggleIcon');
  const label = document.getElementById('reorderToggleLabel');
  if(reorderMode){ btn.classList.add('active'); icon.textContent = '✓'; label.textContent = 'در حال جابجایی'; showToast('حالت جابجایی فعال', 'info', 2500); }
  else { btn.classList.remove('active'); icon.textContent = '🔀'; label.textContent = 'جابجایی'; }
  renderProgramDays();
}

function renderProgramDays(){
  const list = document.getElementById('programDaysList'); if(!list) return;
  if(userProgram.days.length === 0){
    list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">📭</div><div>هنوز روزی تعریف نشده</div></div>';
    return;
  }
  list.innerHTML = userProgram.days.map((day, di)=>{
    const totalEx = (day.exercises||[]).length;
    const exs = (day.exercises||[]).map((e, exIdx)=>{
      const ex = getExercise(e.exId); if(!ex) return '';
      return `<div class="program-ex-item" data-day-idx="${di}" data-ex-idx="${exIdx}" ${reorderMode ? 'draggable="true"' : ''}
        ondragstart="onExDragStart(event, ${di}, ${exIdx})" ondragover="onExDragOver(event)" ondragleave="onExDragLeave(event)"
        ondrop="onExDrop(event, ${di}, ${exIdx})" ondragend="onExDragEnd(event)">
        <span class="drag-handle" title="بکشید">⋮⋮</span>
        <span class="ex-cat-badge">${(CATEGORIES[ex.cat]||{}).emoji||'🏋️'}</span>
        <span class="ex-name-s">${escapeHtml(ex.name)}</span>
        <span class="ex-detail">${formatNum(e.sets != null ? e.sets : ex.sets)}×${escapeHtml(e.reps || ex.reps)}</span>
        <div class="ex-move-btns">
          <button class="ex-move-btn" ${exIdx === 0 ? 'disabled' : ''} onclick="event.stopPropagation(); moveExercise(${di}, ${exIdx}, -1)" title="بالا">▲</button>
          <button class="ex-move-btn" ${exIdx === totalEx-1 ? 'disabled' : ''} onclick="event.stopPropagation(); moveExercise(${di}, ${exIdx}, 1)" title="پایین">▼</button>
        </div>
        <button class="ex-remove" onclick="event.stopPropagation(); removeExerciseFromDay(${di}, '${e.exId}')">✕</button>
      </div>`;
    }).join('');
    const wd = WEEKDAYS.find(w=>w.jsDay === day.weekday);
    const wdLabel = wd ? ` · ${wd.name}` : '';
    const isEditing = editingDayKey === di;
    const dayType = day.type || 'workout';
    const typeLabel = dayType === 'rest' ? '😴 استراحت' : (dayType === 'cardio' ? '🏃 کاردیو' : '💪 تمرین');
    const typeClass = dayType === 'rest' ? 'rest' : (dayType === 'cardio' ? 'cardio' : 'workout');
    return `<div class="program-day-card ${isEditing?'editing':''}">
      <div class="program-day-header">
        <div class="program-day-icon">${day.icon||'💪'}</div>
        <div class="program-day-info">
          <div class="program-day-name">${escapeHtml(day.name)}<span class="day-type-badge ${typeClass}">${typeLabel}</span>${wdLabel ? '<span style="color:var(--text-muted);font-size:.75rem;font-weight:500">'+wdLabel+'</span>' : ''}${isEditing ? '<span style="color:var(--accent-green);font-size:.72rem;font-weight:800;margin-right:6px">در حال ویرایش</span>' : ''}</div>
          <div class="program-day-focus">${escapeHtml(day.focus||'')}${dayType === 'workout' ? ' · '+formatNum(totalEx)+' حرکت' : (dayType === 'cardio' && totalEx>0 ? ' · '+formatNum(totalEx)+' حرکت' : '')}</div>
        </div>
        <div class="program-day-actions">
          ${dayType === 'workout' || dayType === 'cardio' ? `<button class="user-action-btn" onclick="addExerciseToDay(${di})" title="افزودن حرکت">➕</button>` : ''}
          <button class="user-action-btn" onclick="showDayForm(${di})" title="ویرایش">✏️</button>
          <button class="user-action-btn delete" onclick="deleteDay(${di})" title="حذف">🗑️</button>
        </div>
      </div>
      ${exs ? `<div class="program-day-exlist ${reorderMode?'reorder-mode':''}">${exs}</div>` : (dayType === 'rest' ? `<div style="padding-top:10px;font-size:.75rem;color:var(--text-muted);text-align:center">😴 روز استراحت</div>` : (dayType === 'cardio' && !day.cardio ? `<div style="padding-top:10px;font-size:.75rem;color:var(--text-muted);text-align:center">🏃 روز کاردیو</div>` : `<div style="padding-top:10px;font-size:.75rem;color:var(--text-muted);text-align:center">هیچ حرکتی اضافه نشده — روی ➕ بزنید</div>`))}
    </div>`;
  }).join('');
}

function onExDragStart(event, dayIdx, exIdx){
  if(!reorderMode){ event.preventDefault(); return; }
  draggedItem = event.currentTarget; draggedFromDay = dayIdx; draggedExIndex = exIdx;
  event.currentTarget.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  try{ event.dataTransfer.setData('text/plain', `${dayIdx}-${exIdx}`); }catch(e){}
}
function onExDragOver(event){
  if(!reorderMode) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'move';
  const item = event.currentTarget;
  if(item === draggedItem) return;
  document.querySelectorAll('.program-ex-item.drag-over').forEach(el=>{ if(el !== item) el.classList.remove('drag-over'); });
  item.classList.add('drag-over');
}
function onExDragLeave(event){ event.currentTarget.classList.remove('drag-over'); }
function onExDrop(event, toDayIdx, toExIdx){
  if(!reorderMode) return;
  event.preventDefault(); event.stopPropagation();
  document.querySelectorAll('.program-ex-item.drag-over').forEach(el=>el.classList.remove('drag-over'));
  if(draggedFromDay == null || draggedExIndex == null) return;
  if(draggedFromDay !== toDayIdx){ showToast('جابجایی فقط در همان روز ممکن است', 'warn'); return; }
  if(draggedExIndex === toExIdx) return;
  const day = userProgram.days[toDayIdx]; if(!day || !day.exercises) return;
  const [moved] = day.exercises.splice(draggedExIndex, 1);
  day.exercises.splice(toExIdx, 0, moved);
  saveUserProgram(); rebuildWorkoutData();
  renderProgramDays(); renderDays(); updateChart();
  showToast('✓ ترتیب ذخیره شد', 'success', 1800);
}
function onExDragEnd(event){
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.program-ex-item.drag-over').forEach(el=>el.classList.remove('drag-over'));
  draggedItem = null; draggedFromDay = null; draggedExIndex = null;
}
function moveExercise(dayIdx, exIdx, direction){
  if(!reorderMode) return;
  const day = userProgram.days[dayIdx]; if(!day || !day.exercises) return;
  const targetIdx = exIdx + direction;
  if(targetIdx < 0 || targetIdx >= day.exercises.length) return;
  const temp = day.exercises[exIdx]; day.exercises[exIdx] = day.exercises[targetIdx]; day.exercises[targetIdx] = temp;
  saveUserProgram(); rebuildWorkoutData();
  renderProgramDays(); renderDays(); updateChart();
}

function renderDayTypePicker(type){
  selectedDayType = type || 'workout';
  document.querySelectorAll('#dayTypePicker .day-type-chip').forEach(b=>{ b.classList.toggle('selected', b.dataset.type === selectedDayType); });
  const presetRow = document.getElementById('cardioPresetRow');
  const textRow = document.getElementById('cardioTextRow');
  if(presetRow) presetRow.style.display = (selectedDayType === 'rest') ? 'none' : 'block';
  if(textRow) textRow.style.display = (selectedDayType === 'rest') ? 'none' : 'block';
}
function pickDayType(type, btn){
  selectedDayType = type;
  document.querySelectorAll('#dayTypePicker .day-type-chip').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  const presetRow = document.getElementById('cardioPresetRow');
  const textRow = document.getElementById('cardioTextRow');
  if(presetRow) presetRow.style.display = (type === 'rest') ? 'none' : 'block';
  if(textRow) textRow.style.display = (type === 'rest') ? 'none' : 'block';
  renderCardioPresetPicker(currentCardioPresetId);
}
function renderCardioPresetPicker(selectedId){
  const c = document.getElementById('cardioPresetPicker'); if(!c) return;
  c.innerHTML = CARDIO_PRESETS.map(p =>
    `<button type="button" class="cardio-preset-chip ${p.id===selectedId?'selected':''}" onclick="pickCardioPreset('${p.id}', this)" title="${escapeHtml(p.desc)}">${p.icon} ${p.name}</button>`
  ).join('');
}
function pickCardioPreset(id, btn){
  currentCardioPresetId = id;
  const preset = CARDIO_PRESETS.find(p=>p.id===id); if(!preset) return;
  document.querySelectorAll('#cardioPresetPicker .cardio-preset-chip').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  const txt = document.getElementById('dayFormCardio'); if(txt) txt.value = preset.desc;
  const iconEl = document.getElementById('dayFormIcon');
  if(iconEl && (!iconEl.value.trim() || iconEl.value === '💪')) iconEl.value = preset.icon;
}

function showDayForm(idx){
  editingDayKey = (idx != null) ? idx : null;
  const title = document.getElementById('dayFormTitle');
  currentCardioPresetId = null;
  if(idx != null){
    const d = userProgram.days[idx];
    title.innerHTML = '✏️ ویرایش روز';
    document.getElementById('dayFormName').value = d.name;
    document.getElementById('dayFormIcon').value = d.icon || '💪';
    document.getElementById('dayFormFocus').value = d.focus || '';
    document.getElementById('dayFormCardio').value = d.cardio || '';
    renderWeekdayPicker(d.weekday != null ? d.weekday : null);
    renderDayTypePicker(d.type || 'workout');
    currentCardioPresetId = d.cardioPresetId || null;
    renderCardioPresetPicker(currentCardioPresetId);
  } else {
    title.innerHTML = '➕ افزودن روز';
    document.getElementById('dayFormName').value = '';
    document.getElementById('dayFormIcon').value = '💪';
    document.getElementById('dayFormFocus').value = '';
    document.getElementById('dayFormCardio').value = '';
    renderWeekdayPicker(null);
    renderDayTypePicker('workout');
    renderCardioPresetPicker(null);
  }
  document.getElementById('dayForm').classList.add('open');
  setTimeout(()=>document.getElementById('dayFormName').focus(), 100);
}
function cancelDayForm(){
  editingDayKey = null; selectedWeekday = null;
  document.getElementById('dayForm').classList.remove('open');
  renderProgramDays();
}
function renderWeekdayPicker(currentWeekday){
  const container = document.getElementById('dayWeekdayPicker'); if(!container) return;
  const todayJsDay = new Date().getDay();
  const usedWeekdays = new Set(userProgram.days.filter((d, i) => editingDayKey == null || i !== editingDayKey).map(d => d.weekday).filter(w => w != null));
  selectedWeekday = (currentWeekday != null) ? currentWeekday : null;
  container.innerHTML = WEEKDAYS.map(w => {
    const isUsed = usedWeekdays.has(w.jsDay);
    const isSelected = selectedWeekday === w.jsDay;
    const isToday = todayJsDay === w.jsDay;
    const disabled = isUsed && !isSelected;
    return `<button type="button" class="weekday-chip ${isSelected?'selected':''} ${isToday?'today':''}" ${disabled?'disabled':''} onclick="pickWeekday(${w.jsDay}, this)">${w.icon} ${w.name}</button>`;
  }).join('');
}
function pickWeekday(jsDay, btn){
  selectedWeekday = jsDay;
  document.querySelectorAll('#dayWeekdayPicker .weekday-chip').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const w = WEEKDAYS.find(x => x.jsDay === jsDay); if(!w) return;
  const nameEl = document.getElementById('dayFormName');
  const iconEl = document.getElementById('dayFormIcon');
  const focusEl = document.getElementById('dayFormFocus');
  if(!nameEl.value.trim() || nameEl.value.trim().startsWith('روز ')) nameEl.value = w.defaultName;
  if(!iconEl.value.trim() || iconEl.value === '💪') iconEl.value = w.icon;
  if(!focusEl.value.trim()) focusEl.value = w.defaultFocus;
}
function saveDayForm(){
  const name = document.getElementById('dayFormName').value.trim();
  const icon = document.getElementById('dayFormIcon').value.trim() || '💪';
  const focus = document.getElementById('dayFormFocus').value.trim();
  const cardio = document.getElementById('dayFormCardio').value.trim();
  const dayType = selectedDayType || 'workout';
  if(!name){ showToast('نام روز را وارد کنید', 'warn'); return; }
  if(selectedWeekday == null){ showToast('روز هفته را انتخاب کنید', 'warn'); return; }
  const dupIdx = userProgram.days.findIndex((d, i) => d.weekday === selectedWeekday && i !== editingDayKey);
  if(dupIdx !== -1){ showToast('این روز از قبل برنامه دارد', 'warn'); return; }
  const wd = WEEKDAYS.find(w => w.jsDay === selectedWeekday);
  let isNewDay = false, newDayKey = null;
  const cardioPresetId = (dayType !== 'rest' && currentCardioPresetId) ? currentCardioPresetId : null;
  if(editingDayKey != null){
    const d = userProgram.days[editingDayKey];
    d.name = name; d.icon = icon; d.focus = focus;
    d.cardio = (dayType === 'rest') ? '' : cardio;
    d.weekday = selectedWeekday; d.type = dayType; d.cardioPresetId = cardioPresetId;
    if(!d.key) d.key = 'day_' + Date.now();
    if(!d.theme) d.theme = 'day-sat';
    showToast('روز ویرایش شد', 'success');
  } else {
    let baseKey = wd ? wd.key : ('day_' + Date.now());
    let finalKey = baseKey, suffix = 1;
    while(userProgram.days.some(d => d.key === finalKey)){ finalKey = baseKey + '_' + (++suffix); }
    newDayKey = finalKey;
    userProgram.days.push({
      id: 'd_' + Date.now(), key: finalKey, weekday: selectedWeekday,
      name, icon, focus, theme: 'day-sat', type: dayType,
      cardio: (dayType === 'rest') ? '' : cardio, cardioPresetId,
      cardioIcon: '🏃', cardioDefault: userSettings.defaultCardioMinutes, exercises: []
    });
    isNewDay = true;
  }
  saveUserProgram(); rebuildWorkoutData();
  renderProgramDays(); renderDayNav(); renderDays(); updateChart();
  cancelDayForm();
  if(isNewDay && newDayKey && dayType === 'workout'){
    const newIdx = userProgram.days.findIndex(d => d.key === newDayKey);
    if(newIdx !== -1){ showToast(`روز «${name}» ساخته شد — حرکات را اضافه کنید`, 'info', 3500); setTimeout(() => addExerciseToDay(newIdx), 400); }
  } else if(isNewDay){ showToast(`روز «${name}» ساخته شد`, 'success'); }
}
function deleteDay(idx){
  const d = userProgram.days[idx]; if(!d) return;
  if(!confirm(`روز «${d.name}» حذف شود؟`)) return;
  userProgram.days.splice(idx, 1);
  saveUserProgram(); rebuildWorkoutData();
  renderProgramDays(); renderDayNav(); renderDays(); updateChart();
  showToast('روز حذف شد', 'info');
}

function addExerciseToDay(dayIdx){
  editingDayKey = dayIdx; pickerSessionCount = 0;
  updatePickerContext();
  if(typeof renderPickerCatFilter === 'function') renderPickerCatFilter();
  if(typeof renderPickerList === 'function') renderPickerList();
  document.getElementById('pickerBackdrop').classList.add('open');
  document.getElementById('pickerDrawer').classList.add('open');
  renderProgramDays();
}
function updatePickerContext(){
  const day = userProgram.days[editingDayKey]; if(!day) return;
  document.getElementById('pickerDrawerTitle').innerHTML = `➕ افزودن حرکت به «${day.name}»`;
  const badge = document.getElementById('pickerDayBadge');
  const count = (day.exercises || []).length;
  badge.innerHTML = `<div class="pd-icon">${day.icon || '💪'}</div><div class="pd-info"><div class="pd-name">${escapeHtml(day.name)}</div><div class="pd-focus">${escapeHtml(day.focus || '')}</div></div><div class="pd-count" id="pickerDayCount">${formatNum(count)} حرکت در برنامه</div>`;
  updatePickerFooter(count);
}
function updatePickerFooter(count){
  const info = document.getElementById('pickerFooterInfo'); if(!info) return;
  if(pickerSessionCount === 0){ info.innerHTML = `روز: <strong>${count}</strong> حرکت — می‌توانید حرکات را پشت‌سرهم اضافه کنید`; }
  else { info.innerHTML = `<strong>${pickerSessionCount}</strong> حرکت جدید — کل: <strong>${count}</strong> حرکت`; }
}
function refreshPickerAfterAdd(){
  updatePickerContext();
  if(typeof renderPickerList === 'function') renderPickerList();
  const badge = document.getElementById('pickerDayBadge');
  if(badge){ badge.classList.remove('just-added'); void badge.offsetWidth; badge.classList.add('just-added'); }
  renderProgramDays();
}
function closeExercisePicker(){
  document.getElementById('pickerBackdrop').classList.remove('open');
  document.getElementById('pickerDrawer').classList.remove('open');
  const addedCount = pickerSessionCount;
  editingDayKey = null; pendingExId = null; pickerSessionCount = 0;
  renderProgramDays(); renderDayNav(); renderDays(); updateChart();
  if(addedCount > 0) showToast(`✓ ${formatNum(addedCount)} حرکت اضافه شد`, 'success', 3500);
}

function removeExerciseFromDay(dayIdx, exId){
  const day = userProgram.days[dayIdx]; if(!day) return;
  const i = day.exercises.findIndex(e=>e.exId === exId);
  if(i === -1) return;
  day.exercises.splice(i, 1);
  saveUserProgram(); rebuildWorkoutData();
  renderProgramDays(); renderDays(); updateChart();
  if(editingDayKey === dayIdx) refreshPickerAfterAdd();
  showToast('حرکت حذف شد', 'info');
}

/* ============ Bank / Picker ============ */
function renderCatFilter(containerId){
  const c = document.getElementById(containerId); if(!c) return;
  let html = `<button class="cat-chip active" data-cat="all" onclick="setBankCat('${containerId}','all',this)">🌐 همه</button>`;
  Object.keys(CATEGORIES).forEach(cat=>{ html += `<button class="cat-chip" data-cat="${cat}" onclick="setBankCat('${containerId}','${cat}',this)">${CATEGORIES[cat].emoji} ${CATEGORIES[cat].name}</button>`; });
  c.innerHTML = html;
}
function setBankCat(containerId, cat, btn){
  bankCat = cat;
  document.querySelectorAll(`#${containerId} .cat-chip`).forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(containerId === 'catFilter') renderBankList();
  else renderPickerList();
}
function renderBankList(){
  const list = document.getElementById('bankList'); if(!list) return;
  const term = (document.getElementById('bankSearchInput').value || '').trim().toLowerCase();
  let exs = Object.values(exerciseBank);
  if(bankCat !== 'all') exs = exs.filter(e=>e.cat === bankCat);
  if(term) exs = exs.filter(e=> (e.name||'').toLowerCase().includes(term) || (e.en||'').toLowerCase().includes(term));
  if(exs.length === 0){ list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">📭</div><div>حرکتی یافت نشد</div></div>'; return; }
  list.innerHTML = exs.map(e=>`
    <div class="bank-item">
      <div class="bank-item-icon">${(CATEGORIES[e.cat]||{}).emoji||'🏋️'}</div>
      <div class="bank-item-info">
        <div class="bank-item-name">${escapeHtml(e.name)}${e.custom?'<span class="bank-item custom-badge">سفارشی</span>':''}</div>
        <div class="bank-item-en">${escapeHtml(e.en||'')}</div>
      </div>
      <span class="bank-item-cat">${(CATEGORIES[e.cat]||{}).name||''}</span>
      ${e.custom ? `<button class="user-action-btn delete" onclick="event.stopPropagation(); deleteCustomExercise('${e.id}')" title="حذف">🗑️</button>` : ''}
    </div>`).join('');
}
function deleteCustomExercise(id){
  const ex = getExercise(id); if(!ex || !ex.custom) return;
  if(!confirm(`حرکت «${ex.name}» حذف شود؟`)) return;
  delete exerciseBank[id];
  saveExerciseBank(); renderBankList();
  showToast('حرکت حذف شد', 'info');
}
function renderPickerCatFilter(){
  const container = document.getElementById('pickerCatFilter'); if(!container) return;
  let html = `<button class="cat-chip active" data-cat="all" onclick="setBankCat('pickerCatFilter','all',this)">🌐 همه</button>`;
  Object.keys(CATEGORIES).forEach(cat=>{ html += `<button class="cat-chip" data-cat="${cat}" onclick="setBankCat('pickerCatFilter','${cat}',this)">${CATEGORIES[cat].emoji} ${CATEGORIES[cat].name}</button>`; });
  container.innerHTML = html;
}
function renderPickerList(){
  const list = document.getElementById('pickerList');
  if(!list) return;
  const term = (document.getElementById('pickerSearchInput').value || '').trim().toLowerCase();
  const day = userProgram.days[editingDayKey];
  const inDayIds = new Set((day?.exercises || []).map(e => e.exId));
  let exs = Object.values(exerciseBank);
  if(bankCat !== 'all') exs = exs.filter(e=>e.cat === bankCat);
  if(term) exs = exs.filter(e=> (e.name||'').toLowerCase().includes(term) || (e.en||'').toLowerCase().includes(term));
  if(exs.length === 0){ list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">🔍</div><div>حرکتی یافت نشد</div></div>'; return; }
  list.innerHTML = exs.map(e=>{
    const inDay = inDayIds.has(e.id);
    return `<div class="bank-item ${inDay?'in-day':''}" onclick="pickExercise('${e.id}')">
      <div class="bank-item-icon">${(CATEGORIES[e.cat]||{}).emoji||'🏋️'}</div>
      <div class="bank-item-info">
        <div class="bank-item-name">${escapeHtml(e.name)}${inDay?'<span class="bank-item in-day-badge">✓ اضافه شد</span>':''}</div>
        <div class="bank-item-en">${escapeHtml(e.en||'')}</div>
      </div>
      <span class="bank-item-cat">${(CATEGORIES[e.cat]||{}).name||''}</span>
    </div>`;
  }).join('');
}
function pickExercise(exId){
  pendingExId = exId;
  const ex = getExercise(exId); if(!ex) return;
  document.getElementById('exConfigName').textContent = ex.name;
  document.getElementById('exConfigSets').value = ex.sets;
  document.getElementById('exConfigReps').value = ex.reps;
  document.getElementById('exConfigRpe').value = ex.rpe;
  document.getElementById('exConfigRest').value = ex.rest;
  document.getElementById('exConfigBackdrop').classList.add('open');
  document.getElementById('exConfigDrawer').classList.add('open');
}
function closeExConfig(){
  document.getElementById('exConfigBackdrop').classList.remove('open');
  document.getElementById('exConfigDrawer').classList.remove('open');
  pendingExId = null;
}
function confirmAddExercise(){
  if(editingDayKey == null || !pendingExId){ showToast('خطا', 'warn'); return; }
  const sets = parseInt(document.getElementById('exConfigSets').value) || 3;
  const reps = document.getElementById('exConfigReps').value.trim() || '۱۰-۱۲';
  const rpe = document.getElementById('exConfigRpe').value.trim() || '۸';
  const rest = parseInt(document.getElementById('exConfigRest').value) || 90;
  const day = userProgram.days[editingDayKey];
  if(!day.exercises) day.exercises = [];
  day.exercises.push({ exId: pendingExId, sets, reps, rpe, rest });
  saveUserProgram(); rebuildWorkoutData();
  closeExConfig(); pickerSessionCount++; refreshPickerAfterAdd();
  showToast('✓ اضافه شد — حرکت بعدی را انتخاب کنید', 'success', 2500);
}

/* ============ Custom Exercise Form ============ */
function showExerciseForm(exId){
  const title = document.getElementById('exFormTitle');
  const nameEl = document.getElementById('exFormName');
  const enEl = document.getElementById('exFormEn');
  const catEl = document.getElementById('exFormCat');
  const animEl = document.getElementById('exFormAnim');
  const setsEl = document.getElementById('exFormSets');
  const repsEl = document.getElementById('exFormReps');
  const rpeEl = document.getElementById('exFormRpe');
  const restEl = document.getElementById('exFormRest');
  if(exId){
    const ex = getExercise(exId); if(!ex) return;
    title.textContent = '✏️ ویرایش حرکت';
    nameEl.value = ex.name; enEl.value = ex.en || '';
    catEl.value = ex.cat; animEl.value = ex.anim;
    setsEl.value = ex.sets; repsEl.value = ex.reps;
    rpeEl.value = ex.rpe; restEl.value = ex.rest;
    document.getElementById('exFormDrawer').dataset.editId = exId;
  } else {
    title.textContent = '➕ حرکت سفارشی';
    nameEl.value = ''; enEl.value = '';
    catEl.value = 'chest'; animEl.value = 'benchPress';
    setsEl.value = 3; repsEl.value = '۱۰-۱۲'; rpeEl.value = '۸'; restEl.value = 90;
    delete document.getElementById('exFormDrawer').dataset.editId;
  }
  document.getElementById('exFormBackdrop').classList.add('open');
  document.getElementById('exFormDrawer').classList.add('open');
  setTimeout(()=>nameEl.focus(), 100);
}
function closeExerciseForm(){
  document.getElementById('exFormBackdrop').classList.remove('open');
  document.getElementById('exFormDrawer').classList.remove('open');
}
function saveExerciseForm(){
  const name = document.getElementById('exFormName').value.trim();
  if(!name){ showToast('نام حرکت را وارد کنید', 'warn'); return; }
  const en = document.getElementById('exFormEn').value.trim();
  const cat = document.getElementById('exFormCat').value;
  const anim = document.getElementById('exFormAnim').value;
  const sets = parseInt(document.getElementById('exFormSets').value) || 3;
  const reps = document.getElementById('exFormReps').value.trim() || '۱۰-۱۲';
  const rpe = document.getElementById('exFormRpe').value.trim() || '۸';
  const rest = parseInt(document.getElementById('exFormRest').value) || 90;
  const editId = document.getElementById('exFormDrawer').dataset.editId;
  if(editId && exerciseBank[editId]){
    Object.assign(exerciseBank[editId], { name, en, cat, anim, sets, reps, rpe, rest });
    showToast('حرکت ویرایش شد', 'success');
  } else {
    const newId = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2,5);
    exerciseBank[newId] = { id: newId, name, en, cat, anim, sets, reps, rpe, rest, custom: true };
    showToast(`حرکت «${name}» اضافه شد`, 'success');
  }
  saveExerciseBank(); renderBankList();
  if(editingDayKey != null) renderPickerList();
  closeExerciseForm();
}
