/* ============================================================
   app-workout.js — نمایش تمرین، تایمرها، RPE، نمودار پیشرفت
   ============================================================ */

/* ============ Render Days ============ */
function renderDays(){
  const container = document.getElementById('daysContainer');
  const days = currentDay === 'all' ? userProgram.days.map(d=>d.key) : [currentDay];
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  let html = '';
  days.forEach(dayKey=>{
    const day = workoutData[dayKey]; if(!day) return;
    const dayType = day.type || 'workout';
    if(dayType === 'rest'){
      if(searchTerm) return;
      html += `<div class="day-card ${day.theme || 'day-sat'}">
        <div class="day-header"><div class="day-title"><div class="day-icon">${day.icon||'😴'}</div>
        <div><div class="day-name">${escapeHtml(day.name)}</div><div class="day-focus">${escapeHtml(day.focus||'ریکاوری و بازسازی')}</div></div></div>
        <div style="font-size:.85rem;font-weight:700;color:var(--text-muted)">😴 استراحت</div></div>
        <div class="rest-day-banner"><div class="rest-day-icon">😴</div><div class="rest-day-title">روز استراحت</div>
        <div class="rest-day-sub">بدن در حال بازسازی است — کشش سبک، آب کافی و خواب مناسب فراموش نشود.</div></div></div>`;
      return;
    }
    const cstate = cardioTimers[dayKey];
    const cMins = cstate ? Math.round(cstate.total/60) : (day.cardioDefault || userSettings.defaultCardioMinutes);
    const cRemaining = cstate ? getRemaining(cstate) : cMins*60;
    const cRingOffset = cstate ? 226 * (1 - cRemaining/cstate.total) : 0;
    const cRunning = cstate && cstate.running;
    const cDone = cstate && cRemaining <= 0 && !cRunning;
    const cBtnLabel = cRunning ? '⏸ توقف' : cDone ? '▶ شروع' : (cstate && cRemaining < cstate.total ? '▶ ادامه' : '▶ شروع');
    const cBtnClass = cRunning ? 'pause' : 'start';
    const cRingClass = cRunning ? 'running' : (cDone ? 'done' : '');
    let cardioText = day.cardio;
    if(dayType === 'cardio' && !cardioText && day.cardioPresetId){
      const p = CARDIO_PRESETS.find(x=>x.id===day.cardioPresetId);
      if(p) cardioText = p.desc;
    }
    const showCardioSection = !!cardioText;
    const filtered = day.exercises.filter(ex => !searchTerm || ex.name.toLowerCase().includes(searchTerm) || (ex.en||'').toLowerCase().includes(searchTerm));
    const hasExercises = day.exercises.length > 0;
    const doneCount = day.exercises.filter((_,i)=>completedExercises[`${dayKey}-${i}`]).length;
    const progress = day.exercises.length ? Math.round((doneCount / day.exercises.length) * 100) : 0;
    if(searchTerm && filtered.length === 0 && !showCardioSection) return;
    const headerRight = dayType === 'cardio'
      ? '<div style="font-size:.85rem;font-weight:700;color:var(--accent-green)">🏃 کاردیو</div>'
      : `<div style="font-size:.85rem;font-weight:700;color:var(--accent-green)">✅ ${formatNum(doneCount)} از ${formatNum(day.exercises.length)}</div>`;
    html += `<div class="day-card ${day.theme || 'day-sat'}"><div class="day-header">
      <div class="day-title"><div class="day-icon">${day.icon||'💪'}</div>
      <div><div class="day-name">${escapeHtml(day.name)}</div><div class="day-focus">${escapeHtml(day.focus||'')}</div></div></div>
      ${headerRight}</div>`;
    if(hasExercises){
      html += `<div class="exercise-grid">${filtered.map(ex=>{
        const originalIndex = day.exercises.indexOf(ex);
        const key = `${dayKey}-${originalIndex}`;
        const isDone = completedExercises[key];
        const collapsed = isCollapsed(key);
        const hasImg = !!ex.img;
        const imgStart = hasImg ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ex.img}/0.jpg` : '';
        const imgEnd = hasImg ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ex.img}/1.jpg` : '';
        const restState = activeTimers[key];
        const restRem = restState ? getRemaining(restState) : ex.rest;
        const restRunning = restState && restState.running;
        const restDone = restState && restRem <= 0 && !restRunning;
        const restDisplay = restDone ? '✅' : (formatNum(restRem) + 'ث');
        const loggerOpen = openLoggers[key];
        const logs = exerciseLogs[key] || [];
        let totalVol = 0, maxWeight = 0, totalTime = 0;
        logs.forEach(l=>{ if(l.weight && l.reps) totalVol += l.weight*l.reps;
          if(l.weight && l.weight > maxWeight) maxWeight = l.weight; if(l.time) totalTime += l.time; });
        const setTimerState = setTimers[key];
        const animPlaying = userSettings.autoAnimPlay ? 'playing' : '';
        return `<div class="exercise-card ${isDone?'done':''} ${collapsed?'collapsed':''}" data-key="${key}">
          <div class="ex-compact-header" onclick="toggleCollapse('${key}',event)">
            <div class="ex-check-inline" onclick="toggleExercise('${dayKey}',${originalIndex},event)"><span class="check-box ${isDone?'checked':''}"></span></div>
            <div class="ex-num">${formatNum(originalIndex+1)}</div>
            <div class="ex-name-compact">${escapeHtml(ex.name)}</div>
            ${isDone?'<span class="ex-done-badge">✓ انجام شد</span>':''}
            <button class="collapse-toggle" onclick="toggleCollapse('${key}',event)">${collapsed?'▼':'▲'}</button>
          </div>
          <div class="ex-expandable"><div class="ex-expandable-inner">
            <div class="ex-anim ${animPlaying}" id="anim-${key}">
              <div class="frames">${hasImg ? `<img class="frame frame-start" src="${imgStart}" loading="lazy" onerror="handleImgError(this,'${key}')">` : ''}${hasImg ? `<img class="frame frame-end" src="${imgEnd}" loading="lazy" onerror="handleImgError(this,'${key}')">` : ''}</div>
              <div class="svg-fallback">${A[ex.anim]||A.squat}</div>
              <div class="frame-labels"><span class="lbl">▶ شروع</span><span class="lbl lbl-end">◀ پایان</span></div>
              <div class="anim-controls"><button class="anim-btn ${userSettings.autoAnimPlay?'active':''}" onclick="toggleAnim('${key}',this)">${userSettings.autoAnimPlay?'⏸':'▶'}</button></div>
              <div class="ex-en-name">${escapeHtml(ex.en||'')}</div>
              <div class="ex-gif-overlay" style="top:auto;bottom:44px;right:10px;">
                <span class="ex-badge badge-sets">${formatNum(ex.sets)} ست</span>
                <span class="ex-badge badge-reps">${escapeHtml(ex.reps)}</span>
                <span class="ex-badge badge-rpe">RPE ${escapeHtml(ex.rpe)}</span>
              </div>
            </div>
            <div class="ex-body">
              <div class="ex-meta">
                <div class="meta-item"><div class="meta-val">${formatNum(ex.sets)}</div><div class="meta-lbl">ست</div></div>
                <div class="meta-item"><div class="meta-val">${escapeHtml(ex.reps)}</div><div class="meta-lbl">تکرار</div></div>
                <div class="meta-item"><div class="meta-val">${formatNum(ex.rest)}ث</div><div class="meta-lbl">استراحت</div></div>
              </div>
              <div class="ex-check" onclick="toggleExercise('${dayKey}',${originalIndex},event)">
                <span class="check-box ${isDone?'checked':''}"></span>
                <span class="check-label">${isDone?'انجام شد!':'علامت‌گذاری'}</span>
              </div>
              <div class="rest-timer">
                <span style="font-size:.82rem;color:var(--text-secondary)">⏱️ استراحت:</span>
                <span class="timer-display" id="display-${key}">${restDisplay}</span>
                <button class="timer-btn ${restRunning?'stop':''}" id="rbtn-${key}" onclick="startRestTimer('${key}',${ex.rest},this)">${restRunning?'توقف':'شروع'}</button>
              </div>
              <div class="set-logger">
                <button class="set-logger-toggle ${loggerOpen?'open':''}" onclick="toggleLogger('${key}')">
                  <span>📝 ثبت وزنه و زمان هر ست</span><span class="arrow">▼</span>
                </button>
                <div class="set-logger-body ${loggerOpen?'open':''}" id="logger-body-${key}">
                  ${renderSetRows(key, ex, logs, setTimerState)}
                  <div class="set-logger-summary">
                    <div class="summary-item"><div class="val">${formatNum(Math.round(totalVol))}</div><div class="lbl">حجم کل (kg)</div></div>
                    <div class="summary-item"><div class="val">${maxWeight>0?formatNum(maxWeight):'—'}</div><div class="lbl">بیشترین</div></div>
                    <div class="summary-item"><div class="val">${totalTime>0?formatTime(totalTime):'—'}</div><div class="lbl">زمان کل</div></div>
                  </div>
                  <div class="set-logger-actions">
                    <button class="mini-btn" onclick="clearLogger('${key}')">🗑️ پاک کردن</button>
                    <button class="mini-btn" onclick="copyLastWeight('${key}')">📋 کپی وزنه ست قبل</button>
                  </div>
                </div>
              </div>
            </div>
          </div></div>
        </div>`;
      }).join('')}</div>
      <div class="day-progress">
        <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        <span class="progress-text">${formatNum(progress)}٪</span>
      </div>`;
    }
    if(showCardioSection){
      html += `<div class="cardio-section">
        <span class="cardio-badge">${day.cardioIcon||'🏃'} کاردیو</span>
        <span class="cardio-text">${escapeHtml(cardioText)}</span>
        <div class="cardio-timer-wrap">
          <div class="cardio-ring ${cRingClass}" id="ring-${dayKey}">
            <svg viewBox="0 0 80 80"><circle class="ring-track" cx="40" cy="40" r="36"/><circle class="ring-progress" cx="40" cy="40" r="36" id="prog-${dayKey}" style="stroke-dashoffset:${cRingOffset}"/></svg>
            <div class="time-text" id="ctime-${dayKey}">${formatTime(cRemaining)}</div>
          </div>
          <div class="cardio-controls">
            <input type="number" class="cardio-input" id="cinput-${dayKey}" value="${cMins}" min="1" max="90" onchange="resetCardioTimer('${dayKey}')">
            <span class="cardio-unit">دقیقه</span>
            <button class="cardio-btn ${cBtnClass}" id="cbtn-${dayKey}" onclick="toggleCardioTimer('${dayKey}',this)">${cBtnLabel}</button>
            <button class="cardio-btn reset" onclick="resetCardioTimer('${dayKey}')">🔄</button>
          </div>
        </div>
      </div>`;
    }
    if(!hasExercises && !showCardioSection){
      html += `<div class="empty-state" style="padding:30px"><div class="icon">📭</div><div>هیچ محتوایی برای این روز تعریف نشده — روی ➕ در ویرایش برنامه بزنید</div></div>`;
    }
    html += `</div>`;
  });
  container.innerHTML = html || '<div class="empty-state"><div class="icon">🔍</div><div>نتیجه‌ای یافت نشد</div></div>';
  updateStats(); restartGlobalTicker();
  setTimeout(setupExerciseObserver, 120);
}

function renderSetRows(key, ex, logs, setTimerState){
  const activeIdx = setTimerState ? setTimerState.activeSetIndex : -1;
  const isRunning = setTimerState && setTimerState.running;
  const elapsed = setTimerState ? getSetElapsed(key) : 0;
  let lastWeight = '';
  for(let i=logs.length-1; i>=0; i--){ if(logs[i] && logs[i].weight){ lastWeight = logs[i].weight; break; } }
  let rows = `<div class="set-row header"><div>ست</div><div>وزنه</div><div>تکرار</div><div>زمان</div><div></div></div>`;
  for(let i=0; i<ex.sets; i++){
    const log = logs[i] || {};
    const wVal = log.weight != null ? log.weight : '';
    const rVal = log.reps != null ? log.reps : '';
    const timeSec = (i === activeIdx) ? elapsed : (log.time || 0);
    const timeStr = timeSec > 0 ? formatTime(timeSec) : '00:00';
    const isActive = i === activeIdx;
    const timeClass = isActive ? (isRunning?'running':'done') : (timeSec>0?'done':'');
    const btnClass = isActive ? (isRunning?'running':'done') : '';
    const btnIcon = isActive && isRunning ? '⏸' : (isActive && timeSec>0 ? '🔄' : '▶');
    rows += `<div class="set-row">
      <div class="num">${formatNum(i+1)}</div>
      <input type="number" class="set-input" inputmode="decimal" step="0.5" min="0" placeholder="${lastWeight||'وزنه'}" value="${wVal}" onchange="updateSetValue('${key}',${i},'weight',this.value)">
      <input type="number" class="set-input" inputmode="numeric" min="0" placeholder="تکرار" value="${rVal}" onchange="updateSetValue('${key}',${i},'reps',this.value)">
      <div class="set-time-display ${timeClass}" id="settime-${key}-${i}">${timeStr}</div>
      <button class="set-timer-btn ${btnClass}" id="setbtn-${key}-${i}" onclick="toggleSetTimer('${key}',${i},this)">${btnIcon}</button>
    </div>`;
  }
  return rows;
}

function handleImgError(img,key){ const w = document.getElementById(`anim-${key}`); if(w) w.classList.add('fallback'); }
function toggleAnim(key,btn){ const w = document.getElementById(`anim-${key}`); if(!w) return;
  const playing = w.classList.toggle('playing'); btn.textContent = playing ? '⏸' : '▶'; btn.classList.toggle('active', playing); }

function toggleCollapse(key,event){
  if(event){ event.preventDefault(); event.stopPropagation(); }
  const card = document.querySelector(`.exercise-card[data-key="${key}"]`); if(!card) return;
  const willCollapse = !card.classList.contains('collapsed');
  collapsedExercises[key] = willCollapse ? 'collapsed' : 'expanded';
  card.classList.toggle('collapsed', willCollapse);
  const toggle = card.querySelector('.collapse-toggle');
  if(toggle) toggle.textContent = willCollapse ? '▼' : '▲';
  saveAppState();
  if(!willCollapse && userSettings.scrollSnapEnabled && window.matchMedia('(max-width:768px)').matches){
    setTimeout(()=>{ try{ card.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){} }, 80);
  }
}

function toggleLogger(key){
  openLoggers[key] = !openLoggers[key];
  const body = document.getElementById(`logger-body-${key}`);
  const toggle = body ? body.previousElementSibling : null;
  if(body){ body.classList.toggle('open', openLoggers[key]); if(toggle) toggle.classList.toggle('open', openLoggers[key]); }
  saveAppState();
}

function updateSetValue(key,setIdx,field,value){
  if(!exerciseLogs[key]) exerciseLogs[key] = [];
  if(!exerciseLogs[key][setIdx]) exerciseLogs[key][setIdx] = { weight:null, reps:null, time:0 };
  exerciseLogs[key][setIdx][field] = value === '' ? null : Number(value);
  saveAppState(); updateExerciseSummary(key);
}

function updateExerciseSummary(key){
  const logs = exerciseLogs[key] || [];
  const body = document.getElementById(`logger-body-${key}`); if(!body) return;
  let tv = 0, mw = 0, tt = 0;
  logs.forEach(l=>{ if(l && l.weight && l.reps) tv += l.weight*l.reps;
    if(l && l.weight && l.weight > mw) mw = l.weight; if(l && l.time) tt += l.time; });
  const summary = body.querySelector('.set-logger-summary'); if(!summary) return;
  summary.innerHTML = `<div class="summary-item"><div class="val">${formatNum(Math.round(tv))}</div><div class="lbl">حجم کل (kg)</div></div>
    <div class="summary-item"><div class="val">${mw>0?formatNum(mw):'—'}</div><div class="lbl">بیشترین</div></div>
    <div class="summary-item"><div class="val">${tt>0?formatTime(tt):'—'}</div><div class="lbl">زمان کل</div></div>`;
  updateStats();
}

function clearLogger(key){
  if(!confirm('اطلاعات این حرکت پاک شود؟')) return;
  exerciseLogs[key] = []; if(setTimers[key]) delete setTimers[key];
  saveAppState(); renderDays();
}

function copyLastWeight(key){
  const parts = key.split('-'); const dayKey = parts[0]; const exIdx = parseInt(parts[1],10);
  const day = workoutData[dayKey]; if(!day) return;
  const ex = day.exercises[exIdx]; if(!ex) return;
  const numSets = ex.sets;
  if(!exerciseLogs[key]) exerciseLogs[key] = [];
  const logs = exerciseLogs[key];
  let lastW = null, lastR = null, lastIdx = -1;
  for(let i = Math.max(logs.length-1, numSets-1); i>=0; i--){
    if(logs[i] && logs[i].weight != null){ lastW = logs[i].weight; lastR = logs[i].reps; lastIdx = i; break; }
  }
  if(lastW === null){ showToast('ابتدا وزنه یک ست را وارد کنید', 'warn'); return; }
  let filled = 0;
  for(let i=0; i<numSets; i++){
    if(!logs[i]) logs[i] = { weight:null, reps:null, time:0 };
    if(i === lastIdx) continue;
    if(logs[i].weight == null){ logs[i].weight = lastW; if(logs[i].reps == null && lastR != null) logs[i].reps = lastR; filled++; }
  }
  saveAppState(); renderDays();
  if(filled === 0) showToast('همه ست‌ها پر هستند', 'info');
  else showToast(`${formatNum(filled)} ست خالی با ${formatNum(lastW)} kg پر شد`, 'success');
}

function toggleSetTimer(key,setIdx,btn){
  let st = setTimers[key];
  if(st && st.running && st.activeSetIndex === setIdx){
    st.elapsed = getSetElapsed(key); st.running = false; st.startedAt = null;
    saveAppState(); updateSetTimerUI(key,setIdx); return;
  }
  if(st && !st.running && st.activeSetIndex === setIdx && (st.elapsed||0) > 0){
    st.startedAt = Date.now(); st.running = true;
    saveAppState(); updateSetTimerUI(key,setIdx); return;
  }
  if(st && st.activeSetIndex !== setIdx && st.activeSetIndex >= 0){
    const prevIdx = st.activeSetIndex; const prevElapsed = getSetElapsed(key);
    if(prevElapsed > 0){
      if(!exerciseLogs[key]) exerciseLogs[key] = [];
      if(!exerciseLogs[key][prevIdx]) exerciseLogs[key][prevIdx] = { weight:null, reps:null, time:0 };
      exerciseLogs[key][prevIdx].time = prevElapsed;
    }
  }
  setTimers[key] = { activeSetIndex: setIdx, startedAt: Date.now(), elapsed: 0, running: true };
  saveAppState(); renderDays();
  setTimeout(()=>updateSetTimerUI(key,setIdx), 20);
}

function updateSetTimerUI(key,setIdx){
  const st = setTimers[key]; if(!st || st.activeSetIndex !== setIdx) return;
  const timeEl = document.getElementById(`settime-${key}-${setIdx}`);
  const btn = document.getElementById(`setbtn-${key}-${setIdx}`);
  const elapsed = getSetElapsed(key); const running = st.running;
  if(timeEl){ timeEl.textContent = formatTime(elapsed); timeEl.classList.remove('running','done');
    if(running) timeEl.classList.add('running'); else if(elapsed>0) timeEl.classList.add('done'); }
  if(btn){ btn.classList.remove('running','done');
    if(running){ btn.textContent = '⏸'; btn.classList.add('running'); }
    else if(elapsed>0){ btn.textContent = '▶'; btn.classList.add('done'); }
    else { btn.textContent = '▶'; } }
}

function toggleExercise(dayKey,index,event){
  if(event){ event.preventDefault(); event.stopPropagation(); }
  const key = `${dayKey}-${index}`;
  const wasDone = !!completedExercises[key];
  completedExercises[key] = !wasDone;
  if(!wasDone && completedExercises[key]) delete collapsedExercises[key];
  else if(wasDone && !completedExercises[key]) collapsedExercises[key] = 'expanded';
  saveAppState(); renderDays(); updateChart();
}

/* ============ Rest timer ============ */
function startRestTimer(key,seconds,btn){
  let st = activeTimers[key];
  if(st && st.running){
    st.remaining = getRemaining(st); st.running = false; st.endTimestamp = null;
    if(btn){ btn.textContent='شروع'; btn.classList.remove('stop'); }
    saveAppState(); return;
  }
  if(!st || st.remaining <= 0) st = activeTimers[key] = { total:seconds, remaining:seconds, running:false, endTimestamp:null };
  st.running = true; st.endTimestamp = Date.now() + st.remaining*1000;
  if(btn){ btn.textContent='توقف'; btn.classList.add('stop'); }
  saveAppState();
}
function updateRestDisplay(key){
  const st = activeTimers[key]; if(!st) return;
  const remaining = getRemaining(st);
  const display = document.getElementById(`display-${key}`);
  const btn = document.getElementById(`rbtn-${key}`);
  if(display) display.textContent = remaining > 0 ? (formatNum(remaining)+'ث') : '✅';
  if(btn){ if(st.running){ btn.textContent='توقف'; btn.classList.add('stop'); } else { btn.textContent='شروع'; btn.classList.remove('stop'); } }
}

/* ============ Cardio ============ */
function toggleCardioTimer(dayKey,btn){
  let state = cardioTimers[dayKey];
  if(state && state.running){
    state.remaining = getRemaining(state); state.running = false; state.endTimestamp = null;
    if(btn){ btn.textContent='▶ ادامه'; btn.classList.remove('pause'); btn.classList.add('start'); }
    const ring = document.getElementById(`ring-${dayKey}`); if(ring) ring.classList.remove('running');
    saveAppState(); return;
  }
  if(!state || state.remaining <= 0){
    const inp = document.getElementById(`cinput-${dayKey}`);
    const mins = Math.max(1, Math.min(90, parseInt(inp ? inp.value : 0) || userSettings.defaultCardioMinutes));
    state = cardioTimers[dayKey] = { total:mins*60, remaining:mins*60, running:false, endTimestamp:null };
  }
  state.running = true; state.endTimestamp = Date.now() + state.remaining*1000;
  if(btn){ btn.textContent='⏸ توقف'; btn.classList.remove('start'); btn.classList.add('pause'); }
  const ring = document.getElementById(`ring-${dayKey}`); if(ring){ ring.classList.add('running'); ring.classList.remove('done'); }
  saveAppState();
}
function resetCardioTimer(dayKey){
  const inp = document.getElementById(`cinput-${dayKey}`);
  const mins = Math.max(1, Math.min(90, parseInt(inp ? inp.value : 0) || userSettings.defaultCardioMinutes));
  cardioTimers[dayKey] = { total:mins*60, remaining:mins*60, running:false, endTimestamp:null };
  const ring = document.getElementById('ring-'+dayKey); const prog = document.getElementById('prog-'+dayKey);
  const timeEl = document.getElementById('ctime-'+dayKey); const btn = document.getElementById('cbtn-'+dayKey);
  if(ring) ring.classList.remove('running','done');
  if(prog) prog.style.strokeDashoffset = 0;
  if(timeEl) timeEl.textContent = formatTime(mins*60);
  if(btn){ btn.textContent='▶ شروع'; btn.classList.remove('pause'); btn.classList.add('start'); }
  saveAppState();
}
function updateCardioDisplay(dayKey){
  const state = cardioTimers[dayKey]; if(!state) return;
  const remaining = getRemaining(state);
  const timeEl = document.getElementById(`ctime-${dayKey}`); if(timeEl) timeEl.textContent = formatTime(remaining);
  const prog = document.getElementById(`prog-${dayKey}`);
  if(prog){ const pct = Math.max(0, remaining/state.total); prog.style.strokeDashoffset = 226*(1-pct); }
}

/* ============ Sound ============ */
function playBeep(freqs){
  if(userSettings.vibrationEnabled && navigator.vibrate){ try{ navigator.vibrate([200,80,200,80,200,80,400]); }catch(e){} }
  if(!userSettings.soundEnabled) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const vol = Math.min(1, userSettings.soundVolume || 0.7);
    const wave = userSettings.alarmWave || 'square';
    const repeat = Math.max(1, userSettings.alarmRepeat || 3);
    const baseFreqs = freqs && freqs.length ? freqs : [880,1046,1318];
    const pattern = [];
    for(let r=0; r<repeat; r++) baseFreqs.forEach(f=>pattern.push(f));
    pattern.forEach((freq,i)=>{
      setTimeout(()=>{
        try{
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = wave; o.connect(g); g.connect(ctx.destination);
          o.frequency.value = freq;
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
          o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42); o.stop(ctx.currentTime + 0.46);
        }catch(e){}
      }, i*260);
    });
  }catch(e){}
}

function restartGlobalTicker(){
  clearInterval(globalTicker);
  globalTicker = setInterval(()=>{
    Object.keys(cardioTimers).forEach(k=>{
      const st = cardioTimers[k]; if(!st) return;
      const remaining = getRemaining(st);
      if(st.running && remaining <= 0){
        st.remaining = 0; st.running = false; st.endTimestamp = null;
        const ring = document.getElementById(`ring-${k}`); const btn = document.getElementById(`cbtn-${k}`);
        if(ring){ ring.classList.remove('running'); ring.classList.add('done'); }
        if(btn){ btn.textContent='▶ شروع'; btn.classList.remove('pause'); btn.classList.add('start'); }
        playBeep([880,1046,1318]); showToast('کاردیو به پایان رسید! 🎉', 'success'); saveAppState();
      }
      updateCardioDisplay(k);
    });
    Object.keys(activeTimers).forEach(k=>{
      const st = activeTimers[k]; if(!st) return;
      const remaining = getRemaining(st);
      if(st.running && remaining <= 0){
        st.remaining = 0; st.running = false; st.endTimestamp = null;
        playBeep([880]); updateRestDisplay(k); saveAppState(); return;
      }
      updateRestDisplay(k);
    });
    Object.keys(setTimers).forEach(k=>{
      const st = setTimers[k]; if(!st || !st.running) return;
      updateSetTimerUI(k, st.activeSetIndex);
    });
  }, 500);
}

/* ============ Stats ============ */
function updateStats(){
  let total=0, done=0, volume=0;
  Object.keys(workoutData).forEach(d=>{
    workoutData[d].exercises.forEach((_,i)=>{
      total++; if(completedExercises[`${d}-${i}`]) done++;
      const logs = exerciseLogs[`${d}-${i}`] || [];
      logs.forEach(l=>{ if(l && l.weight && l.reps) volume += l.weight*l.reps; });
    });
  });
  document.getElementById('statExercises').textContent = formatNum(total);
  document.getElementById('statDone').textContent = formatNum(done);
  document.getElementById('statProgress').textContent = total ? formatNum(Math.round(done/total*100))+'٪' : '۰٪';
  document.getElementById('statVolume').textContent = formatNum(Math.round(volume));
}

/* ============ Chart ============ */
function switchChartRange(range){
  chartRange = range;
  document.querySelectorAll('.chart-tab').forEach(t=>t.classList.toggle('active', t.dataset.range === range));
  updateChart();
}
function getChartData(range){
  const today = new Date();
  const labels = [], data = [], colors = [];
  const jsToIndex = { 6:0, 0:1, 1:2, 2:3, 3:4, 4:5, 5:6 };
  const dayNames = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  if(range === 'week'){
    const start = getWeekStart(today);
    const programWeekdays = new Set(userProgram.days.map(d => d.weekday).filter(w => w != null));
    for(let i = 0; i < 7; i++){
      const d = new Date(start); d.setDate(d.getDate() + i);
      const jsDay = d.getDay();
      if(!programWeekdays.has(jsDay)) continue;
      const key = dateKey(d);
      labels.push(dayNames[jsToIndex[jsDay]]);
      const rec = history[key]; data.push(rec ? rec.completed : 0);
      const isToday = dateKey(d) === dateKey(today);
      colors.push(isToday ? 'rgba(16,185,129,.9)' : 'rgba(59,130,246,.75)');
    }
  } else if(range === 'month'){
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const monthEnd = new Date(year, month + 1, 0);
    const totalDays = monthEnd.getDate();
    let weekNum = 1;
    for(let startDay = 1; startDay <= totalDays; startDay += 7){
      const endDay = Math.min(startDay + 6, totalDays);
      let sum = 0;
      for(let day = startDay; day <= endDay; day++){ const dk = dateKey(new Date(year, month, day)); sum += history[dk]?.completed || 0; }
      labels.push(`هفته ${weekNum}`); data.push(sum); colors.push('rgba(168,85,247,.75)');
      weekNum++;
    }
  } else if(range === 'year'){
    const todayJ = toJalali(today.getFullYear(), today.getMonth()+1, today.getDate());
    const currentJYear = todayJ[0];
    const monthlyData = new Array(12).fill(0);
    Object.keys(history).forEach(dk => {
      const [y, m, d] = dk.split('-').map(Number);
      const [jy, jm] = toJalali(y, m, d);
      if(jy === currentJYear){ monthlyData[jm - 1] += (history[dk].completed || 0); }
    });
    JALALI_MONTHS.forEach((name, i) => { labels.push(name); data.push(monthlyData[i]); colors.push('rgba(16,185,129,.75)'); });
  }
  return { labels, data, colors };
}
function updateChart(){
  const { labels, data, colors } = getChartData(chartRange);
  const canvas = document.getElementById('progressChart'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if(chartInstance) chartInstance.destroy();
  const isDark = document.documentElement.getAttribute('data-theme')!=='light';
  let maxVal = Math.max(5, ...data);
  if(chartRange === 'week') maxVal = Math.max(maxVal, 10);
  chartInstance = new Chart(ctx, { type:'bar',
    data:{ labels, datasets:[{ label:'حرکات انجام‌شده', data, backgroundColor:colors, borderRadius:10, barThickness: chartRange==='year' ? 16 : 36 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ rtl:true, textDirection:'rtl',
        backgroundColor:isDark?'#1e293b':'#fff', titleColor:isDark?'#f1f5f9':'#0f172a',
        bodyColor:isDark?'#94a3b8':'#475569', padding:12, cornerRadius:10 } },
      scales:{ y:{ beginAtZero:true, suggestedMax:maxVal, grid:{ color:isDark?'rgba(148,163,184,.08)':'rgba(148,163,184,.15)' },
        ticks:{ color:isDark?'#64748b':'#94a3b8', font:{family:'Vazirmatn',size:11}, stepSize: chartRange==='year' ? undefined : 2 } },
        x:{ grid:{display:false}, ticks:{ color:isDark?'#94a3b8':'#475569', font:{family:'Vazirmatn',weight:'600',size: chartRange==='year'?9:11} } } }
    }
  });
  const statsEl = document.getElementById('chartStats');
  if(statsEl){
    const total = data.reduce((s,v)=>s+v,0);
    const avg = data.length ? (total / data.length).toFixed(1) : 0;
    const peak = data.length ? Math.max(...data) : 0;
    const labelsMap = { week:'این هفته', month:'این ماه', year:'امسال' };
    statsEl.innerHTML = `
      <div class="chart-stat"><div class="val">${formatNum(total)}</div><div class="lbl">مجموع ${labelsMap[chartRange]}</div></div>
      <div class="chart-stat"><div class="val">${formatNum(avg)}</div><div class="lbl">میانگین</div></div>
      <div class="chart-stat"><div class="val">${formatNum(peak)}</div><div class="lbl">بیشترین</div></div>`;
  }
}

/* ============ RPE ============ */
function calcRPE(){
  const w=parseFloat(document.getElementById('rpeWeight').value);
  const r=parseInt(document.getElementById('rpeReps').value);
  const rm=parseFloat(document.getElementById('rpe1rm').value);
  const el=document.getElementById('rpeResult');
  if(!w||!r||!rm||rm<=0){ el.style.display='block'; el.innerHTML='⚠️ همه مقادیر را وارد کنید.'; return; }
  const pct=(w/rm)*100;
  let rpe; if(pct>=100)rpe=10; else if(pct>=95)rpe=9.5; else if(pct>=90)rpe=9;
  else if(pct>=85)rpe=8.5; else if(pct>=80)rpe=8; else if(pct>=75)rpe=7.5;
  else if(pct>=70)rpe=7; else if(pct>=65)rpe=6.5; else if(pct>=60)rpe=6; else rpe=5;
  const color=rpe>=9?'#f43f5e':(rpe>=7.5?'#f59e0b':'#10b981');
  el.style.display='block';
  el.innerHTML=`RPE تقریبی: <span style="color:${color}">${formatNum(rpe)}</span><br><small>${formatNum(pct.toFixed(1))}٪ از 1RM</small>`;
}

/* ============ Theme ============ */
function toggleTheme(){
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  html.setAttribute('data-theme', isLight?'dark':'light');
  document.getElementById('themeToggle').innerHTML = `<span class="btn-icon">${isLight?'🌙':'☀️'}</span><span class="btn-label">تم</span>`;
  const mIcon = document.getElementById('mobileThemeIcon');
  if(mIcon) mIcon.textContent = isLight?'🌙':'☀️';
  saveAppState(); updateChart();
  if(document.getElementById('bodyDrawer').classList.contains('open') && typeof updateBodyChart === 'function') updateBodyChart();
}

/* ============ Exercise Observer (mobile focus mode) ============ */
function setupExerciseObserver(){
  if(exerciseObserver){ exerciseObserver.disconnect(); exerciseObserver = null; }
  if(!userSettings.scrollSnapEnabled || !userSettings.autoOpenLogger) return;
  if(!window.matchMedia('(max-width:768px)').matches) return;
  const cards = document.querySelectorAll('.exercise-card');
  if(cards.length === 0) return;
  exerciseObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const card = entry.target;
      const key = card.dataset.key;
      if(!key) return;
      if(card.classList.contains('collapsed')) return;
      const body = document.getElementById(`logger-body-${key}`);
      const toggle = body ? body.previousElementSibling : null;
      if(!body) return;
      if(entry.intersectionRatio > 0.55){
        if(!openLoggers[key]){
          openLoggers[key] = true;
          body.classList.add('open');
          if(toggle) toggle.classList.add('open');
        }
      } else if(entry.intersectionRatio < 0.25){
        if(openLoggers[key]){
          openLoggers[key] = false;
          body.classList.remove('open');
          if(toggle) toggle.classList.remove('open');
        }
      }
    });
  }, { threshold: [0, 0.25, 0.55, 0.9], rootMargin: '-5% 0px -5% 0px' });
  cards.forEach(c => exerciseObserver.observe(c));
}