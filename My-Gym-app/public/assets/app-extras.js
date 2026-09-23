/* ============================================================
   ProFit Extras v1.0 — Polish + Guide + Export
   این فایل بعد از اسکریپت اصلی لود می‌شود و آن را تقویت می‌کند
   ============================================================ */
(function() {
'use strict';

/* ============================================================
   PART 1: POLISH — Custom Confirm (Named Function Only)
   ============================================================ */
// Note: نمیتونیم window.confirm رو override کنیم چون کد اصلی ازش
// به صورت synchronous استفاده میکنه. پس یه تابع جدید میذاریم.

window.askConfirm = function(message, title) {
  return new Promise((resolve) => {
    let modal = document.getElementById('askConfirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'askConfirmModal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
      modal.innerHTML = `
        <div style="background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:22px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)">
          <div style="font-size:2rem;text-align:center;margin-bottom:10px">⚠️</div>
          <div id="askConfirmTitle" style="font-size:.95rem;font-weight:800;text-align:center;color:var(--tx);margin-bottom:6px"></div>
          <div id="askConfirmMessage" style="font-size:.82rem;font-weight:600;line-height:1.8;text-align:center;color:var(--tx2);margin-bottom:18px"></div>
          <div style="display:flex;gap:8px">
            <button id="askConfirmCancel" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--bd);background:var(--card2);color:var(--tx);font-family:inherit;font-weight:700;font-size:.85rem;cursor:pointer">لغو</button>
            <button id="askConfirmOk" style="flex:1;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#f43f5e,#be123c);color:#fff;font-family:inherit;font-weight:700;font-size:.85rem;cursor:pointer">تأیید</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      modal.querySelector('#askConfirmOk').onclick = () => {
        modal.style.display = 'none';
        if (window._askConfirmResolve) { window._askConfirmResolve(true); window._askConfirmResolve = null; }
      };
      modal.querySelector('#askConfirmCancel').onclick = () => {
        modal.style.display = 'none';
        if (window._askConfirmResolve) { window._askConfirmResolve(false); window._askConfirmResolve = null; }
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
          if (window._askConfirmResolve) { window._askConfirmResolve(false); window._askConfirmResolve = null; }
        }
      };
    }

    document.getElementById('askConfirmTitle').textContent = title || 'تأیید';
    document.getElementById('askConfirmMessage').textContent = message;
    modal.style.display = 'flex';
    window._askConfirmResolve = resolve;
  });
};

// Note: For existing code that used confirm() synchronously, we need
// to convert to async. We patch functions that use it.
// Existing code will work if the await keyword is added — but for backwards
// compat, keep _originalConfirm as fallback for critical paths.

/* ============================================================
   PART 2: POLISH — Toast with Actions
   ============================================================ */

const _originalToast = window.toast;
window.toastWithAction = function(msg, actionLabel, actionFn, type = 'info') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.style.cssText = 'pointer-events:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap';

  const ic = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };

  el.innerHTML = `
    <span>${ic[type] || 'ℹ️'}</span>
    <span style="flex:1">${msg}</span>
    <button style="padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);color:#fff;font-family:inherit;font-weight:800;font-size:.7rem;cursor:pointer;white-space:nowrap">${actionLabel}</button>`;

  const btn = el.querySelector('button');
  btn.onclick = () => {
    try { actionFn(); } catch(e) { console.error(e); }
    el.remove();
  };

  c.appendChild(el);
  setTimeout(() => el.remove(), 6000);
};

/* ============================================================
   PART 3: POLISH — Offline Detection
   ============================================================ */

let offlineBanner = null;
function checkOnline() {
  if (!navigator.onLine) {
    if (!offlineBanner) {
      offlineBanner = document.createElement('div');
      offlineBanner.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9998;background:linear-gradient(135deg,#f43f5e,#be123c);color:#fff;padding:8px 16px;border-radius:20px;font-size:.78rem;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;align-items:center;gap:6px;pointer-events:none';
      offlineBanner.innerHTML = '<span>📡</span><span>اتصال اینترنت قطع است — تغییرات بعداً ذخیره می‌شوند</span>';
      document.body.appendChild(offlineBanner);
    }
  } else if (offlineBanner) {
    offlineBanner.remove();
    offlineBanner = null;
  }
}
window.addEventListener('online', checkOnline);
window.addEventListener('offline', checkOnline);
checkOnline();

/* ============================================================
   PART 4: POLISH — Autosave Indicator
   ============================================================ */

let autosaveTimer = null;
let autosaveIndicator = null;
function showAutosaveIndicator(text = 'در حال ذخیره...', done = false) {
  if (!autosaveIndicator) {
    autosaveIndicator = document.createElement('div');
    autosaveIndicator.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9997;background:var(--card);border:1px solid var(--bd);color:var(--tx);padding:6px 14px;border-radius:20px;font-size:.72rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;align-items:center;gap:6px;pointer-events:none;opacity:0;transition:opacity .3s';
    document.body.appendChild(autosaveIndicator);
  }
  autosaveIndicator.innerHTML = done
    ? '<span style="color:#10b981">✓</span><span>ذخیره شد</span>'
    : '<span class="spinner" style="border-color:var(--tx2);border-top-color:transparent"></span><span>' + text + '</span>';
  autosaveIndicator.style.opacity = '1';
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveIndicator.style.opacity = '0';
  }, done ? 1500 : 800);
}
window.showAutosaveIndicator = showAutosaveIndicator;

/* ============================================================
   PART 5: EXPORT — Full Backup & Restore
   ============================================================ */

// Export all data for a user (self or via coach/admin)
async function exportUserData(userId, username) {
  try {
    showAutosaveIndicator('در حال آماده‌سازی بکاپ...');
    const d = await api('GET', '/api/users/' + userId + '/data');

    const backup = {
      _meta: {
        type: 'profit-user-backup',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId: userId,
        username: username || 'unknown'
      },
      data: d
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profit-backup-' + (username || userId) + '-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAutosaveIndicator('بکاپ دانلود شد', true);
    if (window.toast) toast('بکاپ دانلود شد ✓');
  } catch (e) {
    console.error('export error:', e);
    if (window.toast) toast('خطا در export: ' + e.message, 'error');
  }
}
window.exportUserData = exportUserData;

// Import user data (restore from backup)
async function importUserData(userId) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) { resolve(false); return; }

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup._meta || backup._meta.type !== 'profit-user-backup') {
          toast('فایل بکاپ معتبر نیست', 'error');
          resolve(false);
          return;
        }

        const fields = Object.keys(backup.data || {});
        const ok = await confirm(
          'این بکاپ شامل ' + fields.length + ' بخش داده است:\n' +
          fields.slice(0, 8).map(f => '• ' + f).join('\n') +
          (fields.length > 8 ? '\n... و ' + (fields.length - 8) + ' مورد دیگر' : '') +
          '\n\n⚠️ داده‌های فعلی با این بکاپ جایگزین می‌شوند. ادامه؟'
        );
        if (!ok) { resolve(false); return; }

        showAutosaveIndicator('در حال بازیابی...');
        let count = 0;
        for (const key of fields) {
          await api('POST', '/api/users/' + userId + '/data/' + key, { value: backup.data[key] });
          count++;
        }
        showAutosaveIndicator('بازیابی کامل شد', true);
        toast('✓ ' + count + ' بخش بازیابی شد', 'success');

        // Reload page to see new data
        setTimeout(() => location.reload(), 1200);
        resolve(true);
      } catch (err) {
        console.error('import error:', err);
        toast('خطا: ' + err.message, 'error');
        resolve(false);
      }
    };
    input.click();
  });
}
window.importUserData = importUserData;

/* ============================================================
   PART 6: EXPORT — CSV Workout Logs
   ============================================================ */

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell == null ? '' : cell);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');

  // BOM for Excel UTF-8
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportWorkoutCSV() {
  try {
    const userId = state.user.id;
    const d = await api('GET', '/api/users/' + userId + '/data');
    const workout = d.workout || { logs: {}, completed: {} };
    const history = d.history || {};
    const program = d.program || { days: [] };

    // Build map of exKey -> exercise name
    const exNameMap = {};
    (program.days || []).forEach(day => {
      (day.exercises || []).forEach((ex, i) => {
        const def = (window.PRO_DATA?.exercises || []).find(e => e.id === ex.exId) || {};
        exNameMap[i] = def.name || ex.exId;
      });
    });

    // Header
    const rows = [['تاریخ', 'شماره حرکت', 'نام حرکت', 'ست', 'وزنه (kg)', 'تکرار', 'حجم (kg)', 'انجام‌شده']];

    // Sort keys by date then index
    const allKeys = new Set([...Object.keys(workout.logs || {}), ...Object.keys(workout.completed || {})]);
    const sortedKeys = Array.from(allKeys).sort();

    sortedKeys.forEach(key => {
      const [date, idxStr] = key.split(':');
      const idx = parseInt(idxStr);
      const logs = workout.logs[key] || {};
      const isDone = !!workout.completed[key];

      const setKeys = Object.keys(logs).sort((a, b) => parseInt(a) - parseInt(b));
      if (setKeys.length === 0 && !isDone) return;

      if (setKeys.length === 0) {
        rows.push([date, idx + 1, exNameMap[idx] || ('حرکت ' + (idx + 1)), '-', '-', '-', '0', isDone ? 'بله' : 'خیر']);
      } else {
        setKeys.forEach(si => {
          const l = logs[si] || {};
          const vol = (l.weight && l.reps) ? l.weight * l.reps : 0;
          rows.push([
            date,
            idx + 1,
            exNameMap[idx] || ('حرکت ' + (idx + 1)),
            parseInt(si) + 1,
            l.weight || '',
            l.reps || '',
            vol,
            isDone ? 'بله' : 'خیر'
          ]);
        });
      }
    });

    // Add summary rows
    rows.push([]);
    rows.push(['--- خلاصه تاریخچه ---']);
    rows.push(['تاریخ', 'جلسات', 'حجم کل (kg)']);
    Object.keys(history).sort().forEach(k => {
      rows.push([k, history[k].completed || 0, history[k].volume || 0]);
    });

    const filename = 'workout-log-' + new Date().toISOString().slice(0,10) + '.csv';
    downloadCSV(filename, rows);
    toast('CSV دانلود شد ✓');
  } catch (e) {
    console.error('CSV error:', e);
    toast('خطا: ' + e.message, 'error');
  }
}
window.exportWorkoutCSV = exportWorkoutCSV;

/* ============================================================
   PART 7: EXPORT — Nutrition CSV
   ============================================================ */

async function exportNutritionCSV() {
  try {
    const userId = state.user.id;
    const d = await api('GET', '/api/users/' + userId + '/data');
    const nutrition = d.nutrition || {};
    const profile = nutrition.profile || {};
    const targets = nutrition.targets || {};
    const meals = nutrition.meals || {};
    const supplements = nutrition.supplements || [];

    const rows = [['--- پروفایل ---']];
    rows.push(['جنسیت', profile.gender === 'male' ? 'مرد' : 'زن']);
    rows.push(['سن', profile.age || '']);
    rows.push(['وزن (kg)', profile.weight || '']);
    rows.push(['قد (cm)', profile.height || '']);
    rows.push(['سطح فعالیت', profile.activity || '']);
    rows.push(['هدف', profile.goal || '']);
    rows.push(['فرمول BMR', profile.formula || '']);

    if (targets && targets.calories) {
      rows.push([]);
      rows.push(['--- اهداف روزانه ---']);
      rows.push(['BMR', targets.bmr || '']);
      rows.push(['TDEE', targets.tdee || '']);
      rows.push(['کالری', targets.calories || '']);
      rows.push(['پروتئین (g)', targets.protein || '']);
      rows.push(['کربوهیدرات (g)', targets.carbs || '']);
      rows.push(['چربی (g)', targets.fat || '']);
    }

    rows.push([]);
    rows.push(['--- برنامه غذایی ---']);
    rows.push(['وعده', 'غذا', 'مقدار', 'واحد', 'کالری', 'پروتئین', 'کرب', 'چربی']);

    const mealDefs = window.PRO_NUTRITION?.meals || [];
    mealDefs.forEach(meal => {
      const items = meals[meal.key] || [];
      if (items.length === 0) {
        rows.push([meal.name, '— خالی —', '', '', '', '', '', '']);
        return;
      }
      items.forEach(it => {
        const food = (window.PRO_NUTRITION?.foods || []).find(f => f.id === it.foodId);
        if (!food) return;
        const unit = (food.units && food.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        const grams = (it.qty || 0) * unit.g;
        const k = grams / 100;
        rows.push([
          meal.name,
          food.name,
          it.qty,
          unit.n,
          Math.round((food.cal || 0) * k),
          Math.round((food.prot || 0) * k * 10) / 10,
          Math.round((food.carb || 0) * k * 10) / 10,
          Math.round((food.fat || 0) * k * 10) / 10
        ]);
      });
    });

    if (supplements.length > 0) {
      rows.push([]);
      rows.push(['--- مکمل‌ها ---']);
      rows.push(['نام', 'دوز', 'زمان', 'فعال']);
      supplements.forEach(s => {
        rows.push([s.name, s.dose || '', s.timing || '', s.enabled ? 'بله' : 'خیر']);
      });
    }

    const filename = 'nutrition-plan-' + new Date().toISOString().slice(0,10) + '.csv';
    downloadCSV(filename, rows);
    toast('CSV تغذیه دانلود شد ✓');
  } catch (e) {
    console.error('Nutrition CSV error:', e);
    toast('خطا: ' + e.message, 'error');
  }
}
window.exportNutritionCSV = exportNutritionCSV;

/* ============================================================
   PART 8: EXPORT — Body Measurements CSV
   ============================================================ */

async function exportBodyCSV() {
  try {
    const userId = state.user.id;
    const d = await api('GET', '/api/users/' + userId + '/data');
    const body = d.body || [];

    if (body.length === 0) {
      toast('داده‌ای برای export نیست', 'warn');
      return;
    }

    const metrics = [
      { key: 'weight', name: 'وزن (kg)' },
      { key: 'bodyfat', name: 'چربی (%)' },
      { key: 'neck', name: 'گردن (cm)' },
      { key: 'chest', name: 'سینه (cm)' },
      { key: 'waist', name: 'کمر (cm)' },
      { key: 'hip', name: 'باسن (cm)' },
      { key: 'arm', name: 'بازو (cm)' },
      { key: 'forearm', name: 'ساعد (cm)' },
      { key: 'thigh', name: 'ران (cm)' },
      { key: 'calf', name: 'ساق (cm)' }
    ];

    const header = ['تاریخ', ...metrics.map(m => m.name)];
    const rows = [header];

    body.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
      const row = [e.date];
      metrics.forEach(m => row.push(e[m.key] != null ? e[m.key] : ''));
      rows.push(row);
    });

    const filename = 'body-measurements-' + new Date().toISOString().slice(0,10) + '.csv';
    downloadCSV(filename, rows);
    toast('CSV اندازه‌های بدن دانلود شد ✓');
  } catch (e) {
    console.error('Body CSV error:', e);
    toast('خطا: ' + e.message, 'error');
  }
}
window.exportBodyCSV = exportBodyCSV;

/* ============================================================
   PART 9: EXPORT — Print / PDF Report
   ============================================================ */

async function printReport() {
  try {
    const userId = state.user.id;
    const d = await api('GET', '/api/users/' + userId + '/data');
    const program = d.program || { days: [] };
    const workout = d.workout || {};
    const history = d.history || {};
    const nutrition = d.nutrition || {};
    const body = d.body || [];

    // Compute weekly stats
    const now = Date.now();
    let sessions7 = 0, volume7 = 0;
    Object.keys(history).forEach(k => {
      const t = new Date(k).getTime();
      if (now - t < 7 * 86400000) {
        if ((history[k].completed || 0) > 0) sessions7++;
        volume7 += history[k].volume || 0;
      }
    });

    const u = state.user;
    const roles = { admin: 'مدیر', coach: 'مربی', student: 'شاگرد' };

    const html = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>گزارش ProFit — ${u.displayName}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Vazirmatn', sans-serif; }
  body { padding: 20px; background: #fff; color: #0f172a; line-height: 1.7; }
  .header { text-align: center; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; }
  .header h1 { font-size: 1.6rem; color: #3b82f6; margin-bottom: 6px; }
  .header .sub { font-size: .8rem; color: #64748b; }
  .section { margin-bottom: 24px; page-break-inside: avoid; }
  .section h2 { font-size: 1rem; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .stat { padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .stat .lbl { font-size: .7rem; color: #64748b; font-weight: 600; }
  .stat .val { font-size: 1.2rem; font-weight: 800; color: #3b82f6; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: .78rem; margin-bottom: 12px; }
  th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 700; color: #475569; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  .day-block { margin-bottom: 14px; page-break-inside: avoid; }
  .day-block h3 { font-size: .9rem; color: #1e293b; margin-bottom: 6px; padding-right: 8px; border-right: 3px solid #3b82f6; }
  .footer { text-align: center; padding-top: 20px; margin-top: 30px; border-top: 1px solid #e2e8f0; font-size: .7rem; color: #94a3b8; }
  @media print {
    body { padding: 12px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>🏋️ گزارش ProFit</h1>
    <div class="sub">${u.displayName} — @${u.username} — ${roles[u.role] || u.role}</div>
    <div class="sub" style="margin-top:4px">تاریخ: ${new Date().toLocaleDateString('fa-IR')}</div>
  </div>

  <div class="section">
    <h2>📊 آمار این هفته</h2>
    <div class="grid">
      <div class="stat"><div class="lbl">جلسات</div><div class="val">${sessions7}</div></div>
      <div class="stat"><div class="lbl">حجم کل (kg)</div><div class="val">${Math.round(volume7).toLocaleString('fa-IR')}</div></div>
      <div class="stat"><div class="lbl">روزهای برنامه</div><div class="val">${(program.days || []).length}</div></div>
    </div>
  </div>

  ${(program.days && program.days.length) ? `
  <div class="section">
    <h2>🗓️ برنامه تمرینی</h2>
    ${program.days.map(day => `
      <div class="day-block">
        <h3>${day.icon || '💪'} ${day.name} — ${day.focus || ''}</h3>
        <table>
          <thead><tr><th>#</th><th>حرکت</th><th>ست</th><th>تکرار</th><th>RPE</th></tr></thead>
          <tbody>
            ${(day.exercises || []).map((ex, i) => {
              const def = (window.PRO_DATA?.exercises || []).find(e => e.id === ex.exId) || {};
              return '<tr><td>' + (i + 1) + '</td><td>' + (def.name || ex.exId) + '</td><td>' + (ex.sets || 3) + '</td><td>' + (ex.reps || '—') + '</td><td>' + (ex.rpe || '—') + '</td></tr>';
            }).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </div>` : ''}

  ${(nutrition.targets) ? `
  <div class="section">
    <h2>🥗 اهداف تغذیه</h2>
    <div class="grid">
      <div class="stat"><div class="lbl">BMR</div><div class="val">${(nutrition.targets.bmr || 0).toLocaleString('fa-IR')}</div></div>
      <div class="stat"><div class="lbl">TDEE</div><div class="val">${(nutrition.targets.tdee || 0).toLocaleString('fa-IR')}</div></div>
      <div class="stat"><div class="lbl">کالری هدف</div><div class="val">${(nutrition.targets.calories || 0).toLocaleString('fa-IR')}</div></div>
    </div>
    <table>
      <thead><tr><th>پروتئین</th><th>کربوهیدرات</th><th>چربی</th></tr></thead>
      <tbody><tr>
        <td>${nutrition.targets.protein || 0} g</td>
        <td>${nutrition.targets.carbs || 0} g</td>
        <td>${nutrition.targets.fat || 0} g</td>
      </tr></tbody>
    </table>
  </div>` : ''}

  ${(body.length) ? `
  <div class="section">
    <h2>📏 آخرین اندازه‌های بدن</h2>
    <table>
      <thead><tr><th>تاریخ</th><th>وزن</th><th>چربی</th><th>کمر</th><th>بازو</th></tr></thead>
      <tbody>
        ${body.slice(-10).reverse().map(e => `
          <tr>
            <td>${e.date}</td>
            <td>${e.weight != null ? e.weight + ' kg' : '—'}</td>
            <td>${e.bodyfat != null ? e.bodyfat + '%' : '—'}</td>
            <td>${e.waist != null ? e.waist + ' cm' : '—'}</td>
            <td>${e.arm != null ? e.arm + ' cm' : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <div class="footer">
    گزارش تولیدشده توسط ProFit — ${new Date().toLocaleString('fa-IR')}
  </div>

  <div class="no-print" style="position:fixed;bottom:20px;left:20px;display:flex;gap:8px">
    <button onclick="window.print()" style="padding:10px 20px;border-radius:10px;border:none;background:#3b82f6;color:#fff;font-family:inherit;font-weight:800;font-size:.85rem;cursor:pointer;box-shadow:0 8px 20px rgba(59,130,246,.4)">🖨️ چاپ / ذخیره PDF</button>
    <button onclick="window.close()" style="padding:10px 20px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-family:inherit;font-weight:800;font-size:.85rem;cursor:pointer">بستن</button>
  </div>
  <script>
    window.PRO_DATA = ${JSON.stringify(window.PRO_DATA || {})};
  <\/script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { toast('پاپ‌آپ بلاک شده — اجازه بده', 'warn'); return; }
    w.document.write(html);
    w.document.close();
  } catch (e) {
    console.error('Print error:', e);
    toast('خطا: ' + e.message, 'error');
  }
}
window.printReport = printReport;

/* ============================================================
   PART 10: EXPORT DRAWER UI
   ============================================================ */

function openExportDrawer() {
  let drawer = document.getElementById('exportDrawer');
  let backdrop = document.getElementById('exportBackdrop');

  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'exportBackdrop';
    backdrop.className = 'backdrop';
    backdrop.onclick = () => closeDrawer('exportDrawer');
    document.body.appendChild(backdrop);

    drawer = document.createElement('div');
    drawer.id = 'exportDrawer';
    drawer.className = 'drawer right';
    drawer.innerHTML = `
      <div class="drawer-header">
        <h2>📤 خروجی و بکاپ</h2>
        <button class="close-btn" onclick="closeDrawer('exportDrawer')">✕</button>
      </div>
      <div class="drawer-body" id="exportDrawerBody"></div>`;
    document.body.appendChild(drawer);
  }

  renderExportBody();
  openDrawer('exportDrawer');
}
window.openExportDrawer = openExportDrawer;

function renderExportBody() {
  const el = document.getElementById('exportDrawerBody');
  if (!el) return;

  const u = window.state?.user;
  if (!u) { el.innerHTML = '<div class="empty">لطفاً وارد شوید</div>'; return; }

  const isAdmin = u.role === 'admin';

  el.innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div style="font-size:.78rem;color:var(--tx2);line-height:1.9">
        💾 از این بخش می‌تونی داده‌هات رو دانلود یا بازیابی کنی.
      </div>
    </div>

    <div class="sh">📦 بکاپ کامل (JSON)</div>
    <button class="btn primary full" style="margin-bottom:8px;justify-content:flex-start;padding:14px" onclick="exportUserData('${u.id}','${u.username}')">
      <span style="font-size:1.2rem">💾</span>
      <div style="flex:1;text-align:right">
        <div style="font-weight:800">دانلود بکاپ کامل</div>
        <div style="font-size:.68rem;opacity:.8;font-weight:500">همه داده‌ها: برنامه، تغذیه، اندازه‌ها، پیشرفت</div>
      </div>
    </button>
    <button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="importUserData('${u.id}')">
      <span style="font-size:1.2rem">📥</span>
      <div style="flex:1;text-align:right">
        <div style="font-weight:800">بازیابی از بکاپ</div>
        <div style="font-size:.68rem;color:var(--tx2);font-weight:500">یک فایل JSON بارگذاری کن</div>
      </div>
    </button>

    <div class="sh">📊 خروجی CSV (Excel)</div>
    <button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportWorkoutCSV()">
      <span style="font-size:1.1rem">🏋️</span>
      <span style="flex:1;text-align:right;font-size:.82rem">سابقه تمرینات</span>
    </button>
    <button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportNutritionCSV()">
      <span style="font-size:1.1rem">🥗</span>
      <span style="flex:1;text-align:right;font-size:.82rem">برنامه غذایی</span>
    </button>
    <button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:12px" onclick="exportBodyCSV()">
      <span style="font-size:1.1rem">📏</span>
      <span style="flex:1;text-align:right;font-size:.82rem">اندازه‌های بدن</span>
    </button>

    <div class="sh">🖨️ گزارش چاپی / PDF</div>
    <button class="btn success full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="printReport()">
      <span style="font-size:1.2rem">📄</span>
      <div style="flex:1;text-align:right">
        <div style="font-weight:800">گزارش کامل</div>
        <div style="font-size:.68rem;opacity:.9;font-weight:500">شامل برنامه، تغذیه و آمار</div>
      </div>
    </button>

    ${isAdmin ? `
      <div class="sh">👑 خروجی مدیر</div>
      <button class="btn admin full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportAllUsersBackup()">
        <span style="font-size:1.1rem">👥</span>
        <div style="flex:1;text-align:right">
          <div style="font-weight:800;font-size:.82rem">بکاپ همه کاربران</div>
          <div style="font-size:.66rem;opacity:.9;font-weight:500">JSON با اطلاعات همه</div>
        </div>
      </button>
    ` : ''}
  `;
}

async function exportAllUsersBackup() {
  try {
    showAutosaveIndicator('در حال آماده‌سازی...');
    const allUsers = await api('GET', '/api/users');
    const backup = {
      _meta: { type: 'profit-db-backup', version: '1.0', exportedAt: new Date().toISOString(), count: allUsers.length },
      users: []
    };

    for (const u of allUsers) {
      try {
        const d = await api('GET', '/api/users/' + u.id + '/data');
        backup.users.push({ user: u, data: d });
      } catch (e) {
        backup.users.push({ user: u, data: null, error: e.message });
      }
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profit-full-backup-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAutosaveIndicator('آماده شد', true);
    toast('بکاپ کامل دانلود شد ✓');
  } catch (e) {
    toast('خطا: ' + e.message, 'error');
  }
}
window.exportAllUsersBackup = exportAllUsersBackup;

/* ============================================================
   PART 11: GUIDE — Help Drawer
   ============================================================ */

const HELP_CONTENT = {
  student: {
    icon: '🎓',
    title: 'راهنمای شاگرد',
    sections: [
      {
        title: '🚀 شروع سریع',
        items: [
          { q: 'چطور برنامه بسازم؟', a: 'به تب «برنامه» برو. سه گزینه داری: <b>هوشمند</b> (با سؤال جواب)، <b>دستی</b> (خودت طراحی کن) یا <b>ارجاع به مربی</b> (حرفه‌ای برنامه‌ت رو می‌نویسه).' },
          { q: 'تفاوت هوشمند و دستی چیه؟', a: '<b>هوشمند</b>: با چند سؤال، برنامه آماده بهت می‌ده. <b>دستی</b>: خودت روز، حرکت، ست و تکرار رو انتخاب می‌کنی. برای شروع، هوشمند راحت‌تره.' },
          { q: 'چطور به مربی وصل شم؟', a: 'تب «برنامه» → «ارجاع به مربی». می‌تونی یه مربی خاص انتخاب کنی یا بذاری مدیر برات انتخاب کنه. بعد از تأیید، مربی برنامه‌ت رو می‌نویسه.' }
        ]
      },
      {
        title: '💪 تمرین کردن',
        items: [
          { q: 'چطور یه حرکت رو انجام‌شده علامت بزنم؟', a: 'تیک سبز کنار هر حرکت رو بزن. کارت خودش کوچیک می‌شه.' },
          { q: 'وزنه و تکرار رو چطور وارد کنم؟', a: 'توی جدول هر حرکت، ستون «وزنه» و «تکرار» رو پر کن. دکمه ⤴ روی هر ست، از ست قبلی کپی می‌کنه.' },
          { q: 'تایمر ست چیه؟', a: 'دکمه ▶ کنار هر ست، زمان استراحت رو می‌شماره. دکمه ⏸ توقف می‌کنه.' },
          { q: 'گیف‌ها رو کجا ببینم؟', a: 'روی هر کارت حرکت کلیک کن تا باز بشه. گیف متحرک نحوه انجام رو نشون می‌ده.' }
        ]
      },
      {
        title: '🥗 تغذیه',
        items: [
          { q: 'چطور کالری روزانم رو حساب کنم؟', a: 'تب «تغذیه» → تب «محاسبه». اطلاعات بدنی رو پر کن و «محاسبه» رو بزن. BMR، TDEE و اهداف درشت‌مغذی نشون داده می‌شه.' },
          { q: 'چطور غذا اضافه کنم؟', a: 'تب «غذاها» → روی وعده بزن تا باز شه → «افزودن غذا» → از لیست انتخاب کن.' },
          { q: 'مکمل‌ها رو چطور عوض کنم؟', a: 'تب «مکمل‌ها» → دکمه «بازتولید پیشنهادها». بر اساس هدف جدید، پیشنهادها آپدیت می‌شن.' }
        ]
      },
      {
        title: '📊 پیشرفت و بدن',
        items: [
          { q: 'چطور اندازه‌هام رو ثبت کنم؟', a: 'تب «بدن». هر روز می‌تونی وزن، چربی، دور کمر و... رو وارد کنی. نمودار تغییرات خودکار ساخته می‌شه.' },
          { q: 'نمودار پیشرفت از کجا میاد؟', a: 'تب «پیشرفت». از داده‌های تمرین و اندازه‌ها ساخته می‌شه.' }
        ]
      },
      {
        title: '📤 خروجی گرفتن',
        items: [
          { q: 'چطور بکاپ بگیرم؟', a: 'روی آیکن 👤 بالا → «خروجی و بکاپ» → «دانلود بکاپ کامل». یه فایل JSON شامل همه داده‌هات می‌گیری.' },
          { q: 'چطور داده‌ها رو به Excel ببرم؟', a: 'توی بخش خروجی، دکمه «CSV» رو بزن. فایل با Excel باز می‌شه.' },
          { q: 'گزارش چاپی چیه؟', a: 'دکمه «گزارش کامل» → یه صفحه باز می‌شه که می‌تونی چاپ کنی یا PDF ذخیره کنی. مناسب برای نشون دادن به مربی.' }
        ]
      }
    ]
  },
  coach: {
    icon: '👨‍🏫',
    title: 'راهنمای مربی',
    sections: [
      {
        title: '👥 مدیریت شاگردان',
        items: [
          { q: 'چطور شاگرد اضافه کنم؟', a: 'پنل مربی → «افزودن شاگرد» → اطلاعات رو پر کن. شاگرد بلافاصله فعال می‌شه.' },
          { q: 'شاگردانم کجان؟', a: 'پنل مربی، لیست همه شاگردان با آمار این هفته. روی هر شاگرد بزن تا جزئیات کامل ببینی.' }
        ]
      },
      {
        title: '📨 درخواست‌های برنامه',
        items: [
          { q: 'درخواست شاگرد کجا میاد؟', a: 'توی پنل مربی، بالای صفحه، بخش نارنجی «درخواست‌های برنامه». اگه شاگردی شما رو انتخاب کرده یا درخواست آزاده، اینجا نشون داده می‌شه.' },
          { q: 'چطور درخواست رو قبول کنم؟', a: 'روی «✓ قبول می‌کنم» بزن. شاگرد به لیست شاگردانت اضافه می‌شه و می‌تونی برنامه‌اش رو بنویسی.' },
          { q: 'اگه نمی‌خوام قبول کنم؟', a: 'کاری نکن. درخواست باقی می‌مونه و اگه شاگرد شما رو انتخاب نکرده باشه، مربی دیگه‌ای می‌تونه قبولش کنه.' }
        ]
      },
      {
        title: '✏️ نوشتن برنامه',
        items: [
          { q: 'چطور برنامه بنویسم؟', a: 'پنل مربی → روی شاگرد بزن → «ویرایش برنامه». روز اضافه کن، حرکت بذار، ست و تکرار تنظیم کن.' },
          { q: 'می‌تونم به شاگرد اجازه ویرایش بدم؟', a: 'بله. توی جزئیات شاگرد، دکمه «دادن اجازه ویرایش برنامه» رو بزن.' },
          { q: 'می‌تونم تغذیه‌اش رو هم تنظیم کنم؟', a: 'بله. توی جزئیات شاگرد → «ویرایش تغذیه». کامل می‌تونی تغییر بدی.' }
        ]
      }
    ]
  },
  admin: {
    icon: '👑',
    title: 'راهنمای مدیر',
    sections: [
      {
        title: '⏳ تأیید مربی',
        items: [
          { q: 'چطور مربی تأیید کنم؟', a: 'پنل مدیر → تب «مربیان» → روی ✅ بزن. بعد از تأیید، مربی می‌تونه وارد شه.' },
          { q: 'اگه مربی اشتباه ثبت‌نام کرد؟', a: 'توی تب «کاربران» می‌تونی نقش رو عوض کنی، غیرفعال کنی یا حذف کنی.' }
        ]
      },
      {
        title: '📨 درخواست‌های برنامه',
        items: [
          { q: 'درخواست‌ها کجان؟', a: 'تب «درخواست برنامه» توی پنل مدیر. اگه badge قرمز داری یعنی درخواست جدید هست.' },
          { q: 'چطور به مربی تخصیص بدم؟', a: 'از dropdown مربی انتخاب کن → «✅ تخصیص». اگه شاگرد مربی خاصی رو انتخاب کرده، خودکار انتخاب می‌شه.' },
          { q: 'اگه رد کنم چی می‌شه؟', a: 'روی ❌ بزن. درخواست برای شاگرد رد شده علامت می‌خوره و می‌تونه دوباره درخواست بده.' }
        ]
      },
      {
        title: '👥 مدیریت کاربران',
        items: [
          { q: 'چطور کاربر بسازم؟', a: 'تب «کاربران» → «افزودن کاربر». می‌تونی نقش شاگرد، مربی یا مدیر بدی.' },
          { q: 'چطور رمز کاربر رو عوض کنم؟', a: 'روی 🔑 بزن و رمز جدید بذار.' },
          { q: 'غیرفعال کردن کاربر چطوره؟', a: 'روی 🚫 بزن. کاربر نمی‌تونه وارد شه ولی داده‌هاش حفظ می‌شه.' }
        ]
      },
      {
        title: '📤 خروجی گرفتن',
        items: [
          { q: 'چطور بکاپ کل بگیرم؟', a: 'روی آیکن 👤 → «خروجی و بکاپ» → «بکاپ همه کاربران». یه فایل JSON از همه چی.' }
        ]
      }
    ]
  }
};

function openHelpDrawer() {
  let drawer = document.getElementById('helpDrawer');
  let backdrop = document.getElementById('helpBackdrop');

  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'helpBackdrop';
    backdrop.className = 'backdrop';
    backdrop.onclick = () => closeDrawer('helpDrawer');
    document.body.appendChild(backdrop);

    drawer = document.createElement('div');
    drawer.id = 'helpDrawer';
    drawer.className = 'drawer right';
    drawer.innerHTML = `
      <div class="drawer-header">
        <h2>📚 راهنما و کمک</h2>
        <button class="close-btn" onclick="closeDrawer('helpDrawer')">✕</button>
      </div>
      <div class="drawer-body" id="helpDrawerBody"></div>`;
    document.body.appendChild(drawer);
  }

  renderHelpBody();
  openDrawer('helpDrawer');
}
window.openHelpDrawer = openHelpDrawer;

function renderHelpBody() {
  const el = document.getElementById('helpDrawerBody');
  if (!el) return;
  const u = window.state?.user;
  const role = u?.role || 'student';
  const content = HELP_CONTENT[role] || HELP_CONTENT.student;

  el.innerHTML = `
    <div style="text-align:center;padding:14px 0 18px">
      <div style="font-size:2.5rem;margin-bottom:6px">${content.icon}</div>
      <div style="font-weight:900;font-size:1.05rem">${content.title}</div>
      <div style="font-size:.72rem;color:var(--tx2);margin-top:4px">${content.sections.reduce((s, x) => s + x.items.length, 0)} راهنما برای نقش شما</div>
    </div>
    ${content.sections.map((sec, si) => `
      <div style="margin-bottom:14px">
        <div class="sh" style="cursor:pointer" onclick="toggleHelpSection(${si})">
          <span>${sec.title}</span>
          <span id="helpArrow_${si}" style="font-size:.9rem;transition:transform .2s">▼</span>
        </div>
        <div id="helpSec_${si}" style="display:none">
          ${sec.items.map(it => `
            <div style="background:var(--card2);border-radius:10px;margin-bottom:8px;overflow:hidden">
              <div style="padding:10px 12px;font-weight:800;font-size:.82rem;color:var(--bl);cursor:pointer;display:flex;align-items:center;gap:6px" onclick="toggleHelpItem(this)">
                <span style="color:var(--am)">❓</span>
                <span style="flex:1">${it.q}</span>
                <span style="font-size:.7rem;color:var(--tm)">›</span>
              </div>
              <div style="display:none;padding:0 12px 12px;font-size:.78rem;color:var(--tx2);line-height:1.9">${it.a}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
    <div style="margin-top:20px;padding:14px;background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(168,85,247,.05));border-radius:12px;border:1px solid rgba(59,130,246,.2)">
      <div style="font-weight:800;font-size:.85rem;margin-bottom:6px">💡 نکته</div>
      <div style="font-size:.74rem;color:var(--tx2);line-height:1.8">اگه سؤالی داری که اینجا نیست، از طریق <b>خروجی و بکاپ</b> یه گزارش PDF بگیر و برای مربی‌ات بفرست.</div>
    </div>
  `;

  // Auto-open first section
  setTimeout(() => toggleHelpSection(0), 100);
}

window.toggleHelpSection = function(si) {
  const el = document.getElementById('helpSec_' + si);
  const arrow = document.getElementById('helpArrow_' + si);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0)' : 'rotate(180deg)';
};

window.toggleHelpItem = function(headerEl) {
  const body = headerEl.nextElementSibling;
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
};

/* ============================================================
   PART 12: GUIDE — First-time Hints
   ============================================================ */

function showFirstTimeHints() {
  const u = window.state?.user;
  if (!u) return;

  const key = 'profit-hints-shown-' + u.id + '-' + u.role;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  // Wait for main content to be ready
  setTimeout(() => {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    // Add a hint button if not exists
    if (!document.getElementById('hintBtn')) {
      const btn = document.createElement('button');
      btn.id = 'hintBtn';
      btn.className = 'btn';
      btn.style.cssText = 'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;animation:pulse 2s ease-in-out 3';
      btn.innerHTML = '❓ راهنما';
      btn.onclick = () => { openHelpDrawer(); btn.remove(); };
      toolbar.appendChild(btn);

      // Add CSS for pulse
      if (!document.getElementById('pulseStyle')) {
        const s = document.createElement('style');
        s.id = 'pulseStyle';
        s.textContent = '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}';
        document.head.appendChild(s);
      }

      // Auto remove after 30s
      setTimeout(() => { if (btn.parentElement) btn.remove(); }, 30000);
    }
  }, 2000);
}

/* ============================================================
   PART 13: POLISH — Keyboard Shortcuts
   ============================================================ */

document.addEventListener('keydown', (e) => {
  // Ignore if typing in input/textarea
  const t = e.target.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;

  // Ctrl+H = Help
  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    openHelpDrawer();
  }
  // Ctrl+E = Export
  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault();
    openExportDrawer();
  }
});

/* ============================================================
   PART 14: INIT
   ============================================================ */

// Enhance toolbar when it renders
const _originalRenderToolbar = window.renderToolbar;
if (typeof _originalRenderToolbar === 'function') {
  window.renderToolbar = function() {
    _originalRenderToolbar.apply(this, arguments);
    // Add help & export buttons
    const tb = document.getElementById('toolbar');
    if (tb && !document.getElementById('helpToolbarBtn')) {
      const helpBtn = document.createElement('button');
      helpBtn.id = 'helpToolbarBtn';
      helpBtn.className = 'btn';
      helpBtn.innerHTML = '<span>❓</span> راهنما';
      helpBtn.onclick = () => openHelpDrawer();
      tb.appendChild(helpBtn);

      const expBtn = document.createElement('button');
      expBtn.id = 'expToolbarBtn';
      expBtn.className = 'btn';
      expBtn.innerHTML = '<span>📤</span> خروجی';
      expBtn.onclick = () => openExportDrawer();
      tb.appendChild(expBtn);
    }
  };
}

// Override renderUserDrawer to add Export button
const _originalRenderUserDrawer = window.renderUserDrawer;
if (typeof _originalRenderUserDrawer === 'function') {
  window.renderUserDrawer = function() {
    _originalRenderUserDrawer.apply(this, arguments);
    const el = document.getElementById('userDrawerBody');
    if (el && !document.getElementById('userExportBtn')) {
      const btn = document.createElement('button');
      btn.id = 'userExportBtn';
      btn.className = 'btn full';
      btn.style.marginBottom = '8px';
      btn.innerHTML = '📤 خروجی و بکاپ';
      btn.onclick = () => { closeDrawer('userDrawer'); setTimeout(() => openExportDrawer(), 300); };
      const refBtn = el.querySelector('.btn.danger') || el.querySelector('button.btn');
      if (refBtn) refBtn.parentElement.insertBefore(btn, refBtn);

      const helpBtn = document.createElement('button');
      helpBtn.className = 'btn full';
      helpBtn.style.marginBottom = '8px';
      helpBtn.innerHTML = '📚 راهنما';
      helpBtn.onclick = () => { closeDrawer('userDrawer'); setTimeout(() => openHelpDrawer(), 300); };
      if (refBtn) refBtn.parentElement.insertBefore(helpBtn, refBtn);
    }
  };
}

// Boot check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(showFirstTimeHints, 1500);
  });
} else {
  setTimeout(showFirstTimeHints, 1500);
}

console.log('✨ ProFit Extras loaded — Export, Help & Polish ready');
console.log('   Shortcuts: Ctrl+H (Help) · Ctrl+E (Export)');

})();
