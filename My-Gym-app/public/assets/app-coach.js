/* ============================================================
   app-coach.js — پنل مربی: شاگردان، پیشرفت، یادداشت، ویرایش
   ============================================================ */

let coachViewingStudentId = null;
let coachStudentsCache = [];

function openCoachPanel() {
  document.getElementById('coachBackdrop').classList.add('open');
  document.getElementById('coachPanel').classList.add('open');
  switchCoachTab('students');
  renderCoachStudents();
}

function closeCoachPanel() {
  document.getElementById('coachBackdrop').classList.remove('open');
  document.getElementById('coachPanel').classList.remove('open');
  coachViewingStudentId = null;
  document.getElementById('coachDetailTab').style.display = 'none';
}

function switchCoachTab(tab) {
  document.querySelectorAll('.drawer-tab[data-ctab]').forEach(t => t.classList.toggle('active', t.dataset.ctab === tab));
  document.getElementById('ctab-students').classList.toggle('active', tab === 'students');
  document.getElementById('ctab-detail').classList.toggle('active', tab === 'detail');
}

async function renderCoachStudents() {
  const el = document.getElementById('coachStudentsList');
  el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⏳</div><div>در حال بارگذاری...</div></div>';
  try {
    coachStudentsCache = await api.coachStudents();
  } catch (e) {
    el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⚠️</div><div>خطا در بارگذاری</div></div>';
    return;
  }
  if (!coachStudentsCache.length) {
    el.innerHTML = `
      <div class="empty-state" style="padding:40px">
        <div class="icon">👥</div>
        <div style="margin-bottom:16px">هنوز شاگردی ندارید</div>
      </div>
      <button class="add-user-btn" onclick="showCoachNewStudentForm()"><span>➕</span><span>افزودن شاگرد جدید</span></button>`;
    return;
  }
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-weight:800;font-size:.9rem">👥 ${coachStudentsCache.length} شاگرد</div>
      <button class="btn primary" onclick="showCoachNewStudentForm()">➕ شاگرد جدید</button>
    </div>
    ${coachStudentsCache.map(s => `
      <div class="user-card" style="cursor:pointer;margin-bottom:10px" onclick="openStudentDetail('${s.id}')">
        <div class="user-avatar" style="background:${s.color}">${s.emoji}</div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(s.displayName)}</div>
          <div class="user-meta">@${escapeHtml(s.username)} · ${s.stats.sessions7} جلسه این هفته · ${s.stats.volume7.toLocaleString('fa-IR')} kg</div>
        </div>
        <div style="text-align:left;font-size:.7rem;color:var(--text-muted)">
          ${s.stats.completedCount} حرکت انجام‌شده
        </div>
      </div>
    `).join('')}
  `;
}

async function openStudentDetail(studentId) {
  coachViewingStudentId = studentId;
  const tab = document.getElementById('coachDetailTab');
  tab.style.display = '';
  switchCoachTab('detail');
  const detailEl = document.getElementById('coachStudentDetail');
  detailEl.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⏳</div><div>در حال بارگذاری...</div></div>';

  try {
    const overview = await api.studentOverview(studentId);
    renderStudentDetail(overview);
  } catch (e) {
    detailEl.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⚠️</div><div>خطا: ' + e.message + '</div></div>';
  }
}

function renderStudentDetail({ student, data, notes }) {
  const state   = data.state   || {};
  const history = data.history || {};
  const program = data.program || { days: [] };
  const nutrition = data.nutrition || null;
  const body = data.body || [];

  // === آمار کلی ===
  const completed = state.completedExercises ? Object.values(state.completedExercises).filter(Boolean).length : 0;
  let volume = 0;
  Object.values(state.exerciseLogs || {}).forEach(arr => (arr||[]).forEach(l => {
    if (l?.weight && l?.reps) volume += l.weight * l.reps;
  }));

  // تاریخچه ۱۴ روزه اخیر
  const now = Date.now();
  const recentDays = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    recentDays.push({ key, label: `${d.getDate()}/${d.getMonth()+1}`, ...(history[key] || { completed: 0, volume: 0 }) });
  }

  // آنالیز خودکار
  const sessions7 = recentDays.slice(-7).filter(d => d.completed > 0).length;
  const sessions14 = recentDays.filter(d => d.completed > 0).length;
  const vol7 = recentDays.slice(-7).reduce((s, d) => s + (d.volume || 0), 0);
  const volPrev7 = recentDays.slice(0, 7).reduce((s, d) => s + (d.volume || 0), 0);
  const volumeChange = volPrev7 > 0 ? ((vol7 - volPrev7) / volPrev7 * 100).toFixed(1) : '—';

  let analysis = [];
  if (sessions7 === 0) analysis.push({ tone: 'warn', text: '⚠️ این هفته هیچ جلسه‌ای ثبت نشده' });
  else if (sessions7 < 3) analysis.push({ tone: 'warn', text: `📉 فقط ${sessions7} جلسه در هفته — کمتر از حد مطلوب` });
  else if (sessions7 >= 5) analysis.push({ tone: 'good', text: `🔥 ${sessions7} جلسه در هفته — پایبندی عالی` });
  else analysis.push({ tone: 'ok', text: `✅ ${sessions7} جلسه در هفته — در محدوده مطلوب` });

  if (volPrev7 > 0) {
    const change = (vol7 - volPrev7) / volPrev7 * 100;
    if (change > 10) analysis.push({ tone: 'good', text: `📈 حجم تمرین ${change.toFixed(1)}٪ رشد` });
    else if (change < -10) analysis.push({ tone: 'warn', text: `📉 حجم تمرین ${Math.abs(change).toFixed(1)}٪ کاهش` });
    else analysis.push({ tone: 'ok', text: `➡️ حجم تمرین تقریباً ثابت (${change > 0 ? '+' : ''}${change.toFixed(1)}٪)` });
  }

  // چک روزهای برنامه که انجام نشده
  const programDays = program.days || [];
  const daysThisWeek = programDays.filter(d => d.weekday != null).length;
  if (daysThisWeek > 0 && sessions7 < daysThisWeek) {
    analysis.push({ tone: 'warn', text: `📅 ${daysThisWeek - sessions7} روز از برنامه هفته جاری انجام نشده` });
  }

  // === HTML ===
  const el = document.getElementById('coachStudentDetail');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:linear-gradient(135deg,rgba(59,130,246,.1),rgba(168,85,247,.06));border-radius:14px;margin-bottom:16px">
      <div style="width:52px;height:52px;border-radius:50%;background:${student.color};display:flex;align-items:center;justify-content:center;font-size:1.5rem">${student.emoji}</div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:1rem">${escapeHtml(student.displayName)}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">@${escapeHtml(student.username)}</div>
      </div>
      <button class="btn primary" onclick="enterStudentMode('${student.id}')" title="ویرایش برنامه و تغذیه شاگرد">✏️ ویرایش برنامه شاگرد</button>
    </div>

    <div class="section-title-nut">📊 آمار کلی</div>
    <div class="nutrition-summary" style="grid-template-columns:repeat(4,1fr)">
      <div class="ns-item"><div class="ns-val">${completed.toLocaleString('fa-IR')}</div><div class="ns-lbl">حرکت انجام‌شده</div></div>
      <div class="ns-item"><div class="ns-val">${Math.round(volume).toLocaleString('fa-IR')}</div><div class="ns-lbl">حجم کل (kg)</div></div>
      <div class="ns-item"><div class="ns-val">${sessions7}</div><div class="ns-lbl">جلسات هفته</div></div>
      <div class="ns-item"><div class="ns-val">${volumeChange === '—' ? '—' : volumeChange + '٪'}</div><div class="ns-lbl">تغییر حجم</div></div>
    </div>

    <div class="section-title-nut" style="margin-top:16px">🧠 آنالیز خودکار</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${analysis.map(a => {
        const bg = a.tone === 'good' ? 'rgba(16,185,129,.12)' : a.tone === 'warn' ? 'rgba(245,158,11,.12)' : 'rgba(59,130,246,.12)';
        const bc = a.tone === 'good' ? 'rgba(16,185,129,.3)' : a.tone === 'warn' ? 'rgba(245,158,11,.3)' : 'rgba(59,130,246,.3)';
        return `<div style="padding:10px 14px;border-radius:10px;background:${bg};border:1px solid ${bc};font-size:.83rem;font-weight:600">${a.text}</div>`;
      }).join('')}
    </div>

    <div class="section-title-nut" style="margin-top:16px">📈 نمودار ۱۴ روزه</div>
    <div class="bm-chart-section" style="margin-bottom:16px">
      <canvas id="coachStudentChart" height="180"></canvas>
    </div>

    <div class="section-title-nut" style="margin-top:16px">🗓️ برنامه فعلی (${programDays.length} روز)</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
      ${programDays.length === 0 ? '<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:.8rem">برنامه‌ای تعریف نشده</div>'
        : programDays.map(d => `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-secondary);border-radius:10px;font-size:.8rem">
            <span>${d.icon || '💪'}</span>
            <strong style="flex:1">${escapeHtml(d.name)}</strong>
            <span style="color:var(--text-muted);font-size:.72rem">${(d.exercises||[]).length} حرکت</span>
          </div>`).join('')}
    </div>

    <div class="section-title-nut" style="margin-top:16px">📝 یادداشت‌های مربی</div>
    <div style="margin-bottom:12px">
      <textarea id="coachNoteInput" class="form-input" style="min-height:80px;font-family:inherit" placeholder="یادداشت آنالیز، پیشنهاد، نکته تمرینی..."></textarea>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn primary" onclick="addCoachNote('${student.id}')">💾 ثبت یادداشت</button>
      </div>
    </div>
    <div id="coachNotesList">
      ${notes.length === 0 ? '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:.8rem">هنوز یادداشتی نیست</div>'
        : notes.map(n => {
          const d = new Date(n.created_at);
          const dateStr = d.toLocaleDateString('fa-IR');
          return `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:.7rem;color:var(--accent-green);font-weight:700">📅 ${dateStr}</span>
              <button class="bm-entry-del" onclick="deleteCoachNote(${n.id},'${student.id}')">🗑️</button>
            </div>
            <div style="font-size:.83rem;line-height:1.7">${escapeHtml(n.content)}</div>
          </div>`;
        }).join('')}
    </div>
  `;

  // رسم نمودار
  const ctx = document.getElementById('coachStudentChart');
  if (ctx && window.Chart) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: recentDays.map(d => d.label),
        datasets: [{
          label: 'حجم (kg)',
          data: recentDays.map(d => d.volume || 0),
          backgroundColor: recentDays.map(d => d.completed > 0 ? 'rgba(16,185,129,.7)' : 'rgba(148,163,184,.15)'),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#64748b', font: { family: 'Vazirmatn' } } },
          x: { ticks: { color: '#94a3b8', font: { family: 'Vazirmatn', size: 9 } } }
        }
      }
    });
  }
}

async function addCoachNote(studentId) {
  const input = document.getElementById('coachNoteInput');
  const content = input.value.trim();
  if (!content) { showToast('یادداشت خالی است', 'warn'); return; }
  try {
    await api.addNote(studentId, content);
    showToast('یادداشت ثبت شد ✓', 'success');
    input.value = '';
    openStudentDetail(studentId);
  } catch (e) {
    showToast('خطا در ثبت', 'warn');
  }
}

async function deleteCoachNote(noteId, studentId) {
  if (!confirm('این یادداشت حذف شود؟')) return;
  try {
    await api.deleteNote(noteId);
    openStudentDetail(studentId);
  } catch (e) { showToast('خطا', 'warn'); }
}

/* ---------- ورود مربی به حالت ویرایش شاگرد ---------- */
async function enterStudentMode(studentId) {
  if (!confirm('حالت ویرایش شاگرد فعال شود؟ تمام تغییرات روی برنامه و داده‌های شاگرد اعمال می‌شود.')) return;
  closeCoachPanel();

  // ذخیره مربی فعلی
  window.__coachOrigin = authCurrentUser;

  // گرفتن اطلاعات شاگرد
  let student;
  try {
    const overview = await api.studentOverview(studentId);
    student = overview.student;
  } catch (e) { showToast('خطا', 'warn'); return; }

  // تغییر به کاربر شاگرد
  authCurrentUser = student;
  currentUserId = student.id;
  users = [{
    id: student.id, name: student.displayName, emoji: student.emoji, color: student.color,
    role: student.role, username: student.username, passwordHash: '', createdAt: student.createdAt
  }];

  await window.syncPullAll(student.id);

  // پاک کردن حالت قبلی
  completedExercises = {}; collapsedExercises = {}; activeTimers = {}; cardioTimers = {};
  exerciseLogs = {}; setTimers = {}; openLoggers = {}; workoutData = {}; history = {};
  loadSettings(); loadExerciseBank(); loadUserProgram(); loadHistory();
  if (typeof loadNutritionData === 'function') loadNutritionData();
  if (typeof loadBodyData === 'function') loadBodyData();
  rebuildWorkoutData();
  restoreAppState();
  updateUserButton();

  // نمایش بنر حالت مربی
  showCoachModeBanner(student);

  const todayKey = markTodayButton();
  currentDay = todayKey || 'all';
  renderDayNav(); renderDays(); updateChart();
  showToast(`حالت مربی: در حال ویرایش «${student.displayName}»`, 'info', 5000);
}

function showCoachModeBanner(student) {
  let banner = document.getElementById('coachModeBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'coachModeBanner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:10px 20px;display:flex;align-items:center;gap:12px;font-weight:700;box-shadow:0 4px 12px rgba(245,158,11,.4)';
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    <span style="font-size:1.2rem">👨‍🏫</span>
    <span style="flex:1;font-size:.88rem">حالت مربی — ویرایش شاگرد: <strong>${escapeHtml(student.displayName)}</strong></span>
    <button style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:800" onclick="exitStudentMode()">🚪 خروج از حالت مربی</button>
  `;
  document.body.style.paddingTop = '50px';
}

async function exitStudentMode() {
  window.__flushPush && await window.__flushPush();
  window.syncClearCurrent();
  authCurrentUser = window.__coachOrigin;
  currentUserId = authCurrentUser.id;
  users = [{
    id: authCurrentUser.id, name: authCurrentUser.displayName, emoji: authCurrentUser.emoji,
    color: authCurrentUser.color, role: authCurrentUser.role, username: authCurrentUser.username,
    passwordHash: '', createdAt: authCurrentUser.createdAt
  }];
  await window.syncPullAll(currentUserId);
  completedExercises = {}; collapsedExercises = {}; activeTimers = {}; cardioTimers = {};
  exerciseLogs = {}; setTimers = {}; openLoggers = {}; workoutData = {}; history = {};
  loadSettings(); loadExerciseBank(); loadUserProgram(); loadHistory();
  if (typeof loadNutritionData === 'function') loadNutritionData();
  if (typeof loadBodyData === 'function') loadBodyData();
  rebuildWorkoutData();
  restoreAppState();
  updateUserButton();
  const b = document.getElementById('coachModeBanner'); if (b) b.remove();
  document.body.style.paddingTop = '';
  const todayKey = markTodayButton();
  currentDay = todayKey || 'all';
  renderDayNav(); renderDays(); updateChart();
  showToast('به حساب مربی بازگشتید', 'success');
  openCoachPanel();
}

/* ---------- فرم ایجاد شاگرد جدید توسط مربی ---------- */
function showCoachNewStudentForm() {
  const username = prompt('نام کاربری شاگرد (انگلیسی، مثلاً ali_ahmadi):');
  if (!username) return;
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) { showToast('نام کاربری نامعتبر', 'warn'); return; }
  const displayName = prompt('نام نمایشی شاگرد:');
  if (!displayName) return;
  const password = prompt('رمز عبور (حداقل ۶ کاراکتر):');
  if (!password || password.length < 6) { showToast('رمز حداقل ۶ کاراکتر', 'warn'); return; }

  api.createUser({ username, displayName, password, role: 'student' })
    .then(() => { showToast('شاگرد ساخته شد ✓', 'success'); renderCoachStudents(); })
    .catch(e => {
      const msg = e.data?.error === 'username_taken' ? 'این نام کاربری قبلاً گرفته شده' :
                  e.data?.error === 'invalid_username' ? 'نام کاربری نامعتبر' :
                  'خطا در ساخت کاربر';
      showToast(msg, 'warn');
    });
}