/* ============================================================
   ProFit Extras v1.2 — Polish + Guide + Export + Charts
   ============================================================ */
(function() {
'use strict';

/* ============================================================
   PART 1: POLISH — Custom Confirm (Named Function)
   ============================================================ */
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

/* ============================================================
   PART 2: POLISH — Toast with Actions
   ============================================================ */
window.toastWithAction = function(msg, actionLabel, actionFn, type = 'info') {
  const c = document.getElementById('toasts');
  if (!c) return;
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
      offlineBanner.innerHTML = '<span>📡</span><span>اتصال اینترنت قطع است</span>';
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
async function exportUserData(userId, username) {
  try {
    showAutosaveIndicator('در حال آماده‌سازی بکاپ...');
    const d = await window.api('GET', '/api/users/' + userId + '/data');

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
    if (window.toast) window.toast('بکاپ دانلود شد ✓');
  } catch (e) {
    console.error('export error:', e);
    if (window.toast) window.toast('خطا در export: ' + e.message, 'error');
  }
}
window.exportUserData = exportUserData;

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
          window.toast('فایل بکاپ معتبر نیست', 'error');
          resolve(false);
          return;
        }

        const fields = Object.keys(backup.data || {});
        const ok = window.confirm(
          'این بکاپ شامل ' + fields.length + ' بخش داده است:\n' +
          fields.slice(0, 8).map(f => '• ' + f).join('\n') +
          (fields.length > 8 ? '\n... و ' + (fields.length - 8) + ' مورد دیگر' : '') +
          '\n\n⚠️ داده‌های فعلی با این بکاپ جایگزین می‌شوند. ادامه؟'
        );
        if (!ok) { resolve(false); return; }

        showAutosaveIndicator('در حال بازیابی...');
        let count = 0;
        for (const key of fields) {
          await window.api('POST', '/api/users/' + userId + '/data/' + key, { value: backup.data[key] });
          count++;
        }
        showAutosaveIndicator('بازیابی کامل شد', true);
        window.toast('✓ ' + count + ' بخش بازیابی شد', 'success');

        setTimeout(() => location.reload(), 1200);
        resolve(true);
      } catch (err) {
        console.error('import error:', err);
        window.toast('خطا: ' + err.message, 'error');
        resolve(false);
      }
    };
    input.click();
  });
}
window.importUserData = importUserData;

/* ============================================================
   PART 6: EXPORT — CSV Helpers
   ============================================================ */
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell == null ? '' : cell);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');

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
    const userId = window.state.user.id;
    const d = await window.api('GET', '/api/users/' + userId + '/data');
    const workout = d.workout || { logs: {}, completed: {} };
    const history = d.history || {};
    const program = d.program || { days: [] };

    const exNameMap = {};
    (program.days || []).forEach(day => {
      (day.exercises || []).forEach((ex, i) => {
        const def = (window.DB?.exercises || []).find(e => e.id === ex.exId) || {};
        exNameMap[i] = def.name || ex.exId;
      });
    });

    const rows = [['تاریخ', 'شماره حرکت', 'نام حرکت', 'ست', 'وزنه (kg)', 'تکرار', 'حجم (kg)', 'انجام‌شده']];

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

    rows.push([]);
    rows.push(['--- خلاصه تاریخچه ---']);
    rows.push(['تاریخ', 'جلسات', 'حجم کل (kg)']);
    Object.keys(history).sort().forEach(k => {
      rows.push([k, history[k].completed || 0, history[k].volume || 0]);
    });

    const filename = 'workout-log-' + new Date().toISOString().slice(0,10) + '.csv';
    downloadCSV(filename, rows);
    window.toast('CSV دانلود شد ✓');
  } catch (e) {
    console.error('CSV error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
}
window.exportWorkoutCSV = exportWorkoutCSV;

async function exportNutritionCSV() {
  try {
    const userId = window.state.user.id;
    const d = await window.api('GET', '/api/users/' + userId + '/data');
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

    const mealDefs = window.NUT?.meals || [];
    mealDefs.forEach(meal => {
      const items = meals[meal.key] || [];
      if (items.length === 0) {
        rows.push([meal.name, '— خالی —', '', '', '', '', '', '']);
        return;
      }
      items.forEach(it => {
        const food = (window.NUT?.foods || []).find(f => f.id === it.foodId);
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
    window.toast('CSV تغذیه دانلود شد ✓');
  } catch (e) {
    console.error('Nutrition CSV error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
}
window.exportNutritionCSV = exportNutritionCSV;

async function exportBodyCSV() {
  try {
    const userId = window.state.user.id;
    const d = await window.api('GET', '/api/users/' + userId + '/data');
    const body = d.body || [];

    if (body.length === 0) {
      window.toast('داده‌ای برای export نیست', 'warn');
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

    body.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
      const row = [e.date];
      metrics.forEach(m => row.push(e[m.key] != null ? e[m.key] : ''));
      rows.push(row);
    });

    const filename = 'body-measurements-' + new Date().toISOString().slice(0,10) + '.csv';
    downloadCSV(filename, rows);
    window.toast('CSV اندازه‌های بدن دانلود شد ✓');
  } catch (e) {
    console.error('Body CSV error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
}
window.exportBodyCSV = exportBodyCSV;

/* ============================================================
   PART 7: CHART HELPERS — Line & Bar SVG
   ============================================================ */

function generateLineChartSVG(data, labels, opts = {}) {
  const width = opts.width || 480;
  const height = opts.height || 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const color = opts.color || '#10b981';
  const unit = opts.unit || '';

  if (!data || data.length === 0) return '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:12px">داده‌ای نیست</div>';
  if (data.length === 1) {
    return '<div style="text-align:center;padding:20px;font-size:13px;color:#475569">یک داده: <b>' + data[0] + unit + '</b></div>';
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const realMin = min - range * 0.1;
  const realMax = max + range * 0.1;
  const realRange = realMax - realMin;

  const points = data.map((v, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((v - realMin) / realRange) * chartH;
    return { x, y, v };
  });

  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * chartH;
    const val = realMax - (i / 4) * realRange;
    grid += '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="' + (i === 4 || i === 0 ? '' : '3,3') + '"/>';
    grid += '<text x="' + (padding.left - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + val.toFixed(1) + '</text>';
  }

  const step = Math.max(1, Math.ceil(labels.length / 6));
  let xLabels = '';
  labels.forEach((l, i) => {
    if (i % step !== 0 && i !== labels.length - 1) return;
    const x = padding.left + (i / (labels.length - 1)) * chartW;
    xLabels += '<text x="' + x + '" y="' + (height - 10) + '" text-anchor="middle" font-size="8" fill="#94a3b8">' + l + '</text>';
  });

  let dots = '';
  points.forEach((p, i) => {
    if (i % step === 0 || i === points.length - 1) {
      dots += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>';
    }
  });

  const areaPath = pathD + ' L' + points[points.length - 1].x.toFixed(1) + ',' + (padding.top + chartH) + ' L' + points[0].x.toFixed(1) + ',' + (padding.top + chartH) + ' Z';
  const gradientId = 'grad_' + Math.random().toString(36).slice(2, 8);

  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;background:#fafbfc;border-radius:6px;border:1px solid #e2e8f0">' +
    '<defs><linearGradient id="' + gradientId + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.25"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    grid +
    '<path d="' + areaPath + '" fill="url(#' + gradientId + ')" stroke="none"/>' +
    '<path d="' + pathD + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    dots + xLabels +
  '</svg>';
}

function generateBarChartSVG(data, labels, opts = {}) {
  const width = opts.width || 480;
  const height = opts.height || 200;
  const padding = { top: 20, right: 15, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const color = opts.color || '#3b82f6';
  const color2 = opts.color2 || '#a855f7';
  const unit = opts.unit || '';
  const dualSeries = opts.dualSeries || false;

  if (!data || data.length === 0) return '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:12px">داده‌ای نیست</div>';

  const allVals = dualSeries ? [...data, ...(opts.data2 || [])] : data;
  const max = Math.max(...allVals, 1);
  const realMax = max * 1.15;

  const barCount = data.length;
  const groupW = chartW / barCount;
  const barW = dualSeries ? (groupW * 0.35) : (groupW * 0.6);
  const gap = dualSeries ? (groupW * 0.08) : 0;

  // Grid lines
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * chartH;
    const val = realMax - (i / 4) * realMax;
    grid += '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="' + (i === 0 || i === 4 ? '' : '3,3') + '"/>';
    grid += '<text x="' + (padding.left - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + Math.round(val).toLocaleString('fa-IR') + '</text>';
  }

  let bars = '';
  data.forEach((v, i) => {
    const groupX = padding.left + i * groupW;

    if (dualSeries) {
      const data2 = opts.data2 || [];
      const v2 = data2[i] || 0;

      // Bar 1 (volume)
      const h1 = (v / realMax) * chartH;
      const x1 = groupX + groupW / 2 - barW - gap / 2;
      const y1 = padding.top + chartH - h1;
      bars += '<rect x="' + x1 + '" y="' + y1 + '" width="' + barW + '" height="' + h1 + '" rx="3" fill="' + color + '" opacity="0.85"/>';
      if (v > 0) {
        bars += '<text x="' + (x1 + barW / 2) + '" y="' + (y1 - 4) + '" text-anchor="middle" font-size="8" fill="#475569" font-weight="700">' + Math.round(v).toLocaleString('fa-IR') + '</text>';
      }

      // Bar 2 (sessions)
      const h2 = (v2 / realMax) * chartH;
      const x2 = groupX + groupW / 2 + gap / 2;
      const y2 = padding.top + chartH - h2;
      bars += '<rect x="' + x2 + '" y="' + y2 + '" width="' + barW + '" height="' + h2 + '" rx="3" fill="' + color2 + '" opacity="0.85"/>';
      if (v2 > 0) {
        bars += '<text x="' + (x2 + barW / 2) + '" y="' + (y2 - 4) + '" text-anchor="middle" font-size="8" fill="#475569" font-weight="700">' + v2 + '</text>';
      }
    } else {
      const h = (v / realMax) * chartH;
      const x = groupX + (groupW - barW) / 2;
      const y = padding.top + chartH - h;
      const gid = 'bargrad_' + Math.random().toString(36).slice(2, 8);
      bars += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '"/>' +
        '<stop offset="100%" stop-color="' + color2 + '"/>' +
      '</linearGradient></defs>';
      bars += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" rx="4" fill="url(#' + gid + ')" opacity="0.9"/>';
      if (v > 0) {
        bars += '<text x="' + (x + barW / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="9" fill="#475569" font-weight="800">' + Math.round(v).toLocaleString('fa-IR') + '</text>';
      }
    }
  });

  // X labels
  let xLabels = '';
  labels.forEach((l, i) => {
    const x = padding.left + i * groupW + groupW / 2;
    xLabels += '<text x="' + x + '" y="' + (height - 12) + '" text-anchor="middle" font-size="8" fill="#64748b" font-weight="600">' + l + '</text>';
  });

  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;background:#fafbfc;border-radius:6px;border:1px solid #e2e8f0">' +
    grid + bars + xLabels +
  '</svg>';
}

/* ============================================================
   PART 8: PRINT / PDF REPORT — کامل با نمودارها
   ============================================================ */
async function printReport() {
  try {
    const userId = window.state.user.id;
    const d = await window.api('GET', '/api/users/' + userId + '/data');
    const program = d.program || { days: [] };
    const history = d.history || {};
    const nutrition = d.nutrition || {};
    const body = d.body || [];
    const workout = d.workout || { logs: {}, completed: {} };

    // ============ Weekly stats ============
    const now = Date.now();
    let sessions7 = 0, volume7 = 0;
    Object.keys(history).forEach(k => {
      const t = new Date(k).getTime();
      if (now - t < 7 * 86400000) {
        if ((history[k].completed || 0) > 0) sessions7++;
        volume7 += history[k].volume || 0;
      }
    });

    // ============ Weekly Volume/Sessions Chart Data (last 12 weeks) ============
    const weeks = [];
    const weekLabels = [];
    const weekVolumes = [];
    const weekSessions = [];

    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 1) % 7);
      weekStart.setHours(0,0,0,0);
      weekStart.setDate(weekStart.getDate() - w * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23,59,59,999);

      let vol = 0, sess = 0;
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d2 = new Date(weekStart);
        d2.setDate(d2.getDate() + dayOffset);
        const k = d2.getFullYear() + '-' + String(d2.getMonth()+1).padStart(2,'0') + '-' + String(d2.getDate()).padStart(2,'0');
        const h = history[k];
        if (h) {
          if ((h.completed || 0) > 0) sess++;
          vol += h.volume || 0;
        }
      }

      weeks.push({ start: weekStart, vol, sess });
      weekLabels.push(weekStart.getDate() + '/' + (weekStart.getMonth() + 1));
      weekVolumes.push(Math.round(vol));
      weekSessions.push(sess);
    }

    const totalVolume12w = weekVolumes.reduce((s, v) => s + v, 0);
    const totalSessions12w = weekSessions.reduce((s, v) => s + v, 0);
    const avgVolume = Math.round(totalVolume12w / 12);
    const avgSessions = (totalSessions12w / 12).toFixed(1);

    const u = window.state.user;
    const roles = { admin: 'مدیر', coach: 'مربی', student: 'شاگرد' };

    // ============ Nutrition tables ============
// ============ Nutrition tables (robust) ============
// تعریف‌های ثابت وعده‌ها (اگه window.NUT نبود)
const MEAL_META = {
  breakfast: { name: 'صبحانه', emoji: '🌅', pct: 0.25 },
  snack1: { name: 'میان‌وعده صبح', emoji: '🍎', pct: 0.10 },
  lunch: { name: 'ناهار', emoji: '🍽️', pct: 0.35 },
  snack2: { name: 'میان‌وعده عصر', emoji: '🥤', pct: 0.10 },
  dinner: { name: 'شام', emoji: '🌙', pct: 0.20 }
};

// === Find meal definitions (multi-source) ===
let mealDefs = [];
if (window.NUT && Array.isArray(window.NUT.meals) && window.NUT.meals.length > 0) {
  mealDefs = window.NUT.meals;
  console.log('[Report] ✅ Using window.NUT.meals (' + mealDefs.length + ' items)');
} else {
  mealDefs = Object.keys(MEAL_META).map(k => ({ key: k, ...MEAL_META[k] }));
  console.log('[Report] ⚠️ window.NUT.meals not available — using hardcoded defs');
}

// === Find foods data (multi-source) ===
let foods = [];
if (window.NUT && Array.isArray(window.NUT.foods)) {
  foods = window.NUT.foods;
}
console.log('[Report] Foods available: ' + foods.length);

// === Get nutrition data (prefer in-memory state) ===
let nutritionData = nutrition;
if ((!nutritionData.meals || Object.keys(nutritionData.meals).length === 0) && window.state?.nutrition?.meals) {
  nutritionData = window.state.nutrition;
  console.log('[Report] 📦 Using state.nutrition instead of fetched data');
}

const meals = nutritionData.meals || {};
console.log('[Report] Meal keys in data:', Object.keys(meals));
Object.keys(meals).forEach(k => {
  const cnt = Array.isArray(meals[k]) ? meals[k].length : 0;
  console.log('[Report]   ' + k + ': ' + cnt + ' items');
});

// === Detect which meals have items ===
const dataKeysWithItems = Object.keys(meals).filter(k => 
  Array.isArray(meals[k]) && meals[k].length > 0
);

// === Add missing meal defs from data keys ===
dataKeysWithItems.forEach(k => {
  if (!mealDefs.find(m => m.key === k)) {
    const meta = MEAL_META[k] || { name: k, emoji: '🍽️', pct: 0 };
    mealDefs.push({ key: k, ...meta });
    console.log('[Report] ➕ Added missing meal def: ' + k);
  }
});

const hasMeals = dataKeysWithItems.length > 0;
console.log('[Report] hasMeals: ' + hasMeals);

// === Build nutrition table ===
let nutritionTableHTML = '';
let mealTotalsGlobal = { cal: 0, prot: 0, carb: 0, fat: 0 };

if (hasMeals) {
  // Only render meals that have items
  const activeMealDefs = mealDefs.filter(m => (meals[m.key] || []).length > 0);

  nutritionTableHTML = activeMealDefs.map(meal => {
    const items = meals[meal.key] || [];
    let mTot = { cal: 0, prot: 0, carb: 0, fat: 0 };

    const rows = items.map(it => {
      const food = foods.find(f => f.id === it.foodId);

      if (!food) {
        console.warn('[Report] ⚠️ Food not found: ' + it.foodId);
        return '<tr><td colspan="6" style="text-align:center;color:#f43f5e;font-size:10px;padding:6px">⚠️ غذای ناشناخته: ' + (it.foodId || '?') + '</td></tr>';
      }

      const unit = (food.units && food.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
      const grams = (it.qty || 0) * unit.g;
      const k = grams / 100;
      const cal = Math.round((food.cal || 0) * k);
      const prot = Math.round((food.prot || 0) * k * 10) / 10;
      const carb = Math.round((food.carb || 0) * k * 10) / 10;
      const fat = Math.round((food.fat || 0) * k * 10) / 10;

      mTot.cal += cal;
      mTot.prot += prot;
      mTot.carb += carb;
      mTot.fat += fat;

      return '<tr>' +
        '<td>' + (food.emoji || '🍽️') + ' ' + food.name + '</td>' +
        '<td style="text-align:center">' + it.qty + ' ' + unit.n + '</td>' +
        '<td style="text-align:center;color:#3b82f6;font-weight:700">' + cal + '</td>' +
        '<td style="text-align:center">' + prot + '</td>' +
        '<td style="text-align:center">' + carb + '</td>' +
        '<td style="text-align:center">' + fat + '</td>' +
      '</tr>';
    }).join('');

    mealTotalsGlobal.cal += mTot.cal;
    mealTotalsGlobal.prot += mTot.prot;
    mealTotalsGlobal.carb += mTot.carb;
    mealTotalsGlobal.fat += mTot.fat;

    return '<div class="meal-block">' +
      '<h3>' + (meal.emoji || '🍽️') + ' ' + meal.name + ' — ' + Math.round(mTot.cal) + ' kcal</h3>' +
      '<table><thead><tr>' +
        '<th style="text-align:right">غذا</th>' +
        '<th style="text-align:center;width:80px">مقدار</th>' +
        '<th style="text-align:center;width:55px">کالری</th>' +
        '<th style="text-align:center;width:50px">پروتئین</th>' +
        '<th style="text-align:center;width:50px">کرب</th>' +
        '<th style="text-align:center;width:50px">چربی</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</div>';
  }).join('');
}

    // ============ Supplements ============
    const supplements = nutrition.supplements || [];
    let supplementsHTML = '';
    if (supplements.length) {
      supplementsHTML = '<table><thead><tr>' +
        '<th style="text-align:right">مکمل</th>' +
        '<th style="text-align:center;width:90px">دوز</th>' +
        '<th style="text-align:center;width:100px">زمان</th>' +
        '<th style="text-align:center;width:60px">وضعیت</th>' +
      '</tr></thead><tbody>' +
      supplements.map(s => '<tr>' +
        '<td style="font-weight:700;font-size:.75rem">' + s.name + '</td>' +
        '<td style="text-align:center;font-size:.72rem;color:#f59e0b;font-weight:700">' + (s.dose || '—') + '</td>' +
        '<td style="text-align:center;font-size:.72rem">' + (s.timing || '—') + '</td>' +
        '<td style="text-align:center;font-size:.72rem;color:' + (s.enabled ? '#10b981' : '#94a3b8') + ';font-weight:700">' + (s.enabled ? '✓ فعال' : 'غیرفعال') + '</td>' +
      '</tr>').join('') +
      '</tbody></table>';
    }

    // ============ Body measurements ============
    const bodySorted = body.slice().sort((a, b) => a.date.localeCompare(b.date));

    let bodyChartHTML = '';
    let bodyTableHTML = '';

    if (bodySorted.length > 0) {
      const weightData = bodySorted.filter(e => e.weight != null);
      if (weightData.length > 0) {
        const wData = weightData.map(e => e.weight);
        const wLabels = weightData.map(e => e.date.slice(5));
        const firstW = wData[0], lastW = wData[wData.length - 1];
        const diffW = lastW - firstW;
        const diffColor = diffW > 0 ? '#f43f5e' : (diffW < 0 ? '#10b981' : '#94a3b8');

        bodyChartHTML += '<div style="margin-bottom:16px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<div style="font-weight:800;font-size:.82rem;color:#1e293b">⚖️ روند وزن (kg)</div>' +
            '<div style="font-size:.72rem;font-weight:800;color:' + diffColor + '">' +
              (diffW > 0 ? '+' : '') + diffW.toFixed(1) + ' kg در ' + weightData.length + ' ثبت' +
            '</div>' +
          '</div>' +
          generateLineChartSVG(wData, wLabels, { color: '#3b82f6', unit: ' kg' }) +
        '</div>';
      }

      const waistData = bodySorted.filter(e => e.waist != null);
      if (waistData.length >= 2) {
        const data = waistData.map(e => e.waist);
        const labels = waistData.map(e => e.date.slice(5));
        bodyChartHTML += '<div style="margin-bottom:16px">' +
          '<div style="font-weight:800;font-size:.82rem;color:#1e293b;margin-bottom:6px">👖 روند دور کمر (cm)</div>' +
          generateLineChartSVG(data, labels, { color: '#a855f7', unit: ' cm' }) +
        '</div>';
      }

      const chestData = bodySorted.filter(e => e.chest != null);
      if (chestData.length >= 2) {
        const data = chestData.map(e => e.chest);
        const labels = chestData.map(e => e.date.slice(5));
        bodyChartHTML += '<div style="margin-bottom:16px">' +
          '<div style="font-weight:800;font-size:.82rem;color:#1e293b;margin-bottom:6px">💪 روند دور سینه (cm)</div>' +
          generateLineChartSVG(data, labels, { color: '#06b6d4', unit: ' cm' }) +
        '</div>';
      }

      const armData = bodySorted.filter(e => e.arm != null);
      if (armData.length >= 2) {
        const data = armData.map(e => e.arm);
        const labels = armData.map(e => e.date.slice(5));
        bodyChartHTML += '<div style="margin-bottom:16px">' +
          '<div style="font-weight:800;font-size:.82rem;color:#1e293b;margin-bottom:6px">💪 روند دور بازو (cm)</div>' +
          generateLineChartSVG(data, labels, { color: '#f43f5e', unit: ' cm' }) +
        '</div>';
      }

      const fatData = bodySorted.filter(e => e.bodyfat != null);
      if (fatData.length >= 2) {
        const data = fatData.map(e => e.bodyfat);
        const labels = fatData.map(e => e.date.slice(5));
        bodyChartHTML += '<div style="margin-bottom:16px">' +
          '<div style="font-weight:800;font-size:.82rem;color:#1e293b;margin-bottom:6px">🔥 روند درصد چربی (%)</div>' +
          generateLineChartSVG(data, labels, { color: '#f59e0b', unit: ' %' }) +
        '</div>';
      }

      const metrics = [
        { key: 'weight', name: 'وزن' },
        { key: 'bodyfat', name: 'چربی' },
        { key: 'neck', name: 'گردن' },
        { key: 'chest', name: 'سینه' },
        { key: 'waist', name: 'کمر' },
        { key: 'hip', name: 'باسن' },
        { key: 'arm', name: 'بازو' },
        { key: 'forearm', name: 'ساعد' },
        { key: 'thigh', name: 'ران' },
        { key: 'calf', name: 'ساق' }
      ];

      const recent = bodySorted.slice(-15).reverse();

      bodyTableHTML = '<table><thead><tr>' +
        '<th style="text-align:right">تاریخ</th>' +
        metrics.map(m => '<th style="text-align:center">' + m.name + '</th>').join('') +
      '</tr></thead><tbody>' +
      recent.map(e => '<tr>' +
        '<td style="font-size:.7rem;font-weight:700">' + e.date + '</td>' +
        metrics.map(m => '<td style="text-align:center;font-size:.7rem">' + (e[m.key] != null ? e[m.key] : '—') + '</td>').join('') +
      '</tr>').join('') +
      '</tbody></table>';
    }

    // ============ Build HTML ============
    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>گزارش ProFit — ${u.displayName}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Vazirmatn', sans-serif; }
  body { padding: 24px; background: #fff; color: #0f172a; line-height: 1.7; max-width: 850px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 22px; margin-bottom: 24px; border-bottom: 3px solid #3b82f6; }
  .header h1 { font-size: 1.7rem; color: #3b82f6; margin-bottom: 8px; }
  .header .sub { font-size: .82rem; color: #64748b; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 { font-size: 1.05rem; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; display: flex; align-items: center; gap: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .stat { padding: 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
  .stat .lbl { font-size: .7rem; color: #64748b; font-weight: 700; }
  .stat .val { font-size: 1.3rem; font-weight: 900; color: #3b82f6; margin-top: 6px; }
  .stat.green .val { color: #10b981; }
  .stat.orange .val { color: #f59e0b; }
  .stat.purple .val { color: #a855f7; }
  .stat.red .val { color: #f43f5e; }
  .chart-box { background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
  .chart-box h4 { font-size: .82rem; color: #1e293b; margin-bottom: 8px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; font-size: .78rem; margin-bottom: 14px; }
  th { background: #f1f5f9; padding: 8px 6px; text-align: right; font-weight: 800; color: #475569; font-size: .72rem; }
  td { padding: 7px 6px; border-bottom: 1px solid #f1f5f9; }
  tbody tr:hover { background: #fafbfc; }
  .day-block { margin-bottom: 18px; page-break-inside: avoid; background: #fafbfc; padding: 12px; border-radius: 10px; border: 1px solid #f1f5f9; }
  .day-block h3 { font-size: .88rem; color: #1e293b; margin-bottom: 8px; padding-right: 10px; border-right: 4px solid #3b82f6; font-weight: 800; }
  .macro-summary { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin: 14px 0; }
  .macro-box { text-align: center; padding: 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
  .macro-box .mb-lbl { font-size: .62rem; color: #64748b; font-weight: 700; }
  .macro-box .mb-val { font-size: 1.05rem; font-weight: 900; margin-top: 3px; }
  .macro-box.cal .mb-val { color: #10b981; }
  .macro-box.prot .mb-val { color: #f43f5e; }
  .macro-box.carb .mb-val { color: #3b82f6; }
  .macro-box.fat .mb-val { color: #f59e0b; }
  .legend { display: flex; gap: 16px; justify-content: center; font-size: .72rem; margin-top: 8px; }
  .legend span { display: flex; align-items: center; gap: 5px; }
  .legend .dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .footer { text-align: center; padding-top: 24px; margin-top: 40px; border-top: 1px solid #e2e8f0; font-size: .72rem; color: #94a3b8; }
  .page-break { page-break-before: always; }
  @media print {
    body { padding: 12px; max-width: 100%; }
    .no-print { display: none !important; }
    .section { page-break-inside: avoid; }
    .day-block { page-break-inside: avoid; }
    h2 { page-break-after: avoid; }
    .chart-box { page-break-inside: avoid; }
    .grid, .grid2, .grid4 { page-break-inside: avoid; }
  }
  @media (max-width: 600px) {
    .grid { grid-template-columns: 1fr 1fr; }
    .grid4 { grid-template-columns: 1fr 1fr; }
    .macro-summary { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>🏋️ گزارش کامل ProFit</h1>
  <div class="sub"><b>${u.displayName}</b> — @${u.username} — ${roles[u.role] || u.role}</div>
  <div class="sub" style="margin-top:6px">تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')} — ساعت ${new Date().toLocaleTimeString('fa-IR', {hour:'2-digit',minute:'2-digit'})}</div>
</div>

<!-- ============ WEEKLY STATS ============ -->
<div class="section">
  <h2>📊 خلاصه عملکرد هفتگی</h2>
  <div class="grid">
    <div class="stat green"><div class="lbl">جلسات این هفته</div><div class="val">${sessions7}</div></div>
    <div class="stat"><div class="lbl">حجم کل (kg)</div><div class="val">${Math.round(volume7).toLocaleString('fa-IR')}</div></div>
    <div class="stat purple"><div class="lbl">روزهای برنامه</div><div class="val">${(program.days || []).length}</div></div>
  </div>
</div>

<!-- ============ WORKOUT VOLUME CHART ============ -->
${weekVolumes.some(v => v > 0) ? `
<div class="section">
  <h2>💪 نمودار حجم تمرین (۱۲ هفته اخیر)</h2>
  <div class="grid4">
    <div class="stat"><div class="lbl">حجم کل ۱۲ هفته</div><div class="val">${totalVolume12w.toLocaleString('fa-IR')}</div></div>
    <div class="stat green"><div class="lbl">میانگین هفتگی</div><div class="val">${avgVolume.toLocaleString('fa-IR')}</div></div>
    <div class="stat orange"><div class="lbl">جلسات ۱۲ هفته</div><div class="val">${totalSessions12w}</div></div>
    <div class="stat purple"><div class="lbl">میانگین جلسه/هفته</div><div class="val">${avgSessions}</div></div>
  </div>

  <div class="chart-box">
    <h4>📊 حجم تمرین هفتگی (kg)</h4>
    ${generateBarChartSVG(weekVolumes, weekLabels, { color: '#3b82f6', color2: '#a855f7', unit: ' kg' })}
  </div>

  <div class="chart-box">
    <h4>🎯 جلسات هفتگی</h4>
    ${generateBarChartSVG(weekSessions, weekLabels, { color: '#10b981', color2: '#059669', unit: '' })}
  </div>

  <table>
    <thead><tr>
      <th style="text-align:right">هفته</th>
      <th style="text-align:center">بازه</th>
      <th style="text-align:center">جلسات</th>
      <th style="text-align:center">حجم (kg)</th>
    </tr></thead>
    <tbody>
      ${weeks.map((w, i) => {
        const endDate = new Date(w.start);
        endDate.setDate(endDate.getDate() + 6);
        return '<tr>' +
          '<td style="font-size:.72rem;font-weight:700">هفته ' + (12 - i) + '</td>' +
          '<td style="text-align:center;font-size:.7rem;color:#64748b">' + w.start.getDate() + '/' + (w.start.getMonth()+1) + ' — ' + endDate.getDate() + '/' + (endDate.getMonth()+1) + '</td>' +
          '<td style="text-align:center;font-weight:700;color:#3b82f6">' + w.sess + '</td>' +
          '<td style="text-align:center;font-weight:700;color:#10b981">' + w.vol.toLocaleString('fa-IR') + '</td>' +
        '</tr>';
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- ============ PROGRAM ============ -->
${(program.days && program.days.length) ? `
<div class="section">
  <h2>🗓️ برنامه تمرینی</h2>
  ${program.days.map(day => {
    const totalEx = (day.exercises || []).length;
    return `<div class="day-block">
      <h3>${day.icon || '💪'} ${day.name} — ${day.focus || ''} (${totalEx} حرکت)</h3>
      <table>
        <thead><tr>
          <th style="width:30px;text-align:center">#</th>
          <th style="text-align:right">حرکت</th>
          <th style="text-align:center;width:50px">ست</th>
          <th style="text-align:center;width:70px">تکرار</th>
          <th style="text-align:center;width:50px">RPE</th>
        </tr></thead>
        <tbody>
          ${(day.exercises || []).map((ex, i) => {
            const def = (window.DB?.exercises || []).find(e => e.id === ex.exId) || {};
            return '<tr>' +
              '<td style="text-align:center;color:#94a3b8;font-weight:700">' + (i + 1) + '</td>' +
              '<td style="font-weight:700">' + (def.name || ex.exId) + '</td>' +
              '<td style="text-align:center;color:#3b82f6;font-weight:700">' + (ex.sets || 3) + '</td>' +
              '<td style="text-align:center">' + (ex.reps || '—') + '</td>' +
              '<td style="text-align:center;color:#f59e0b;font-weight:700">' + (ex.rpe || '—') + '</td>' +
            '</tr>';
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }).join('')}
</div>` : ''}

<!-- ============ NUTRITION TARGETS ============ -->
${(nutrition.targets) ? `
<div class="section">
  <h2>🎯 اهداف تغذیه</h2>
  <div class="grid">
    <div class="stat"><div class="lbl">BMR (سوخت پایه)</div><div class="val">${(nutrition.targets.bmr || 0).toLocaleString('fa-IR')}</div></div>
    <div class="stat"><div class="lbl">TDEE (سوخت کل)</div><div class="val">${(nutrition.targets.tdee || 0).toLocaleString('fa-IR')}</div></div>
    <div class="stat green"><div class="lbl">کالری هدف</div><div class="val">${(nutrition.targets.calories || 0).toLocaleString('fa-IR')}</div></div>
  </div>
  <div class="macro-summary">
    <div class="macro-box prot"><div class="mb-lbl">پروتئین</div><div class="mb-val">${nutrition.targets.protein || 0}g</div></div>
    <div class="macro-box carb"><div class="mb-lbl">کربوهیدرات</div><div class="mb-val">${nutrition.targets.carbs || 0}g</div></div>
    <div class="macro-box fat"><div class="mb-lbl">چربی</div><div class="mb-val">${nutrition.targets.fat || 0}g</div></div>
    <div class="macro-box cal"><div class="mb-lbl">جمع کل</div><div class="mb-val">${((nutrition.targets.protein||0)*4 + (nutrition.targets.carbs||0)*4 + (nutrition.targets.fat||0)*9).toLocaleString('fa-IR')}</div></div>
  </div>
</div>` : ''}

<!-- ============ FULL MEAL PLAN ============ -->
${mealDefs.length ? `
<div class="section">
  <h2>🍽️ برنامه غذایی روزانه</h2>
  ${nutritionTableHTML}
  <div class="macro-summary" style="margin-top:18px;background:#f0fdf4;padding:12px;border-radius:10px;border:1px solid #bbf7d0">
    <div class="macro-box cal"><div class="mb-lbl">کالری امروز</div><div class="mb-val">${Math.round(mealTotalsGlobal.cal).toLocaleString('fa-IR')}</div></div>
    <div class="macro-box prot"><div class="mb-lbl">پروتئین</div><div class="mb-val">${mealTotalsGlobal.prot.toFixed(1)}g</div></div>
    <div class="macro-box carb"><div class="mb-lbl">کربوهیدرات</div><div class="mb-val">${mealTotalsGlobal.carb.toFixed(1)}g</div></div>
    <div class="macro-box fat"><div class="mb-lbl">چربی</div><div class="mb-val">${mealTotalsGlobal.fat.toFixed(1)}g</div></div>
  </div>
</div>` : ''}

<!-- ============ SUPPLEMENTS ============ -->
${supplements.length ? `
<div class="section page-break">
  <h2>💊 مکمل‌های تجویزشده</h2>
  <div style="font-size:.75rem;color:#64748b;margin-bottom:12px;padding:8px 12px;background:#fef3c7;border-radius:8px;border-right:4px solid #f59e0b">
    ⚠️ قبل از مصرف هر مکمل با پزشک یا متخصص تغذیه مشورت کن.
  </div>
  ${supplementsHTML}
</div>` : ''}

<!-- ============ BODY CHARTS ============ -->
${bodyChartHTML ? `
<div class="section page-break">
  <h2>📈 نمودارهای پیشرفت — وزن و اندازه‌ها</h2>
  ${bodyChartHTML}
</div>` : ''}

<!-- ============ BODY TABLE ============ -->
${bodyTableHTML ? `
<div class="section">
  <h2>📏 جدول کامل اندازه‌های بدن (۱۵ ثبت آخر)</h2>
  ${bodyTableHTML}
</div>` : ''}

<div class="footer">
  <div>گزارش تولیدشده توسط <b>ProFit</b> — ${new Date().toLocaleString('fa-IR')}</div>
  <div style="margin-top:4px">این گزارش اطلاعات شخصی است و محرمانه می‌باشد.</div>
</div>

<div class="no-print" style="position:fixed;bottom:20px;left:20px;display:flex;gap:8px;z-index:1000">
  <button onclick="window.print()" style="padding:12px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-family:inherit;font-weight:800;font-size:.9rem;cursor:pointer;box-shadow:0 8px 24px rgba(59,130,246,.4)">
    🖨️ چاپ / ذخیره PDF
  </button>
  <button onclick="window.close()" style="padding:12px 24px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-family:inherit;font-weight:800;font-size:.9rem;cursor:pointer">
    بستن
  </button>
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { window.toast('پاپ‌آپ بلاک شده — اجازه بده', 'warn'); return; }
    w.document.write(html);
    w.document.close();
  } catch (e) {
    console.error('Print error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
}
window.printReport = printReport;

/* ============================================================
   PART 9: EXPORT DRAWER UI
   ============================================================ */
function openExportDrawer() {
  let drawer = document.getElementById('exportDrawer');
  let backdrop = document.getElementById('exportBackdrop');

  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'exportBackdrop';
    backdrop.className = 'backdrop';
    backdrop.onclick = () => window.closeDrawer('exportDrawer');
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
  window.openDrawer('exportDrawer');
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
        <div style="font-size:.68rem;opacity:.9;font-weight:500">شامل حجم تمرین، تغذیه، مکمل و نمودارها</div>
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
    const allUsers = await window.api('GET', '/api/users');
    const backup = {
      _meta: { type: 'profit-db-backup', version: '1.0', exportedAt: new Date().toISOString(), count: allUsers.length },
      users: []
    };

    for (const u of allUsers) {
      try {
        const d = await window.api('GET', '/api/users/' + u.id + '/data');
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
    window.toast('بکاپ کامل دانلود شد ✓');
  } catch (e) {
    window.toast('خطا: ' + e.message, 'error');
  }
}
window.exportAllUsersBackup = exportAllUsersBackup;

/* ============================================================
   PART 10: GUIDE — Help Drawer
   ============================================================ */
const HELP_CONTENT = {
  student: {
    icon: '🎓',
    title: 'راهنمای شاگرد',
    sections: [
      {
        title: '🚀 شروع سریع',
        items: [
          { q: 'چطور برنامه بسازم؟', a: 'به تب «برنامه» برو. سه گزینه داری: <b>هوشمند</b> (با سؤال جواب)، <b>دستی</b> (خودت طراحی کن) یا <b>ارجاع به مربی</b>.' },
          { q: 'تفاوت هوشمند و دستی چیه؟', a: '<b>هوشمند</b>: با چند سؤال، برنامه آماده بهت می‌ده. <b>دستی</b>: خودت روز، حرکت، ست و تکرار رو انتخاب می‌کنی.' },
          { q: 'چطور به مربی وصل شم؟', a: 'تب «برنامه» → «ارجاع به مربی». می‌تونی یه مربی خاص انتخاب کنی یا بذاری مدیر برات انتخاب کنه.' }
        ]
      },
      {
        title: '💪 تمرین کردن',
        items: [
          { q: 'چطور یه حرکت رو انجام‌شده علامت بزنم؟', a: 'تیک سبز کنار هر حرکت رو بزن.' },
          { q: 'وزنه و تکرار رو چطور وارد کنم؟', a: 'توی جدول هر حرکت، ستون «وزنه» و «تکرار» رو پر کن. دکمه ⤴ از ست قبلی کپی می‌کنه.' },
          { q: 'تایمر ست چیه؟', a: 'دکمه ▶ کنار هر ست، زمان استراحت رو می‌شماره.' }
        ]
      },
      {
        title: '🥗 تغذیه',
        items: [
          { q: 'چطور کالری روزانم رو حساب کنم؟', a: 'تب «تغذیه» → تب «محاسبه». اطلاعات بدنی رو پر کن و «محاسبه» رو بزن.' },
          { q: 'چطور غذا اضافه کنم؟', a: 'تب «غذاها» → روی وعده بزن تا باز شه → «افزودن غذا».' }
        ]
      },
      {
        title: '📤 خروجی گرفتن',
        items: [
          { q: 'چطور بکاپ بگیرم؟', a: 'روی آیکن 👤 بالا → «خروجی و بکاپ» → «دانلود بکاپ کامل».' },
          { q: 'چطور داده‌ها رو به Excel ببرم؟', a: 'توی بخش خروجی، دکمه «CSV» رو بزن.' },
          { q: 'گزارش چاپی چیه؟', a: 'دکمه «گزارش کامل» → یه صفحه باز می‌شه با همه نمودارها و جدول‌ها.' }
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
          { q: 'چطور شاگرد اضافه کنم؟', a: 'پنل مربی → «افزودن شاگرد».' },
          { q: 'شاگردانم کجان؟', a: 'پنل مربی، لیست همه شاگردان با آمار.' }
        ]
      },
      {
        title: '📨 درخواست‌های برنامه',
        items: [
          { q: 'درخواست شاگرد کجا میاد؟', a: 'توی پنل مربی، بالای صفحه، بخش نارنجی.' },
          { q: 'چطور درخواست رو قبول کنم؟', a: 'روی «✓ قبول می‌کنم» بزن.' }
        ]
      },
      {
        title: '✏️ نوشتن برنامه',
        items: [
          { q: 'چطور برنامه بنویسم؟', a: 'پنل مربی → روی شاگرد بزن → «ویرایش برنامه».' },
          { q: 'اجازه ویرایش چیه؟', a: 'توی جزئیات شاگرد، می‌تونی بهش اجازه ویرایش بدی.' }
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
          { q: 'چطور مربی تأیید کنم؟', a: 'پنل مدیر → تب «مربیان» → روی ✅ بزن.' }
        ]
      },
      {
        title: '📨 درخواست‌های برنامه',
        items: [
          { q: 'درخواست‌ها کجان؟', a: 'تب «درخواست برنامه» توی پنل مدیر.' },
          { q: 'چطور تخصیص بدم؟', a: 'از dropdown مربی انتخاب کن → «✅ تخصیص».' }
        ]
      },
      {
        title: '👥 مدیریت کاربران',
        items: [
          { q: 'چطور کاربر بسازم؟', a: 'تب «کاربران» → «افزودن کاربر».' },
          { q: 'تغییر رمز؟', a: 'روی 🔑 بزن.' }
        ]
      },
      {
        title: '📤 خروجی گرفتن',
        items: [
          { q: 'بکاپ کل؟', a: 'آیکن 👤 → «خروجی و بکاپ» → «بکاپ همه کاربران».' }
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
    backdrop.onclick = () => window.closeDrawer('helpDrawer');
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
  window.openDrawer('helpDrawer');
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
      <div style="font-size:.72rem;color:var(--tx2);margin-top:4px">${content.sections.reduce((s, x) => s + x.items.length, 0)} راهنما</div>
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
      <div style="font-size:.74rem;color:var(--tx2);line-height:1.8">اگه سؤالی داری که اینجا نیست، از «خروجی و بکاپ» یه گزارش PDF بگیر و برای مربی‌ات بفرست.</div>
    </div>
  `;

  setTimeout(() => window.toggleHelpSection(0), 100);
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
   PART 11: GUIDE — First-time Hints
   ============================================================ */
function showFirstTimeHints() {
  const u = window.state?.user;
  if (!u) return;

  const key = 'profit-hints-shown-' + u.id + '-' + u.role;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  setTimeout(() => {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    if (!document.getElementById('hintBtn')) {
      const btn = document.createElement('button');
      btn.id = 'hintBtn';
      btn.className = 'btn';
      btn.style.cssText = 'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;animation:pulse 2s ease-in-out 3';
      btn.innerHTML = '❓ راهنما';
      btn.onclick = () => { openHelpDrawer(); btn.remove(); };
      toolbar.appendChild(btn);

      if (!document.getElementById('pulseStyle')) {
        const s = document.createElement('style');
        s.id = 'pulseStyle';
        s.textContent = '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}';
        document.head.appendChild(s);
      }

      setTimeout(() => { if (btn.parentElement) btn.remove(); }, 30000);
    }
  }, 2000);
}

/* ============================================================
   PART 12: POLISH — Keyboard Shortcuts
   ============================================================ */
document.addEventListener('keydown', (e) => {
  const t = e.target.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;

  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    openHelpDrawer();
  }
  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault();
    openExportDrawer();
  }
});

/* ============================================================
   PART 13: INIT — Add toolbar buttons
   ============================================================ */
function addToolbarButtons() {
  const tb = document.getElementById('toolbar');
  if (!tb) return;

  if (!document.getElementById('helpToolbarBtn')) {
    const helpBtn = document.createElement('button');
    helpBtn.id = 'helpToolbarBtn';
    helpBtn.className = 'btn';
    helpBtn.innerHTML = '<span>❓</span> راهنما';
    helpBtn.onclick = () => openHelpDrawer();
    tb.appendChild(helpBtn);
  }

  if (!document.getElementById('expToolbarBtn')) {
    const expBtn = document.createElement('button');
    expBtn.id = 'expToolbarBtn';
    expBtn.className = 'btn';
    expBtn.innerHTML = '<span>📤</span> خروجی';
    expBtn.onclick = () => openExportDrawer();
    tb.appendChild(expBtn);
  }
}

const observer = new MutationObserver(() => { addToolbarButtons(); });
const _watchStart = setInterval(() => {
  const tb = document.getElementById('toolbar');
  if (tb) {
    observer.observe(tb, { childList: true, subtree: false });
    clearInterval(_watchStart);
    setTimeout(addToolbarButtons, 500);
  }
}, 300);

const _patchToolbar = setInterval(() => {
  if (typeof window.renderToolbar === 'function' && !window.renderToolbar._patched) {
    const _orig = window.renderToolbar;
    window.renderToolbar = function() {
      _orig.apply(this, arguments);
      setTimeout(addToolbarButtons, 10);
    };
    window.renderToolbar._patched = true;
    clearInterval(_patchToolbar);
  }
}, 200);

/* ============================================================
   BOOT
   ============================================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(showFirstTimeHints, 1500));
} else {
  setTimeout(showFirstTimeHints, 1500);
}

console.log('✨ ProFit Extras v1.2 loaded');
console.log('   Shortcuts: Ctrl+H (راهنما) · Ctrl+E (خروجی)');

})();
