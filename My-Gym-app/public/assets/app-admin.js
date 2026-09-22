/* ============================================================
   app-admin.js — پنل مدیر: مدیریت کامل کاربران + لاگ
   ============================================================ */

let adminUsersCache = [];
let adminCoachesCache = [];
let adminEditingUserId = null;

function openAdminPanel() {
  document.getElementById('adminBackdrop').classList.add('open');
  document.getElementById('adminPanel').classList.add('open');
  switchAdminTab('users');
  renderAdminUsers();
}

function closeAdminPanel() {
  document.getElementById('adminBackdrop').classList.remove('open');
  document.getElementById('adminPanel').classList.remove('open');
}

function switchAdminTab(tab) {
  document.querySelectorAll('.drawer-tab[data-atab]').forEach(t => t.classList.toggle('active', t.dataset.atab === tab));
  document.getElementById('atab-users').classList.toggle('active', tab === 'users');
  document.getElementById('atab-audit').classList.toggle('active', tab === 'audit');
  if (tab === 'audit') renderAdminAudit();
}

async function renderAdminUsers() {
  const el = document.getElementById('adminUsersList');
  el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⏳</div><div>در حال بارگذاری...</div></div>';
  try {
    adminUsersCache = await api.listUsers();
    adminCoachesCache = adminUsersCache.filter(u => u.role === 'coach' || u.role === 'admin');
    renderAdminUsersList();
  } catch (e) {
    el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⚠️</div><div>خطا</div></div>';
  }
}

function renderAdminUsersList() {
  const el = document.getElementById('adminUsersList');
  if (!adminUsersCache.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">هیچ کاربری نیست</div>'; return; }

  const roleColors = { admin: '#f59e0b', coach: '#3b82f6', student: '#10b981' };
  const roleLabels = { admin: '👑 مدیر', coach: '👨‍🏫 مربی', student: '🎓 شاگرد' };
  const byRole = { admin: [], coach: [], student: [] };
  adminUsersCache.forEach(u => byRole[u.role]?.push(u));

  let html = '';
  ['admin', 'coach', 'student'].forEach(role => {
    const list = byRole[role];
    if (!list.length) return;
    html += `<div class="settings-section-title" style="color:${roleColors[role]}">${roleLabels[role]} (${list.length})</div>`;
    html += list.map(u => {
      const coach = u.coachId ? adminUsersCache.find(c => c.id === u.coachId) : null;
      const coachLabel = coach ? `<span style="color:var(--text-muted)"> — مربی: ${escapeHtml(coach.displayName)}</span>` : '';
      const statusLabel = u.active ? '' : ' <span style="color:var(--accent-rose);font-size:.7rem">(غیرفعال)</span>';
      return `<div class="user-card" style="cursor:default;margin-bottom:8px">
        <div class="user-avatar" style="background:${u.color}">${u.emoji}</div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(u.displayName)}${statusLabel}</div>
          <div class="user-meta">@${escapeHtml(u.username)}${coachLabel}</div>
        </div>
        <div class="user-actions">
          <button class="user-action-btn" onclick="showAdminUserForm('${u.id}')" title="ویرایش">✏️</button>
          <button class="user-action-btn" onclick="adminResetPassword('${u.id}')" title="بازنشانی رمز">🔑</button>
          <button class="user-action-btn" onclick="adminToggleActive('${u.id}')" title="${u.active ? 'غیرفعال' : 'فعال'}">${u.active ? '🚫' : '✅'}</button>
          ${u.role !== 'admin' || adminUsersCache.filter(x => x.role === 'admin').length > 1
            ? `<button class="user-action-btn delete" onclick="adminDeleteUser('${u.id}')" title="حذف">🗑️</button>` : ''}
        </div>
      </div>`;
    }).join('');
  });
  el.innerHTML = html;
}

/* ---------- فرم ایجاد/ویرایش کاربر ---------- */
function showAdminUserForm(userId) {
  adminEditingUserId = userId || null;
  const title = document.getElementById('adminUserFormTitle');
  const usernameEl = document.getElementById('auUsername');
  const displayEl = document.getElementById('auDisplayName');
  const pwdEl = document.getElementById('auPassword');
  const roleEl = document.getElementById('auRole');
  const coachEl = document.getElementById('auCoachId');
  const coachRow = document.getElementById('auCoachRow');

  // Populate coaches dropdown
  coachEl.innerHTML = '<option value="">— بدون مربی —</option>' +
    adminCoachesCache.map(c => `<option value="${c.id}">${c.emoji} ${escapeHtml(c.displayName)} (${c.role})</option>`).join('');

  if (userId) {
    const u = adminUsersCache.find(x => x.id === userId);
    if (!u) return;
    title.textContent = '✏️ ویرایش کاربر';
    usernameEl.value = u.username;
    usernameEl.disabled = true;
    displayEl.value = u.displayName;
    pwdEl.value = '';
    pwdEl.placeholder = 'خالی = بدون تغییر';
    roleEl.value = u.role;
    coachEl.value = u.coachId || '';
  } else {
    title.textContent = '➕ کاربر جدید';
    usernameEl.value = '';
    usernameEl.disabled = false;
    displayEl.value = '';
    pwdEl.value = '';
    pwdEl.placeholder = 'حداقل ۶ کاراکتر';
    roleEl.value = 'student';
    coachEl.value = '';
  }
  updateAdminCoachRow();
  document.getElementById('adminUserFormBackdrop').classList.add('open');
  document.getElementById('adminUserFormDrawer').classList.add('open');
  setTimeout(() => usernameEl.focus(), 100);
}

function updateAdminCoachRow() {
  const role = document.getElementById('auRole').value;
  document.getElementById('auCoachRow').style.display = (role === 'student') ? 'block' : 'none';
}

function closeAdminUserForm() {
  adminEditingUserId = null;
  document.getElementById('adminUserFormBackdrop').classList.remove('open');
  document.getElementById('adminUserFormDrawer').classList.remove('open');
}

async function saveAdminUserForm() {
  const username = document.getElementById('auUsername').value.trim();
  const displayName = document.getElementById('auDisplayName').value.trim();
  const password = document.getElementById('auPassword').value;
  const role = document.getElementById('auRole').value;
  const coachId = document.getElementById('auCoachId').value || null;

  if (!displayName) { showToast('نام نمایشی را وارد کنید', 'warn'); return; }
  if (!adminEditingUserId && !username) { showToast('نام کاربری را وارد کنید', 'warn'); return; }
  if (!adminEditingUserId && (!password || password.length < 6)) { showToast('رمز حداقل ۶ کاراکتر', 'warn'); return; }

  try {
    if (adminEditingUserId) {
      const patch = { displayName, role };
      if (password) patch.password = password;
      if (role === 'student') patch.coachId = coachId;
      await api.updateUser(adminEditingUserId, patch);
      showToast('کاربر ویرایش شد ✓', 'success');
    } else {
      await api.createUser({ username, displayName, password, role, coachId: role === 'student' ? coachId : null });
      showToast('کاربر ساخته شد ✓', 'success');
    }
    closeAdminUserForm();
    renderAdminUsers();
  } catch (e) {
    const msg = e.data?.error === 'username_taken' ? 'نام کاربری تکراری' :
                e.data?.error === 'invalid_username' ? 'نام کاربری نامعتبر' :
                'خطا: ' + (e.data?.error || e.message);
    showToast(msg, 'warn');
  }
}

/* ---------- عملیات ادمین ---------- */
async function adminDeleteUser(userId) {
  const u = adminUsersCache.find(x => x.id === userId);
  if (!u) return;
  if (!confirm(`آیا از حذف کاربر «${u.displayName}» (@${u.username}) مطمئن هستید؟\n\nتمام داده‌های او پاک می‌شود.`)) return;

  const pwd = await requestAdminPassword(`برای حذف «${u.displayName}» رمز خود را وارد کنید`);
  if (!pwd) return;

  try {
    await api.deleteUser(userId, pwd);
    showToast('کاربر حذف شد', 'success');
    renderAdminUsers();
  } catch (e) {
    const msg = e.data?.error === 'wrong_password' ? 'رمز اشتباه است' :
                e.data?.error === 'cannot_delete_self' ? 'نمی‌توانید خودتان را حذف کنید' :
                e.data?.error === 'last_admin' ? 'آخرین مدیر را نمی‌توان حذف کرد' :
                'خطا در حذف';
    showToast(msg, 'warn');
  }
}

async function adminResetPassword(userId) {
  const u = adminUsersCache.find(x => x.id === userId);
  if (!u) return;
  const newPwd = prompt(`رمز جدید برای «${u.displayName}» (حداقل ۶ کاراکتر):`);
  if (!newPwd) return;
  if (newPwd.length < 6) { showToast('رمز حداقل ۶ کاراکتر', 'warn'); return; }
  try {
    await api.updateUser(userId, { password: newPwd });
    showToast('رمز بازنشانی شد ✓', 'success');
  } catch (e) { showToast('خطا', 'warn'); }
}

async function adminToggleActive(userId) {
  const u = adminUsersCache.find(x => x.id === userId);
  if (!u) return;
  const newState = !u.active;
  if (!confirm(`${newState ? 'فعال' : 'غیرفعال'} کردن کاربر «${u.displayName}»؟`)) return;
  try {
    await api.updateUser(userId, { active: newState });
    showToast(newState ? 'کاربر فعال شد' : 'کاربر غیرفعال شد', 'success');
    renderAdminUsers();
  } catch (e) { showToast('خطا', 'warn'); }
}

/* ---------- لاگ فعالیت ---------- */
async function renderAdminAudit() {
  const el = document.getElementById('adminAuditList');
  el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⏳</div><div>در حال بارگذاری...</div></div>';
  try {
    const rows = await api.auditLog();
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">هیچ فعالیتی ثبت نشده</div>'; return; }
    el.innerHTML = rows.map(r => {
      const d = new Date(r.created_at);
      const dateStr = d.toLocaleString('fa-IR');
      const actor = adminUsersCache.find(u => u.id === r.actor_id);
      const actorName = actor ? actor.displayName : (r.actor_id || 'سیستم');
      const actionLabels = {
        login_success: '✅ ورود موفق', login_failed: '❌ ورود ناموفق',
        user_created: '➕ ساخت کاربر', user_updated: '✏️ ویرایش کاربر',
        user_deleted: '🗑️ حذف کاربر', password_changed: '🔑 تغییر رمز'
      };
      return `<div style="padding:10px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;margin-bottom:6px;font-size:.78rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <strong>${actionLabels[r.action] || r.action}</strong>
          <span style="color:var(--text-muted);font-size:.7rem">${dateStr}</span>
        </div>
        <div style="color:var(--text-secondary)">${escapeHtml(actorName)}${r.target_id ? ' → ' + escapeHtml(r.target_id.slice(0, 12)) : ''}</div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">⚠️</div><div>خطا</div></div>';
  }
}