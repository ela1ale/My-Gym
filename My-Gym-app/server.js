/* ProFit Server v3 — Approval System + Role Selection */
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-' + Math.random().toString(36);
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});
const query = (t, p) => pool.query(t, p);

async function initSchema() {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
    coach_id TEXT, emoji TEXT DEFAULT '💪', color TEXT DEFAULT '#3b82f6',
    active INTEGER DEFAULT 1, approval_status TEXT DEFAULT 'approved',
    created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL
  );`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_coach ON users(coach_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
  await query(`CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT, updated_at BIGINT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`);
  await query(`CREATE TABLE IF NOT EXISTS coach_notes (
    id SERIAL PRIMARY KEY, coach_id TEXT NOT NULL, student_id TEXT NOT NULL,
    content TEXT NOT NULL, type TEXT DEFAULT 'general', created_at BIGINT NOT NULL,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );`);
  await query(`CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL,
    target_id TEXT, details TEXT, created_at BIGINT NOT NULL
  );`);
  console.log('✅ جداول آماده');
}

async function bootstrapAdmin() {
  const r = await query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (r.rows.length > 0) return;
  const id = 'u_admin_' + Date.now();
  const now = Date.now();
  await query(`INSERT INTO users (id, username, display_name, password_hash, role, emoji, color, active, approval_status, created_at, updated_at)
    VALUES ($1,$2,$3,$4,'admin','👑','#f59e0b',1,'approved',$5,$6)`,
    [id, ADMIN_USER, 'مدیر سیستم', bcrypt.hashSync(ADMIN_PASS, 10), now, now]);
  console.log('👑 ادمین: ' + ADMIN_USER + ' / ' + ADMIN_PASS);
}

async function log(actorId, action, targetId, details) {
  try { await query('INSERT INTO audit_log (actor_id, action, target_id, details, created_at) VALUES ($1,$2,$3,$4,$5)',
    [actorId || null, action, targetId || null, JSON.stringify(details || {}), Date.now()]); } catch(e) {}
}

function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.display_name, role: u.role,
    coachId: u.coach_id, emoji: u.emoji, color: u.color, active: !!u.active,
    approvalStatus: u.approval_status || 'approved', createdAt: Number(u.created_at) };
}

async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const r = await query('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (r.rows.length === 0) return res.status(401).json({ error: 'invalid_user' });
    const u = r.rows[0];
    if (!u.active) return res.status(401).json({ error: 'inactive' });
    if (u.approval_status === 'pending') return res.status(401).json({ error: 'pending_approval' });
    if (u.approval_status === 'rejected') return res.status(401).json({ error: 'rejected' });
    req.user = u;
    next();
  } catch (e) { res.status(401).json({ error: 'invalid_token' }); }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });

const canAccess = (a, t) => a.id === t.id || a.role === 'admin' || (a.role === 'coach' && t.coach_id === a.id);

/* ================= REGISTER ================= */
app.post('/api/auth/register', async (req, res) => {
  const { username, password, displayName, requestedRole = 'student' } = req.body || {};
  if (!username || !password || !displayName) return res.status(400).json({ error: 'missing_fields' });
  if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) return res.status(400).json({ error: 'invalid_username' });

  const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'username_taken' });

  const role = requestedRole === 'coach' ? 'coach' : 'student';
  const approvalStatus = role === 'coach' ? 'pending' : 'approved';

  const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  const now = Date.now();
  const hash = bcrypt.hashSync(password, 10);
  try {
    await query(`INSERT INTO users (id, username, display_name, password_hash, role, coach_id, emoji, color, active, approval_status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,NULL,'💪','#3b82f6',1,$6,$7,$8)`,
      [id, username, displayName, hash, role, approvalStatus, now, now]);
  } catch (e) { return res.status(500).json({ error: 'db_error', message: e.message }); }

  await log(null, 'user_registered', id, { username, role });
  const u = await query('SELECT * FROM users WHERE id = $1', [id]);

  if (role === 'coach') {
    return res.json({
      pending: true,
      message: 'حساب مربی شما ساخته شد. لطفاً منتظر تأیید مدیر باشید.',
      user: publicUser(u.rows[0])
    });
  }

  const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u.rows[0]) });
});

/* ================= LOGIN ================= */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
  const r = await query('SELECT * FROM users WHERE username = $1', [username]);
  const user = r.rows[0];
  if (!user) { await log(null, 'login_failed', null, { username }); return res.status(401).json({ error: 'invalid_credentials' }); }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    await log(user.id, 'login_failed', user.id, { reason: 'wrong_password' });
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  if (user.approval_status === 'pending') return res.status(403).json({ error: 'pending_approval' });
  if (user.approval_status === 'rejected') return res.status(403).json({ error: 'rejected' });
  if (!user.active) return res.status(403).json({ error: 'inactive' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  await log(user.id, 'login_success', user.id, {});
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => res.json(publicUser(req.user)));

app.post('/api/auth/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'password_too_short' });
  if (!bcrypt.compareSync(oldPassword || '', req.user.password_hash)) return res.status(401).json({ error: 'wrong_old_password' });
  await query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
    [bcrypt.hashSync(newPassword, 10), Date.now(), req.user.id]);
  await log(req.user.id, 'password_changed', req.user.id, {});
  res.json({ ok: true });
});

/* ================= USERS ================= */
app.get('/api/users', auth, async (req, res) => {
  let r;
  if (req.user.role === 'admin') r = await query('SELECT * FROM users ORDER BY created_at DESC');
  else if (req.user.role === 'coach') r = await query('SELECT * FROM users WHERE coach_id = $1 ORDER BY display_name', [req.user.id]);
  else r = { rows: [req.user] };
  res.json(r.rows.map(publicUser));
});

app.get('/api/admin/pending-coaches', auth, requireRole('admin'), async (req, res) => {
  const r = await query("SELECT * FROM users WHERE role='coach' AND approval_status='pending' ORDER BY created_at DESC");
  res.json(r.rows.map(publicUser));
});

app.post('/api/admin/approve/:id', auth, requireRole('admin'), async (req, res) => {
  const r = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await query("UPDATE users SET approval_status='approved', active=1, updated_at=$1 WHERE id=$2", [Date.now(), req.params.id]);
  await log(req.user.id, 'coach_approved', req.params.id, {});
  res.json({ ok: true });
});

app.post('/api/admin/reject/:id', auth, requireRole('admin'), async (req, res) => {
  const r = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await query("UPDATE users SET approval_status='rejected', active=0, updated_at=$1 WHERE id=$2", [Date.now(), req.params.id]);
  await log(req.user.id, 'coach_rejected', req.params.id, {});
  res.json({ ok: true });
});

app.post('/api/users', auth, async (req, res) => {
  const { username, password, displayName, role = 'student', emoji = '💪', color = '#3b82f6', coachId } = req.body || {};
  if (!username || !password || !displayName) return res.status(400).json({ error: 'missing_fields' });
  if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) return res.status(400).json({ error: 'invalid_username' });
  if (req.user.role === 'student') return res.status(403).json({ error: 'forbidden' });
  if (req.user.role === 'coach' && role !== 'student') return res.status(403).json({ error: 'coach_can_only_create_students' });

  let effectiveCoachId = null;
  if (req.user.role === 'coach') effectiveCoachId = req.user.id;
  else if (req.user.role === 'admin' && coachId) {
    const c = await query("SELECT id FROM users WHERE id = $1 AND role IN ('coach','admin')", [coachId]);
    if (c.rows.length === 0) return res.status(400).json({ error: 'invalid_coach' });
    effectiveCoachId = coachId;
  }
  const ex = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (ex.rows.length > 0) return res.status(409).json({ error: 'username_taken' });

  const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  const now = Date.now();
  const approvalStatus = role === 'coach' ? 'pending' : 'approved';
  try {
    await query(`INSERT INTO users (id, username, display_name, password_hash, role, coach_id, emoji, color, active, approval_status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,$11)`,
      [id, username, displayName, bcrypt.hashSync(password, 10), role, effectiveCoachId, emoji, color, approvalStatus, now, now]);
  } catch (e) { return res.status(500).json({ error: 'db_error' }); }
  await log(req.user.id, 'user_created', id, { username, role });
  const nr = await query('SELECT * FROM users WHERE id = $1', [id]);
  res.json(publicUser(nr.rows[0]));
});

app.put('/api/users/:id', auth, async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const target = tr.rows[0];
  if (!target) return res.status(404).json({ error: 'not_found' });
  const isSelf = target.id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const ownStudent = req.user.role === 'coach' && target.coach_id === req.user.id;
  if (!isSelf && !isAdmin && !ownStudent) return res.status(403).json({ error: 'forbidden' });

  const { displayName, emoji, color, password, active, coachId, role, approvalStatus } = req.body || {};
  const sets = [], vals = [];
  let i = 1;
  if (displayName != null) { sets.push(`display_name = $${i++}`); vals.push(displayName); }
  if (emoji != null) { sets.push(`emoji = $${i++}`); vals.push(emoji); }
  if (color != null) { sets.push(`color = $${i++}`); vals.push(color); }
  if (active != null) {
    if (!isAdmin) return res.status(403).json({ error: 'only_admin_can_toggle_active' });
    sets.push(`active = $${i++}`); vals.push(active ? 1 : 0);
  }
  if (coachId !== undefined) {
    if (!isAdmin) return res.status(403).json({ error: 'only_admin_can_reassign' });
    sets.push(`coach_id = $${i++}`); vals.push(coachId || null);
  }
  if (role != null) {
    if (!isAdmin) return res.status(403).json({ error: 'only_admin_can_change_role' });
    if (!['student','coach','admin'].includes(role)) return res.status(400).json({ error: 'invalid_role' });
    sets.push(`role = $${i++}`); vals.push(role);
  }
  if (approvalStatus != null) {
    if (!isAdmin) return res.status(403).json({ error: 'only_admin_can_approve' });
    if (!['approved','pending','rejected'].includes(approvalStatus)) return res.status(400).json({ error: 'invalid_status' });
    sets.push(`approval_status = $${i++}`); vals.push(approvalStatus);
  }
  if (password) {
    if (!isAdmin && !ownStudent) return res.status(403).json({ error: 'forbidden_password_reset' });
    if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
    sets.push(`password_hash = $${i++}`); vals.push(bcrypt.hashSync(password, 10));
  }
  if (!sets.length) return res.json(publicUser(target));
  sets.push(`updated_at = $${i++}`); vals.push(Date.now());
  vals.push(target.id);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  await log(req.user.id, 'user_updated', target.id, { fields: Object.keys(req.body) });
  const nr = await query('SELECT * FROM users WHERE id = $1', [target.id]);
  res.json(publicUser(nr.rows[0]));
});

app.delete('/api/users/:id', auth, requireRole('admin'), async (req, res) => {
  const { adminPassword } = req.body || {};
  if (!adminPassword) return res.status(400).json({ error: 'password_required' });
  if (!bcrypt.compareSync(adminPassword, req.user.password_hash))
    return res.status(401).json({ error: 'wrong_password' });
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const target = tr.rows[0];
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'cannot_delete_self' });
  if (target.role === 'admin') {
    const c = await query("SELECT COUNT(*) AS c FROM users WHERE role='admin'");
    if (parseInt(c.rows[0].c) <= 1) return res.status(400).json({ error: 'last_admin' });
  }
  await query('DELETE FROM users WHERE id = $1', [target.id]);
  await log(req.user.id, 'user_deleted', target.id, { username: target.username });
  res.json({ ok: true });
});

/* ================= USER DATA ================= */
app.get('/api/users/:id/data', auth, async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (tr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  if (!canAccess(req.user, tr.rows[0])) return res.status(403).json({ error: 'forbidden' });
  const r = await query('SELECT key, value FROM user_data WHERE user_id = $1', [req.params.id]);
  const out = {};
  r.rows.forEach(x => { try { out[x.key] = JSON.parse(x.value); } catch {} });
  res.json(out);
});

app.get('/api/users/:id/data/:key', auth, async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (tr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  if (!canAccess(req.user, tr.rows[0])) return res.status(403).json({ error: 'forbidden' });
  const r = await query('SELECT value FROM user_data WHERE user_id=$1 AND key=$2', [req.params.id, req.params.key]);
  if (r.rows.length === 0) return res.json({ value: null });
  try { res.json({ value: JSON.parse(r.rows[0].value) }); } catch { res.json({ value: null }); }
});

app.post('/api/users/:id/data/:key', auth, async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (tr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  if (!canAccess(req.user, tr.rows[0])) return res.status(403).json({ error: 'forbidden' });
  const value = JSON.stringify(req.body?.value ?? null);
  await query(`INSERT INTO user_data (user_id, key, value, updated_at) VALUES ($1,$2,$3,$4)
    ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [req.params.id, req.params.key, value, Date.now()]);
  res.json({ ok: true });
});

/* ================= COACH ================= */
app.get('/api/coach/students', auth, requireRole('coach','admin'), async (req, res) => {
  const coachId = req.user.role === 'coach' ? req.user.id : req.query.coachId;
  if (!coachId) return res.status(400).json({ error: 'missing_coach' });
  const sr = await query('SELECT * FROM users WHERE coach_id = $1 ORDER BY display_name', [coachId]);
  const now = Date.now();
  const out = [];
  for (const s of sr.rows) {
    const stR = await query("SELECT value FROM user_data WHERE user_id=$1 AND key='state'", [s.id]);
    const hiR = await query("SELECT value FROM user_data WHERE user_id=$1 AND key='history'", [s.id]);
    let state = null, hist = null;
    try { state = stR.rows[0] ? JSON.parse(stR.rows[0].value) : null; } catch {}
    try { hist = hiR.rows[0] ? JSON.parse(hiR.rows[0].value) : null; } catch {}
    const completedCount = state?.completedExercises ? Object.values(state.completedExercises).filter(Boolean).length : 0;
    let volume = 0;
    Object.values(state?.exerciseLogs || {}).forEach(a => (a||[]).forEach(l => { if (l?.weight && l?.reps) volume += l.weight * l.reps; }));
    let s7 = 0, v7 = 0;
    if (hist) Object.keys(hist).forEach(k => {
      const t = new Date(k).getTime();
      if (now - t < 7*86400000) { if ((hist[k].completed || 0) > 0) s7++; v7 += hist[k].volume || 0; }
    });
    out.push({ ...publicUser(s), stats: { completedCount, volume: Math.round(volume), sessions7: s7, volume7: Math.round(v7) } });
  }
  res.json(out);
});

app.get('/api/coach/students/:id/overview', auth, requireRole('coach','admin'), async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const target = tr.rows[0];
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (req.user.role === 'coach' && target.coach_id !== req.user.id)
    return res.status(403).json({ error: 'not_own_student' });
  const keys = ['state','history','program','nutrition','body','settings'];
  const data = {};
  for (const k of keys) {
    const r = await query('SELECT value FROM user_data WHERE user_id=$1 AND key=$2', [target.id, k]);
    try { data[k] = r.rows[0] ? JSON.parse(r.rows[0].value) : null; } catch { data[k] = null; }
  }
  const nr = await query('SELECT * FROM coach_notes WHERE student_id=$1 ORDER BY created_at DESC', [target.id]);
  res.json({ student: publicUser(target), data, notes: nr.rows.map(n => ({ ...n, created_at: Number(n.created_at) })) });
});

app.post('/api/coach/students/:id/notes', auth, requireRole('coach','admin'), async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const target = tr.rows[0];
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (req.user.role === 'coach' && target.coach_id !== req.user.id)
    return res.status(403).json({ error: 'not_own_student' });
  const { content, type = 'general' } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'empty' });
  const r = await query('INSERT INTO coach_notes (coach_id, student_id, content, type, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.user.id, target.id, content.trim(), type, Date.now()]);
  res.json({ id: r.rows[0].id, ok: true });
});

app.delete('/api/coach/notes/:id', auth, requireRole('coach','admin'), async (req, res) => {
  const nr = await query('SELECT * FROM coach_notes WHERE id = $1', [req.params.id]);
  if (nr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  const note = nr.rows[0];
  if (req.user.role === 'coach' && note.coach_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  await query('DELETE FROM coach_notes WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

/* ================= ADMIN ================= */
app.get('/api/admin/audit', auth, requireRole('admin'), async (req, res) => {
  const r = await query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 300');
  res.json(r.rows.map(row => ({ ...row, created_at: Number(row.created_at) })));
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err, req, res, next) => { console.error('❌', err); res.status(500).json({ error: 'server_error' }); });

(async () => {
  try {
    await initSchema();
    await bootstrapAdmin();
    app.listen(PORT, () => console.log('\n🚀 ProFit running on port ' + PORT + '\n'));
  } catch(e) { console.error('❌', e); process.exit(1); }
})();
