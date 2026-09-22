/* ============================================================
   app-auth.js — احراز هویت، نقش‌ها، سینک با سرور
   این فایل بعد از app-core.js لود می‌شود و توابع آن را override می‌کند
   ============================================================ */

/* ---------- Override persistence: sync with server ---------- */
(function syncInterceptor() {
  const PREFIX_TO_STORE = {
    [STATE_KEY_PREFIX]:     'state',
    [SETTINGS_KEY_PREFIX]:  'settings',
    [BANK_KEY_PREFIX]:      'bank',
    [PROGRAM_KEY_PREFIX]:   'program',
    [HISTORY_KEY_PREFIX]:   'history',
    [NUTRITION_KEY_PREFIX]: 'nutrition',
    [BODY_KEY_PREFIX]:      'body'
  };

  const origSet    = window.localStorage.setItem.bind(window.localStorage);
  const origGet    = window.localStorage.getItem.bind(window.localStorage);
  const origRemove = window.localStorage.removeItem.bind(window.localStorage);
  const origProtoSet = Storage.prototype.setItem;

  const pushQueue = new Map();
  let pushTimer = null;

  function schedulePush(storeKey, jsonString) {
    pushQueue.set(storeKey, jsonString);
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flushPush, 900);
  }

  async function flushPush() {
    if (!currentUserId) return;
    const items = [...pushQueue.entries()];
    pushQueue.clear();
    for (const [storeKey, jsonString] of items) {
      try {
        const value = JSON.parse(jsonString);
        await api.saveData(currentUserId, storeKey, value);
      } catch (e) {
        console.warn('sync failed:', storeKey, e.message);
      }
    }
  }
  window.__flushPush = flushPush;

  Storage.prototype.setItem = function (k, v) {
    origProtoSet.call(this, k, v);
    if (this !== window.localStorage) return;
    if (typeof currentUserId === 'undefined' || !currentUserId) return;
    for (const prefix of Object.keys(PREFIX_TO_STORE)) {
      if (k.startsWith(prefix) && k.slice(prefix.length) === currentUserId) {
        schedulePush(PREFIX_TO_STORE[prefix], v);
        break;
      }
    }
  };

  /* Flush on tab hide */
  window.addEventListener('pagehide', () => { flushPush(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPush();
  });

  /* Pull all keys for user from server into localStorage */
  window.syncPullAll = async function (userId) {
    try {
      const data = await api.loadAllData(userId);
      for (const [prefix, storeKey] of Object.entries(PREFIX_TO_STORE)) {
        const value = data[storeKey];
        if (value != null) {
          origSet(prefix + userId, JSON.stringify(value));
        } else {
          // Seed default on first login
          if (storeKey === 'settings') { /* nothing */ }
          origRemove(prefix + userId);
        }
      }
    } catch (e) {
      console.warn('pull failed:', e.message);
    }
  };

  /* Clear cached user data on logout (but keep other users' local cache) */
  window.syncClearCurrent = function () {
    if (!currentUserId) return;
    for (const prefix of Object.keys(PREFIX_TO_STORE)) {
      origRemove(prefix + currentUserId);
    }
  };
})();

/* ---------- Login / Logout ---------- */
let authCurrentUser = null;

async function doLogin() {
  const btn = document.getElementById('authLoginBtn');
  const errBox = document.getElementById('authError');
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!username || !password) { errBox.textContent = 'نام کاربری و رمز را وارد کنید'; return; }
  btn.disabled = true;
  btn.textContent = 'در حال ورود...';
  errBox.textContent = '';
  try {
    const res = await api.login(username, password);
    api.setToken(res.token);
    api.setUserInfo(res.user);
    authCurrentUser = res.user;
    await afterLogin();
  } catch (e) {
    errBox.textContent = e.data?.error === 'invalid_credentials'
      ? 'نام کاربری یا رمز اشتباه است'
      : (e.message || 'خطا در ورود');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ورود';
  }
}

async function afterLogin() {
  document.getElementById('authScreen').classList.add('hidden');

  // Fill users array (used by rest of app)
  users = [{
    id: authCurrentUser.id,
    name: authCurrentUser.displayName,
    emoji: authCurrentUser.emoji,
    color: authCurrentUser.color,
    role: authCurrentUser.role,
    username: authCurrentUser.username,
    passwordHash: '', // we don't store it client-side anymore
    createdAt: authCurrentUser.createdAt
  }];
  currentUserId = authCurrentUser.id;

  // Pull all user data from server
  await window.syncPullAll(currentUserId);

  // Reset transient state
  completedExercises = {}; collapsedExercises = {}; activeTimers = {}; cardioTimers = {};
  exerciseLogs = {}; setTimers = {}; openLoggers = {}; workoutData = {}; history = {};

  // Load everything (uses app-core.js functions)
  loadSettings();
  loadExerciseBank();
  loadUserProgram();
  loadHistory();
  if (typeof loadNutritionData === 'function') loadNutritionData();
  if (typeof loadBodyData === 'function') loadBodyData();
  rebuildWorkoutData();
  checkWeekReset();
  restoreAppState();
  applyScrollSnapSetting();

  updateUserButton();
  updateRoleUI();

  const todayKey = markTodayButton();
  currentDay = (userSettings.autoOpenToday && todayKey) ? todayKey : 'all';
  renderDayNav();
  renderDays();
  updateChart();
  restartAutosaveTimer();

  showToast(`خوش آمدی ${authCurrentUser.displayName}! ${authCurrentUser.emoji}`, 'success', 3000);
}

function doLogout() {
  if (!confirm('از حساب خود خارج می‌شوید؟')) return;
  window.__flushPush && window.__flushPush().finally(() => {
    window.syncClearCurrent();
    api.clearToken();
    location.reload();
  });
}

/* ---------- Override user management functions from app-core.js ---------- */
window.loadUsers = function () { /* users loaded after login */ };
window.saveUsers = function () { /* no-op, server handles */ };

window.updateUserButton = function () {
  if (!authCurrentUser) return;
  const av = document.getElementById('userBtnAvatar');
  const nm = document.getElementById('userBtnName');
  const btn = document.getElementById('userBtn');
  if (av) { av.textContent = authCurrentUser.emoji; av.style.background = authCurrentUser.color; }
  if (nm) nm.textContent = authCurrentUser.displayName;
  if (btn) btn.style.setProperty('--user-color', authCurrentUser.color);
};

window.renderUserList = function () {
  const list = document.getElementById('userList');
  if (!list) return;
  const u = authCurrentUser;
  if (!u) { list.innerHTML = ''; return; }

  const roleLabels = { admin: '👑 مدیر', coach: '👨‍🏫 مربی', student: '🎓 شاگرد' };
  let students = [];
  if (u.role === 'coach') students = users.filter(x => x.coachId === u.id);

  list.innerHTML = `
    <div class="user-card active" style="cursor:default">
      <div class="user-avatar" style="background:${u.color}">${u.emoji}</div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(u.displayName)} <span style="font-size:.7rem;color:var(--text-muted)">@${escapeHtml(u.username)}</span></div>
        <div class="user-meta">${roleLabels[u.role] || u.role}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn" style="flex:1;justify-content:center" onclick="showChangePasswordForm()">🔑 تغییر رمز</button>
      <button class="btn danger" style="flex:1;justify-content:center" onclick="doLogout()">🚪 خروج</button>
    </div>
    <div class="form" id="changePwdForm" style="margin-top:14px">
      <div class="form-title">🔑 تغییر رمز عبور</div>
      <div class="form-row"><label class="form-label">رمز فعلی</label><input type="password" class="form-input" id="cpOld"></div>
      <div class="form-row"><label class="form-label">رمز جدید (حداقل ۶ کاراکتر)</label><input type="password" class="form-input" id="cpNew"></div>
      <div class="form-actions">
        <button class="btn primary" onclick="submitChangePassword()">💾 ذخیره</button>
        <button class="btn" onclick="document.getElementById('changePwdForm').classList.remove('open')">لغو</button>
      </div>
    </div>
  `;
};

function showChangePasswordForm() {
  document.getElementById('changePwdForm').classList.add('open');
}

async function submitChangePassword() {
  const oldP = document.getElementById('cpOld').value;
  const newP = document.getElementById('cpNew').value;
  if (newP.length < 6) { showToast('رمز جدید حداقل ۶ کاراکتر', 'warn'); return; }
  try {
    await api.changePassword(oldP, newP);
    showToast('رمز تغییر کرد ✓', 'success');
    document.getElementById('changePwdForm').classList.remove('open');
  } catch (e) {
    showToast(e.data?.error === 'wrong_old_password' ? 'رمز فعلی اشتباه است' : 'خطا', 'warn');
  }
}

/* Disable delete from student side; admin-only */
window.deleteUser = function () {
  showToast('حذف کاربر فقط توسط مدیر انجام می‌شود', 'info');
};
window.showUserForm = function () {
  showToast('ایجاد کاربر از پنل مربی یا مدیر انجام می‌شود', 'info');
};
window.switchUser = function () { /* no-op, auth enforced */ };
window.requestUserSwitch = function () { /* no-op */ };

/* ---------- Role-based UI ---------- */
function updateRoleUI() {
  const u = authCurrentUser;
  if (!u) return;
  // Insert role badge in toolbar
  const toolbar = document.querySelector('.toolbar');
  if (!toolbar) return;
  let badge = document.getElementById('roleBadge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'roleBadge';
    badge.style.cssText = 'padding:6px 12px;border-radius:20px;font-size:.72rem;font-weight:800;margin-right:8px';
    toolbar.insertBefore(badge, toolbar.firstChild);
  }
  const colors = { admin: 'rgba(245,158,11,.2);color:#fbbf24', coach: 'rgba(59,130,246,.2);color:#60a5fa', student: 'rgba(16,185,129,.2);color:#34d399' };
  const labels = { admin: '👑 مدیر', coach: '👨‍🏫 مربی', student: '🎓 شاگرد' };
  badge.style.cssText = `padding:6px 12px;border-radius:20px;font-size:.72rem;font-weight:800;margin-right:8px;background:${colors[u.role]}`;
  badge.textContent = labels[u.role];

  // Show coach/admin buttons
  if (u.role === 'coach' || u.role === 'admin') {
    if (!document.getElementById('coachPanelBtn')) {
      const btn = document.createElement('button');
      btn.id = 'coachPanelBtn';
      btn.className = 'btn';
      btn.onclick = () => openCoachPanel();
      btn.innerHTML = '<span class="btn-icon">👨‍🏫</span><span class="btn-label">پنل مربی</span>';
      toolbar.querySelector('.toolbar-actions').prepend(btn);
    }
  }
  if (u.role === 'admin') {
    if (!document.getElementById('adminPanelBtn')) {
      const btn = document.createElement('button');
      btn.id = 'adminPanelBtn';
      btn.className = 'btn';
      btn.onclick = () => openAdminPanel();
      btn.innerHTML = '<span class="btn-icon">👑</span><span class="btn-label">پنل مدیر</span>';
      toolbar.querySelector('.toolbar-actions').prepend(btn);
    }
  }
}

/* ---------- Password confirm modal for admin delete ---------- */
let pendingAdminDelete = null;
let adminPwdResolve = null;
function requestAdminPassword(title) {
  return new Promise(resolve => {
    adminPwdResolve = resolve;
    document.getElementById('adminPwdTitle').textContent = title || 'رمز مدیر را وارد کنید';
    document.getElementById('adminPwdInput').value = '';
    document.getElementById('adminPwdBackdrop').classList.add('open');
    document.getElementById('adminPwdDrawer').classList.add('open');
    setTimeout(() => document.getElementById('adminPwdInput').focus(), 100);
  });
}
function closeAdminPwd() {
  document.getElementById('adminPwdBackdrop').classList.remove('open');
  document.getElementById('adminPwdDrawer').classList.remove('open');
  if (adminPwdResolve) { adminPwdResolve(null); adminPwdResolve = null; }
}
function submitAdminPwd() {
  const pwd = document.getElementById('adminPwdInput').value;
  if (!pwd) return;
  document.getElementById('adminPwdBackdrop').classList.remove('open');
  document.getElementById('adminPwdDrawer').classList.remove('open');
  if (adminPwdResolve) { adminPwdResolve(pwd); adminPwdResolve = null; }
}

/* ---------- Boot: check token or show login ---------- */
(async function bootAuth() {
  // Hide main container until login
  document.querySelector('.container').style.visibility = 'hidden';
  document.querySelector('.mobile-nav').style.visibility = 'hidden';

  if (!api.hasToken()) {
    document.getElementById('authScreen').classList.remove('hidden');
    document.querySelector('.container').style.visibility = 'visible';
    return;
  }

  try {
    authCurrentUser = await api.me();
    api.setUserInfo(authCurrentUser);
    await afterLogin();
    document.querySelector('.container').style.visibility = 'visible';
    document.querySelector('.mobile-nav').style.visibility = 'visible';
  } catch (e) {
    api.clearToken();
    document.getElementById('authScreen').classList.remove('hidden');
    document.querySelector('.container').style.visibility = 'visible';
  }
})();