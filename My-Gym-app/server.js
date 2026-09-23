/* ============================================================
   ProFit Server v4.3 — Bulletproof (works with any package.json)
   ============================================================ */
try { require('dotenv').config(); } catch(e) {}

const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

/* ============ OPTIONAL PACKAGES (safe require) ============ */
let compression, helmet, rateLimit;
try { compression = require('compression'); } catch(e) { console.warn('⚠️  compression not installed — skipping'); }
try { helmet = require('helmet'); } catch(e) { console.warn('⚠️  helmet not installed — skipping'); }
try { rateLimit = require('express-rate-limit'); } catch(e) { console.warn('⚠️  express-rate-limit not installed — skipping'); }
try { require('express-async-errors'); } catch(e) { console.warn('⚠️  express-async-errors not installed'); }

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required!');
  console.error('   Set it in Render → Environment → JWT_SECRET');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
if (!process.env.ADMIN_PASSWORD) console.warn('⚠️  Using default admin password!');

const app = express();
app.set('trust proxy', 1);

/* ============ MIDDLEWARE (conditional) ============ */
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
}
if (compression) {
  app.use(compression({ level: 6, threshold: 1024 }));
}

app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
const query = (t, p) => pool.query(t, p);
pool.on('error', (err) => console.error('🔥 Pool error:', err.message));

/* ============ RATE LIMITERS (conditional) ============ */
const loginLimiter = rateLimit ? rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' }
}) : (req, res, next) => next();

const registerLimiter = rateLimit ? rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_registrations' }
}) : (req, res, next) => next();

/* ============ SCHEMA ============ */
async function initSchema() {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    coach_id TEXT,
    emoji TEXT DEFAULT '💪',
    color TEXT DEFAULT '#3b82f6',
    active INTEGER DEFAULT 1,
    approval_status TEXT DEFAULT 'approved',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );`);

  const tryAlter = async (sql) => { try { await query(sql); } catch(e) {} };
  await tryAlter(`ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'`);
  await tryAlter(`ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_id TEXT`);
  await tryAlter(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1`);
  await tryAlter(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '💪'`);
  await tryAlter(`ALTER TABLE users ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6'`);
  await tryAlter(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at BIGINT`);
  await tryAlter(`UPDATE users SET approval_status='approved' WHERE approval_status IS NULL`);
  await tryAlter(`UPDATE users SET active=1 WHERE active IS NULL`);
  await tryAlter(`UPDATE users SET updated_at=created_at WHERE updated_at IS NULL`);

  await query(`CREATE INDEX IF NOT EXISTS idx_users_coach ON users(coach_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_approval ON users(approval_status);`);

  await query(`CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (user_id, key)
  );`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_data_user ON user_data(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_data_user_key ON user_data(user_id, key);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_data_key ON user_data(key);`);

  await query(`CREATE TABLE IF NOT EXISTS coach_notes (
    id SERIAL PRIMARY KEY,
    coach_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    created_at BIGINT NOT NULL
  );`);
  await query(`CREATE INDEX IF NOT EXISTS idx_coach_notes_student ON coach_notes(student_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_coach_notes_coach ON coach_notes(coach_id);`);

  await query(`CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    actor_id TEXT,
    action TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    created_at BIGINT NOT NULL
  );`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);`);

  console.log('✅ Schema ready');
}

async function bootstrapAdmin() {
  const r = await query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (r.rows.length > 0) return;
  const id = 'u_admin_' + Date.now();
  const now = Date.now();
  await query(
    `INSERT INTO users (id, username, display_name, password_hash, role, emoji, color, active, approval_status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'admin','👑','#f59e0b',1,'approved',$5,$6)`,
    [id, ADMIN_USER, 'مدیر سیستم', bcrypt.hashSync(ADMIN_PASS, 10), now, now]
  );
  console.log('👑 Admin created: ' + ADMIN_USER);
}

/* ============ HELPERS ============ */
async function log(actorId, action, targetId, details) {
  try {
    await query(
      'INSERT INTO audit_log (actor_id, action, target_id, details, created_at) VALUES ($1,$2,$3,$4,$5)',
      [actorId || null, action, targetId || null, JSON.stringify(details || {}), Date.now()]
    );
  } catch(e) { console.error('log error:', e.message); }
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    role: u.role,
    coachId: u.coach_id,
    emoji: u.emoji || '💪',
    color: u.color || '#3b82f6',
    active: u.active === 1 || u.active === true,
    approvalStatus: u.approval_status || 'approved',
    createdAt: Number(u.created_at)
  };
}

async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const r = await query('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (r.rows.length === 0) return res.status(401).json({ error: 'invalid_user' });
    const u = r.rows[0];
    if (!u.active) return res.status(403).json({ error: 'inactive' });
    if (u.approval_status === 'pending') return res.status(403).json({ error: 'pending_approval' });
    if (u.approval_status === 'rejected') return res.status(403).json({ error: 'rejected' });
    req.user = u;
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid_token' });
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });

const canAccess = (a, t) =>
  a.id === t.id || a.role === 'admin' || (a.role === 'coach' && t.coach_id === a.id);

/* ============ HEALTH ============ */
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/api/version', (req, res) => res.json({ version: '4.3' }));

/* ============ REGISTER ============ */
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { username, password, displayName, requestedRole = 'student' } = req.body || {};
    if (!username || !password || !displayName) return res.status(400).json({ error: 'missing_fields' });
    if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) return res.status(400).json({ error: 'invalid_username' });

    const role = requestedRole === 'coach' ? 'coach' : 'student';
    const approvalStatus = role === 'coach' ? 'pending' : 'approved';

    const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const now = Date.now();

    try {
      await query(
        `INSERT INTO users (id, username, display_name, password_hash, role, coach_id, emoji, color, active, approval_status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NULL,'💪','#3b82f6',1,$6,$7,$8)`,
        [id, username, displayName, bcrypt.hashSync(password, 10), role, approvalStatus, now, now]
      );
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'username_taken' });
      console.error('register error:', e);
      return res.status(500).json({ error: 'db_error', message: e.message });
    }

    await log(null, 'user_registered', id, { username, role });
    const u = await query('SELECT * FROM users WHERE id = $1', [id]);

    if (role === 'coach') {
      return res.json({ pending: true, message: 'منتظر تأیید مدیر باشید.', user: publicUser(u.rows[0]) });
    }
    const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: publicUser(u.rows[0]) });
  } catch(e) {
    console.error('register handler error:', e);
    res.status(500).json({ error: 'server_error', message: e.message });
  }
});

/* ============ LOGIN ============ */
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });

    const r = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = r.rows[0];

    if (!user) {
      await log(null, 'login_failed', null, { username, reason: 'no_user' });
      return res.status(401).json({ error: 'invalid_credentials' });
    }
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
  } catch(e) {
    console.error('login handler error:', e);
    res.status(500).json({ error: 'server_error', message: e.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => res.json(publicUser(req.user)));

app.post('/api/auth/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'password_too_short' });
  if (!bcrypt.compareSync(oldPassword || '', req.user.password_hash))
    return res.status(401).json({ error: 'wrong_password' });
  await query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
    [bcrypt.hashSync(newPassword, 10), Date.now(), req.user.id]);
  await log(req.user.id, 'password_changed', req.user.id, {});
  res.json({ ok: true });
});

/* ============ COACHES LIST ============ */
app.get('/api/coaches', auth, async (req, res) => {
  const r = await query(
    `SELECT id, display_name, username, emoji, color FROM users
     WHERE role = 'coach' AND active = 1 AND approval_status = 'approved'
     ORDER BY display_name`
  );
  res.json(r.rows.map(u => ({
    id: u.id,
    displayName: u.display_name,
    username: u.username,
    emoji: u.emoji || '👨‍🏫',
    color: u.color || '#3b82f6'
  })));
});

/* ============ COACH REQUESTS ============ */
app.get('/api/coach-requests', auth, requireRole('coach','admin'), async (req, res) => {
  const r = await query(
    `SELECT ud.user_id, ud.value, u.display_name, u.username, u.emoji, u.color, u.coach_id, ud.updated_at
     FROM user_data ud
     JOIN users u ON u.id = ud.user_id
     WHERE ud.key = 'coachRequest'
     ORDER BY ud.updated_at DESC`
  );
  const requests = [];
  for (const row of r.rows) {
    try {
      const rd = JSON.parse(row.value);
      if (!rd || rd.status !== 'pending') continue;
      if (req.user.role === 'coach') {
        const prefersMe = rd.coachId === req.user.id;
        const unassigned = !row.coach_id;
        if (!prefersMe && !unassigned) continue;
      }
      requests.push({
        studentId: row.user_id,
        studentName: row.display_name,
        studentUsername: row.username,
        studentEmoji: row.emoji,
        studentColor: row.color,
        currentCoachId: row.coach_id,
        preferredCoachId: rd.coachId || null,
        coachName: rd.coachName || null,
        note: rd.note || null,
        date: rd.date,
        requestedAt: Number(row.updated_at)
      });
    } catch {}
  }
  res.json(requests);
});

app.post('/api/coach-requests/:userId/assign', auth, requireRole('admin'), async (req, res) => {
  const { coachId } = req.body || {};
  if (!coachId) return res.status(400).json({ error: 'coach_id_required' });

  const c = await query(
    "SELECT id FROM users WHERE id = $1 AND role IN ('coach','admin') AND active = 1",
    [coachId]
  );
  if (c.rows.length === 0) return res.status(400).json({ error: 'invalid_coach' });

  await query('UPDATE users SET coach_id = $1, updated_at = $2 WHERE id = $3',
    [coachId, Date.now(), req.params.userId]);

  const r = await query('SELECT value FROM user_data WHERE user_id = $1 AND key = $2',
    [req.params.userId, 'coachRequest']);
  if (r.rows[0]) {
    try {
      const rd = JSON.parse(r.rows[0].value);
      rd.status = 'assigned';
      rd.assignedCoachId = coachId;
      rd.assignedAt = new Date().toISOString();
      await query(
        `UPDATE user_data SET value = $1, updated_at = $2 WHERE user_id = $3 AND key = 'coachRequest'`,
        [JSON.stringify(rd), Date.now(), req.params.userId]
      );
    } catch {}
  }

  await log(req.user.id, 'coach_request_assigned', req.params.userId, { coachId });
  res.json({ ok: true });
});

app.post('/api/coach-requests/:userId/claim', auth, requireRole('coach'), async (req, res) => {
  const coachId = req.user.id;

  await query('UPDATE users SET coach_id = $1, updated_at = $2 WHERE id = $3',
    [coachId, Date.now(), req.params.userId]);

  const r = await query('SELECT value FROM user_data WHERE user_id = $1 AND key = $2',
    [req.params.userId, 'coachRequest']);
  if (r.rows[0]) {
    try {
      const rd = JSON.parse(r.rows[0].value);
      rd.status = 'assigned';
      rd.assignedCoachId = coachId;
      rd.assignedAt = new Date().toISOString();
      await query(
        `UPDATE user_data SET value = $1, updated_at = $2 WHERE user_id = $3 AND key = 'coachRequest'`,
        [JSON.stringify(rd), Date.now(), req.params.userId]
      );
    } catch {}
  }

  await log(req.user.id, 'coach_request_claimed', req.params.userId, {});
  res.json({ ok: true });
});

app.post('/api/coach-requests/:userId/reject', auth, requireRole('admin'), async (req, res) => {
  const r = await query('SELECT value FROM user_data WHERE user_id = $1 AND key = $2',
    [req.params.userId, 'coachRequest']);
  if (!r.rows[0]) return res.status(404).json({ error: 'not_found' });
  try {
    const rd = JSON.parse(r.rows[0].value);
    rd.status = 'rejected';
    rd.rejectedAt = new Date().toISOString();
    await query(
      `UPDATE user_data SET value = $1, updated_at = $2 WHERE user_id = $3 AND key = 'coachRequest'`,
      [JSON.stringify(rd), Date.now(), req.params.userId]
    );
  } catch {}
  await log(req.user.id, 'coach_request_rejected', req.params.userId, {});
  res.json({ ok: true });
});

/* ============ USERS ============ */
app.get('/api/users', auth, async (req, res) => {
  let r;
  if (req.user.role === 'admin') {
    r = await query('SELECT * FROM users ORDER BY created_at DESC');
  } else if (req.user.role === 'coach') {
    r = await query('SELECT * FROM users WHERE coach_id = $1 ORDER BY display_name', [req.user.id]);
  } else {
    r = { rows: [req.user] };
  }
  res.json(r.rows.map(publicUser));
});

app.post('/api/users', auth, async (req, res) => {
  const { username, password, displayName, role = 'student', emoji = '💪', color = '#3b82f6', coachId } = req.body || {};
  if (!username || !password || !displayName) return res.status(400).json({ error: 'missing_fields' });
  if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) return res.status(400).json({ error: 'invalid_username' });

  if (req.user.role === 'student') return res.status(403).json({ error: 'forbidden' });
  if (req.user.role === 'coach' && role !== 'student')
    return res.status(403).json({ error: 'coach_can_only_create_students' });

  let effectiveCoachId = null;
  if (req.user.role === 'coach') {
    effectiveCoachId = req.user.id;
  } else if (req.user.role === 'admin' && coachId) {
    const c = await query("SELECT id FROM users WHERE id = $1 AND role IN ('coach','admin')", [coachId]);
    if (c.rows.length === 0) return res.status(400).json({ error: 'invalid_coach' });
    effectiveCoachId = coachId;
  }

  const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  const now = Date.now();
  const approvalStatus = role === 'coach' ? 'pending' : 'approved';

  try {
    await query(
      `INSERT INTO users (id, username, display_name, password_hash, role, coach_id, emoji, color, active, approval_status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,$11)`,
      [id, username, displayName, bcrypt.hashSync(password, 10), role, effectiveCoachId, emoji, color, approvalStatus, now, now]
    );
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'username_taken' });
    console.error('create user error:', e);
    return res.status(500).json({ error: 'db_error', message: e.message });
  }

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

  const { displayName, emoji, color, password, oldPassword, active, coachId, role, approvalStatus } = req.body || {};
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
    const canReset = isAdmin || ownStudent || isSelf;
    if (!canReset) return res.status(403).json({ error: 'forbidden_password_reset' });
    if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
    if (isSelf && !isAdmin && !ownStudent) {
      if (!bcrypt.compareSync(oldPassword || '', target.password_hash))
        return res.status(401).json({ error: 'wrong_password' });
    }
    sets.push(`password_hash = $${i++}`);
    vals.push(bcrypt.hashSync(password, 10));
  }

  if (!sets.length) return res.json(publicUser(target));

  sets.push(`updated_at = $${i++}`); vals.push(Date.now());
  vals.push(target.id);

  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  await log(req.user.id, 'user_updated', target.id, { fields: Object.keys(req.body || {}) });
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_data WHERE user_id = $1', [target.id]);
    await client.query('DELETE FROM coach_notes WHERE coach_id = $1 OR student_id = $1', [target.id]);
    await client.query('UPDATE users SET coach_id = NULL WHERE coach_id = $1', [target.id]);
    await client.query('DELETE FROM users WHERE id = $1', [target.id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('delete user transaction failed:', e);
    return res.status(500).json({ error: 'db_error', message: e.message });
  } finally {
    client.release();
  }

  await log(req.user.id, 'user_deleted', target.id, { username: target.username });
  res.json({ ok: true });
});

/* ============ ADMIN APPROVAL ============ */
app.get('/api/admin/pending-coaches', auth, requireRole('admin'), async (req, res) => {
  const r = await query("SELECT * FROM users WHERE role='coach' AND approval_status='pending' ORDER BY created_at DESC");
  res.json(r.rows.map(publicUser));
});

app.post('/api/admin/approve/:id', auth, requireRole('admin'), async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (tr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await query("UPDATE users SET approval_status='approved', active=1, updated_at=$1 WHERE id=$2",
    [Date.now(), req.params.id]);
  await log(req.user.id, 'coach_approved', req.params.id, {});
  res.json({ ok: true });
});

app.post('/api/admin/reject/:id', auth, requireRole('admin'), async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (tr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await query("UPDATE users SET approval_status='rejected', active=0, updated_at=$1 WHERE id=$2",
    [Date.now(), req.params.id]);
  await log(req.user.id, 'coach_rejected', req.params.id, {});
  res.json({ ok: true });
});

/* ============ USER DATA ============ */
app.get('/api/users/:id/data', auth, async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (tr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  if (!canAccess(req.user, tr.rows[0])) return res.status(403).json({ error: 'forbidden' });

  const r = await query('SELECT key, value FROM user_data WHERE user_id = $1', [req.params.id]);
  const out = {};
  r.rows.forEach(x => { try { out[x.key] = JSON.parse(x.value); } catch {} });
  res.json(out);
});

app.post('/api/users/:id/data/:key', auth, async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (tr.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  if (!canAccess(req.user, tr.rows[0])) return res.status(403).json({ error: 'forbidden' });

  const value = JSON.stringify(req.body?.value ?? null);
  await query(
    `INSERT INTO user_data (user_id, key, value, updated_at) VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [req.params.id, req.params.key, value, Date.now()]
  );
  res.json({ ok: true });
});

/* ============ COACH ============ */
app.get('/api/coach/students', auth, requireRole('coach','admin'), async (req, res) => {
  let rows;
  if (req.user.role === 'coach') {
    rows = (await query('SELECT * FROM users WHERE coach_id = $1 ORDER BY display_name', [req.user.id])).rows;
  } else {
    const cid = req.query.coachId;
    if (cid) {
      rows = (await query("SELECT * FROM users WHERE coach_id = $1 AND role='student' ORDER BY display_name", [cid])).rows;
    } else {
      rows = (await query("SELECT * FROM users WHERE role='student' ORDER BY display_name")).rows;
    }
  }
  if (rows.length === 0) return res.json([]);

  const ids = rows.map(r => r.id);
  const dataR = await query(
    `SELECT user_id, key, value FROM user_data
     WHERE user_id = ANY($1::text[]) AND key IN ('workout','history')`,
    [ids]
  );
  const dataByUser = {};
  dataR.rows.forEach(r => {
    dataByUser[r.user_id] = dataByUser[r.user_id] || {};
    try { dataByUser[r.user_id][r.key] = JSON.parse(r.value); } catch {}
  });

  const now = Date.now();
  const out = rows.map(s => {
    const du = dataByUser[s.id] || {};
    const workout = du.workout, hist = du.history;
    const completedCount = workout?.completed ? Object.values(workout.completed).filter(Boolean).length : 0;
    let volume = 0;
    Object.values(workout?.logs || {}).forEach(a => {
      Object.values(a || {}).forEach(l => {
        if (l?.weight && l?.reps) volume += l.weight * l.reps;
      });
    });
    let s7 = 0, v7 = 0;
    if (hist) Object.keys(hist).forEach(k => {
      const t = new Date(k).getTime();
      if (now - t < 7*86400000) {
        if ((hist[k].completed || 0) > 0) s7++;
        v7 += hist[k].volume || 0;
      }
    });
    return { ...publicUser(s), stats: { completedCount, volume: Math.round(volume), sessions7: s7, volume7: Math.round(v7) } };
  });
  res.json(out);
});

app.get('/api/coach/students/:id/overview', auth, requireRole('coach','admin'), async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const target = tr.rows[0];
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (req.user.role === 'coach' && target.coach_id !== req.user.id)
    return res.status(403).json({ error: 'not_own_student' });

  const keys = ['workout','history','program','body','permissions','nutrition','coachRequest'];
  const dataR = await query(
    'SELECT key, value FROM user_data WHERE user_id = $1 AND key = ANY($2::text[])',
    [target.id, keys]
  );
  const data = {};
  keys.forEach(k => data[k] = null);
  dataR.rows.forEach(row => {
    try { data[row.key] = JSON.parse(row.value); } catch { data[row.key] = null; }
  });

  const nr = await query('SELECT * FROM coach_notes WHERE student_id=$1 ORDER BY created_at DESC', [target.id]);
  res.json({
    student: publicUser(target),
    data,
    notes: nr.rows.map(n => ({ ...n, created_at: Number(n.created_at) }))
  });
});

app.post('/api/coach/students/:id/notes', auth, requireRole('coach','admin'), async (req, res) => {
  const tr = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const target = tr.rows[0];
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (req.user.role === 'coach' && target.coach_id !== req.user.id)
    return res.status(403).json({ error: 'not_own_student' });

  const { content, type = 'general' } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'empty' });

  const r = await query(
    'INSERT INTO coach_notes (coach_id, student_id, content, type, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.user.id, target.id, content.trim(), type, Date.now()]
  );
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

/* ============ AUDIT ============ */
app.get('/api/admin/audit', auth, requireRole('admin'), async (req, res) => {
  const r = await query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 300');
  res.json(r.rows.map(row => ({ ...row, created_at: Number(row.created_at) })));
});

/* ============ SPA FALLBACK ============ */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ============ ERROR HANDLER ============ */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'server_error', message: err.message });
});

/* ============ WIPE ============ */
async function wipeIfRequested() {
  if (process.env.WIPE_DB === 'true') {
    console.log('⚠️  WIPE_DB=true — wiping database');
    await query('DELETE FROM user_data');
    await query('DELETE FROM coach_notes');
    await query('DELETE FROM audit_log');
    await query("DELETE FROM users WHERE role != 'admin'");
    console.log('✅ Wiped (admin preserved)');
  }
}

/* ============ SHUTDOWN ============ */
let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 ${signal}, shutting down...`);
  try { await pool.end(); } catch (e) {}
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('🔥 Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('🔥 Uncaught exception:', err));

/* ============ START ============ */
(async () => {
  try {
    await initSchema();
    await wipeIfRequested();
    await bootstrapAdmin();
    app.listen(PORT, () => {
      console.log('\n🚀 ProFit running on port ' + PORT + '\n');
      console.log('✅ Service ready at: http://localhost:' + PORT);
    });
  } catch(e) {
    console.error('❌ Startup failed:', e);
    process.exit(1);
  }
})();
