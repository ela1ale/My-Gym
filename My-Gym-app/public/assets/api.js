/* ============================================================
   api.js — کلاینت REST API + مدیریت توکن
   ============================================================ */
const api = (function () {
  const TOKEN_KEY = 'profit-jwt';
  const USER_KEY  = 'profit-current-user-info';

  function token()       { return localStorage.getItem(TOKEN_KEY) || ''; }
  function hasToken()    { return !!token(); }
  function setToken(t)   { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken()  { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  function setUserInfo(u){ localStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function getUserInfo() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }

  async function request(method, url, body, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      ...opts
    });
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!res.ok) {
      const err = new Error((data && data.error) || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      if (res.status === 401 && !opts.silentAuth) {
        // توکن منقضی شده
        clearToken();
        if (typeof onSessionExpired === 'function') onSessionExpired();
      }
      throw err;
    }
    return data;
  }

  return {
    token, hasToken, setToken, clearToken, setUserInfo, getUserInfo,

    /* --- Auth --- */
    login: (username, password) => request('POST', '/api/auth/login', { username, password }, { silentAuth: true }),
    me: () => request('GET', '/api/auth/me'),
    changePassword: (oldPassword, newPassword) =>
      request('POST', '/api/auth/change-password', { oldPassword, newPassword }),

    /* --- Users --- */
    listUsers: () => request('GET', '/api/users'),
    createUser: (payload) => request('POST', '/api/users', payload),
    updateUser: (id, patch) => request('PUT', '/api/users/' + id, patch),
    deleteUser: (id, adminPassword) => request('DELETE', '/api/users/' + id, { adminPassword }),

    /* --- User Data --- */
    loadAllData: (userId) => request('GET', `/api/users/${userId}/data`),
    loadData: (userId, key) => request('GET', `/api/users/${userId}/data/${key}`),
    saveData: (userId, key, value) => request('POST', `/api/users/${userId}/data/${key}`, { value }),

    /* --- Coach --- */
    coachStudents: () => request('GET', '/api/coach/students'),
    studentOverview: (id) => request('GET', `/api/coach/students/${id}/overview`),
    addNote: (id, content, type) => request('POST', `/api/coach/students/${id}/notes`, { content, type }),
    deleteNote: (id) => request('DELETE', `/api/coach/notes/${id}`),

    /* --- Admin --- */
    auditLog: () => request('GET', '/api/admin/audit'),
    adminStats: () => request('GET', '/api/admin/stats')
  };
})();

function onSessionExpired() {
  if (typeof showToast === 'function') showToast('نشست شما منقضی شد — دوباره وارد شوید', 'warn', 4000);
  setTimeout(() => location.reload(), 1200);
}