/* ============================================================
   ProFit Extras v1.6 — Safe & Complete
   این فایل بعد از اسکریپت اصلی index.html لود می‌شود
   ============================================================ */
(function() {
'use strict';

/* ============ LOADER LOG ============ */
console.log('[Extras] loading v1.6...');

/* ============================================================
   SAFE HELPERS — هیچ‌وقت throw نمی‌کنند
   ============================================================ */
function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    setTimeout(fn, 0);
  }
}

function getState() {
  return (typeof window.state !== 'undefined' && window.state) ? window.state : null;
}

function getUser() {
  var s = getState();
  return (s && s.user) ? s.user : null;
}

function getNUT() {
  return (typeof window.NUT !== 'undefined' && window.NUT) ? window.NUT : null;
}

function getDB() {
  return (typeof window.DB !== 'undefined' && window.DB) ? window.DB : null;
}

function safeToast(msg, type) {
  try {
    if (typeof window.toast === 'function') {
      window.toast(msg, type || 'success');
      return;
    }
  } catch(e) {}
  console.log('[Toast]', type || 'info', msg);
}

async function safeApi(method, path, body) {
  if (typeof window.api === 'function') {
    return window.api(method, path, body);
  }
  var headers = { 'Content-Type': 'application/json' };
  var token = localStorage.getItem('profit-jwt');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  var res = await fetch(path, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    var err = new Error('HTTP ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fN(n) {
  if (n == null || isNaN(n)) return '—';
  try { return Number(n).toLocaleString('fa-IR'); } catch(e) { return String(n); }
}

/* ============================================================
   CHART SVG HELPERS
   ============================================================ */
function generateBarChartSVG(data, labels, opts) {
  opts = opts || {};
  var width = opts.width || 480;
  var height = opts.height || 200;
  var padding = { top: 20, right: 15, bottom: 40, left: 50 };
  var chartW = width - padding.left - padding.right;
  var chartH = height - padding.top - padding.bottom;
  var color = opts.color || '#3b82f6';
  var color2 = opts.color2 || '#a855f7';

  if (!data || data.length === 0) {
    return '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:12px">داده‌ای نیست</div>';
  }

  var max = Math.max.apply(null, data.concat([1]));
  var realMax = max * 1.15;
  var barCount = data.length;
  var groupW = chartW / barCount;
  var barW = groupW * 0.6;

  var grid = '';
  for (var i = 0; i <= 4; i++) {
    var y = padding.top + (i / 4) * chartH;
    var val = realMax - (i / 4) * realMax;
    grid += '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="' + (i === 0 || i === 4 ? '' : '3,3') + '"/>';
    grid += '<text x="' + (padding.left - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + fN(Math.round(val)) + '</text>';
  }

  var bars = '';
  var gid = 'g' + Math.random().toString(36).slice(2, 8);
  bars += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">';
  bars += '<stop offset="0%" stop-color="' + color + '"/>';
  bars += '<stop offset="100%" stop-color="' + color2 + '"/>';
  bars += '</linearGradient></defs>';

  data.forEach(function(v, i) {
    var groupX = padding.left + i * groupW;
    var h = (v / realMax) * chartH;
    var x = groupX + (groupW - barW) / 2;
    var y = padding.top + chartH - h;
    bars += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" rx="4" fill="url(#' + gid + ')" opacity="0.9"/>';
    if (v > 0) {
      bars += '<text x="' + (x + barW / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="9" fill="#475569" font-weight="800">' + fN(Math.round(v)) + '</text>';
    }
  });

  var xLabels = '';
  labels.forEach(function(l, i) {
    var x = padding.left + i * groupW + groupW / 2;
    xLabels += '<text x="' + x + '" y="' + (height - 12) + '" text-anchor="middle" font-size="8" fill="#64748b" font-weight="600">' + l + '</text>';
  });

  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;background:#fafbfc;border-radius:6px;border:1px solid #e2e8f0">' + grid + bars + xLabels + '</svg>';
}

/* ============================================================
   CSV DOWNLOAD HELPER
   ============================================================ */
function downloadCSV(filename, rows) {
  var csv = rows.map(function(r) {
    return r.map(function(cell) {
      var s = String(cell == null ? '' : cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\n');

  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   EXPORT: JSON Backup & Restore
   ============================================================ */
async function exportUserData(userId, username) {
  try {
    safeToast('در حال آماده‌سازی بکاپ...', 'info');
    var data = await safeApi('GET', '/api/users/' + userId + '/data');
    var backup = {
      _meta: {
        type: 'profit-user-backup',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId: userId,
        username: username || 'unknown'
      },
      data: data
    };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'profit-backup-' + (username || userId) + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    safeToast('بکاپ دانلود شد ✓');
  } catch(e) {
    console.error('export error:', e);
    safeToast('خطا در بکاپ: ' + e.message, 'error');
  }
}
window.exportUserData = exportUserData;

async function importUserData(userId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var text = await file.text();
      var backup = JSON.parse(text);
      if (!backup._meta || backup._meta.type !== 'profit-user-backup') {
        safeToast('فایل بکاپ معتبر نیست', 'error');
        return;
      }
      var fields = Object.keys(backup.data || {});
      var ok = window.confirm(
        'این بکاپ شامل ' + fields.length + ' بخش داده است:\n' +
        fields.slice(0, 8).map(function(f) { return '• ' + f; }).join('\n') +
        (fields.length > 8 ? '\n... و ' + (fields.length - 8) + ' مورد دیگر' : '') +
        '\n\n⚠️ داده‌های فعلی جایگزین می‌شوند. ادامه؟'
      );
      if (!ok) return;

      safeToast('در حال بازیابی...', 'info');
      var count = 0;
      for (var i = 0; i < fields.length; i++) {
        await safeApi('POST', '/api/users/' + userId + '/data/' + fields[i], { value: backup.data[fields[i]] });
        count++;
      }
      safeToast('✓ ' + count + ' بخش بازیابی شد');
      setTimeout(function() { location.reload(); }, 1200);
    } catch(err) {
      console.error('import error:', err);
      safeToast('خطا: ' + err.message, 'error');
    }
  };
  input.click();
}
window.importUserData = importUserData;

async function exportAllUsersBackup() {
  try {
    safeToast('در حال آماده‌سازی بکاپ کامل...', 'info');
    var allUsers = await safeApi('GET', '/api/users');
    var backup = {
      _meta: { type: 'profit-db-backup', version: '1.0', exportedAt: new Date().toISOString(), count: allUsers.length },
      users: []
    };
    for (var i = 0; i < allUsers.length; i++) {
      var u = allUsers[i];
      try {
        var d = await safeApi('GET', '/api/users/' + u.id + '/data');
        backup.users.push({ user: u, data: d });
      } catch(e) {
        backup.users.push({ user: u, data: null, error: e.message });
      }
    }
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'profit-full-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    safeToast('بکاپ کامل دانلود شد ✓');
  } catch(e) {
    console.error('backup error:', e);
    safeToast('خطا: ' + e.message, 'error');
  }
}
window.exportAllUsersBackup = exportAllUsersBackup;

/* ============================================================
   EXPORT: CSV Files
   ============================================================ */
async function exportWorkoutCSV() {
  try {
    var u = getUser();
    if (!u) { safeToast('ابتدا وارد شوید', 'warn'); return; }

    var data = await safeApi('GET', '/api/users/' + u.id + '/data');
    var workout = data.workout || { logs: {}, completed: {} };
    var history = data.history || {};
    var program = data.program || { days: [] };

    var exNameMap = {};
    (program.days || []).forEach(function(day) {
      (day.exercises || []).forEach(function(ex, i) {
        var def = ((getDB() || {}).exercises || []).find(function(e) { return e.id === ex.exId; }) || {};
        exNameMap[i] = def.name || ex.exId;
      });
    });

    var rows = [['تاریخ', 'شماره', 'نام حرکت', 'ست', 'وزنه (kg)', 'تکرار', 'حجم (kg)', 'انجام‌شده']];
    var allKeys = Object.keys(workout.logs || {}).concat(Object.keys(workout.completed || {}));
    var uniqueKeys = allKeys.filter(function(k, i, arr) { return arr.indexOf(k) === i; }).sort();

    uniqueKeys.forEach(function(key) {
      var parts = key.split(':');
      var date = parts[0];
      var idx = parseInt(parts[1]);
      var logs = workout.logs[key] || {};
      var isDone = !!workout.completed[key];
      var setKeys = Object.keys(logs).sort(function(a, b) { return parseInt(a) - parseInt(b); });
      if (setKeys.length === 0 && !isDone) return;
      if (setKeys.length === 0) {
        rows.push([date, idx + 1, exNameMap[idx] || ('حرکت ' + (idx + 1)), '-', '-', '-', '0', isDone ? 'بله' : 'خیر']);
      } else {
        setKeys.forEach(function(si) {
          var l = logs[si] || {};
          var vol = (l.weight && l.reps) ? l.weight * l.reps : 0;
          rows.push([date, idx + 1, exNameMap[idx] || ('حرکت ' + (idx + 1)), parseInt(si) + 1, l.weight || '', l.reps || '', vol, isDone ? 'بله' : 'خیر']);
        });
      }
    });

    rows.push([]);
    rows.push(['--- خلاصه تاریخچه ---']);
    rows.push(['تاریخ', 'جلسات', 'حجم کل (kg)']);
    Object.keys(history).sort().forEach(function(k) {
      rows.push([k, history[k].completed || 0, history[k].volume || 0]);
    });

    downloadCSV('workout-log-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    safeToast('CSV تمرینات دانلود شد ✓');
  } catch(e) {
    console.error('CSV error:', e);
    safeToast('خطا: ' + e.message, 'error');
  }
}
window.exportWorkoutCSV = exportWorkoutCSV;

async function exportNutritionCSV() {
  try {
    var u = getUser();
    if (!u) { safeToast('ابتدا وارد شوید', 'warn'); return; }

    var data = await safeApi('GET', '/api/users/' + u.id + '/data');
    var nutrition = data.nutrition || {};
    var profile = nutrition.profile || {};
    var targets = nutrition.targets || {};
    var meals = nutrition.meals || {};
    var supplements = nutrition.supplements || [];

    var rows = [['--- پروفایل ---']];
    rows.push(['جنسیت', profile.gender === 'male' ? 'مرد' : 'زن']);
    rows.push(['سن', profile.age || '']);
    rows.push(['وزن (kg)', profile.weight || '']);
    rows.push(['قد (cm)', profile.height || '']);
    rows.push(['فعالیت', profile.activity || '']);
    rows.push(['هدف', profile.goal || '']);

    if (targets && targets.calories) {
      rows.push([]);
      rows.push(['--- اهداف ---']);
      rows.push(['BMR', targets.bmr || '']);
      rows.push(['TDEE', targets.tdee || '']);
      rows.push(['کالری', targets.calories || '']);
      rows.push(['پروتئین', targets.protein || '']);
      rows.push(['کرب', targets.carbs || '']);
      rows.push(['چربی', targets.fat || '']);
    }

    rows.push([]);
    rows.push(['--- وعده‌ها ---']);
    rows.push(['وعده', 'غذا', 'مقدار', 'واحد', 'کالری', 'پروتئین', 'کرب', 'چربی']);

    var NUT = getNUT();
    var foods = (NUT && NUT.foods) || [];
    var mealDefs = (NUT && NUT.meals) || [];

    mealDefs.forEach(function(meal) {
      var items = meals[meal.key] || [];
      if (items.length === 0) {
        rows.push([meal.name, '—', '', '', '', '', '', '']);
        return;
      }
      items.forEach(function(it) {
        var food = foods.find(function(f) { return f.id === it.foodId; });
        if (!food) return;
        var unit = (food.units && food.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        var grams = (it.qty || 0) * unit.g;
        var k = grams / 100;
        rows.push([
          meal.name, food.name, it.qty, unit.n,
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
      supplements.forEach(function(s) {
        rows.push([s.name, s.dose || '', s.timing || '', s.enabled ? 'بله' : 'خیر']);
      });
    }

    downloadCSV('nutrition-plan-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    safeToast('CSV تغذیه دانلود شد ✓');
  } catch(e) {
    console.error('CSV error:', e);
    safeToast('خطا: ' + e.message, 'error');
  }
}
window.exportNutritionCSV = exportNutritionCSV;

async function exportBodyCSV() {
  try {
    var u = getUser();
    if (!u) { safeToast('ابتدا وارد شوید', 'warn'); return; }

    var data = await safeApi('GET', '/api/users/' + u.id + '/data');
    var body = data.body || [];
    if (body.length === 0) { safeToast('داده‌ای برای export نیست', 'warn'); return; }

    var metrics = [
      { key: 'weight', name: 'وزن (kg)' }, { key: 'bodyfat', name: 'چربی (%)' },
      { key: 'neck', name: 'گردن (cm)' }, { key: 'chest', name: 'سینه (cm)' },
      { key: 'waist', name: 'کمر (cm)' }, { key: 'hip', name: 'باسن (cm)' },
      { key: 'arm', name: 'بازو (cm)' }, { key: 'forearm', name: 'ساعد (cm)' },
      { key: 'thigh', name: 'ران (cm)' }, { key: 'calf', name: 'ساق (cm)' }
    ];

    var rows = [['تاریخ'].concat(metrics.map(function(m) { return m.name; }))];
    body.slice().sort(function(a, b) { return a.date.localeCompare(b.date); }).forEach(function(e) {
      var row = [e.date];
      metrics.forEach(function(m) { row.push(e[m.key] != null ? e[m.key] : ''); });
      rows.push(row);
    });

    downloadCSV('body-measurements-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    safeToast('CSV اندازه‌ها دانلود شد ✓');
  } catch(e) {
    console.error('CSV error:', e);
    safeToast('خطا: ' + e.message, 'error');
  }
}
window.exportBodyCSV = exportBodyCSV;

/* ============================================================
   PRINT REPORT
   ============================================================ */
async function printReport(targetUserId) {
  try {
    var u = getUser();
    if (!u) { safeToast('لطفاً وارد شوید', 'warn'); return; }

    var tid = targetUserId || u.id;
    var isSelf = tid === u.id;

    // Get data
    var program, history, nutrition, body;
    if (isSelf) {
      var s = getState();
      program = s.program || { days: [] };
      history = s.history || {};
      nutrition = s.nutrition || {};
      body = s.body || [];
      console.log('[Report] Using live state (self)');
    } else {
      var data = await safeApi('GET', '/api/users/' + tid + '/data');
      program = data.program || { days: [] };
      history = data.history || {};
      nutrition = data.nutrition || {};
      body = data.body || [];
    }

    // Target user
    var targetUser = u;
    if (!isSelf) {
      try {
        var allUsers = await safeApi('GET', '/api/users');
        var found = allUsers.find(function(x) { return x.id === tid; });
        if (found) targetUser = found;
      } catch(e) {}
    }

    // Debug
    var meals = nutrition.meals || {};
    var mealsInfo = Object.keys(meals).map(function(k) {
      return k + ':' + (Array.isArray(meals[k]) ? meals[k].length : 0);
    }).join(', ');
    console.log('[Report] Meals:', mealsInfo);
    console.log('[Report] Foods:', (getNUT() && getNUT().foods) ? getNUT().foods.length : 0);

    // Weekly stats
    var now = Date.now();
    var sessions7 = 0, volume7 = 0;
    Object.keys(history).forEach(function(k) {
      var t = new Date(k).getTime();
      if (now - t < 7 * 86400000) {
        if ((history[k].completed || 0) > 0) sessions7++;
        volume7 += history[k].volume || 0;
      }
    });

    // Weekly volume chart (12 weeks)
    var weekLabels = [], weekVolumes = [], weekSessions = [], weeks = [];
    for (var w = 11; w >= 0; w--) {
      var weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 1) % 7);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - w * 7);

      var vol = 0, sess = 0;
      for (var do2 = 0; do2 < 7; do2++) {
        var d2 = new Date(weekStart);
        d2.setDate(d2.getDate() + do2);
        var kk = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-' + String(d2.getDate()).padStart(2, '0');
        var hh = history[kk];
        if (hh) {
          if ((hh.completed || 0) > 0) sess++;
          vol += hh.volume || 0;
        }
      }

      weeks.push({ start: weekStart, vol: vol, sess: sess });
      weekLabels.push(weekStart.getDate() + '/' + (weekStart.getMonth() + 1));
      weekVolumes.push(Math.round(vol));
      weekSessions.push(sess);
    }
    var totalVolume12w = weekVolumes.reduce(function(s, v) { return s + v; }, 0);
    var totalSessions12w = weekSessions.reduce(function(s, v) { return s + v; }, 0);
    var avgVolume = Math.round(totalVolume12w / 12);
    var avgSessions = (totalSessions12w / 12).toFixed(1);

    // Meal definitions
    var MEAL_META = {
      breakfast: { name: 'صبحانه', emoji: '🌅' },
      snack1: { name: 'میان‌وعده صبح', emoji: '🍎' },
      lunch: { name: 'ناهار', emoji: '🍽️' },
      snack2: { name: 'میان‌وعده عصر', emoji: '🥤' },
      dinner: { name: 'شام', emoji: '🌙' }
    };

    var mealDefs = [];
    var NUT = getNUT();
    if (NUT && Array.isArray(NUT.meals) && NUT.meals.length > 0) {
      mealDefs = NUT.meals;
    } else {
      mealDefs = Object.keys(MEAL_META).map(function(k) {
        return { key: k, name: MEAL_META[k].name, emoji: MEAL_META[k].emoji };
      });
    }

    var foods = (NUT && NUT.foods) || [];
    var dataKeysWithItems = Object.keys(meals).filter(function(k) {
      return Array.isArray(meals[k]) && meals[k].length > 0;
    });

    // Add missing meal defs
    dataKeysWithItems.forEach(function(k) {
      if (!mealDefs.find(function(m) { return m.key === k; })) {
        var meta = MEAL_META[k] || { name: k, emoji: '🍽️' };
        mealDefs.push({ key: k, name: meta.name, emoji: meta.emoji });
      }
    });

    var hasMeals = dataKeysWithItems.length > 0;

    // Build meal rows
    var mealTotalsGlobal = { cal: 0, prot: 0, carb: 0, fat: 0 };
    var mealBlocksHtml = '';

    if (hasMeals) {
      var activeMeals = mealDefs.filter(function(m) { return (meals[m.key] || []).length > 0; });
      mealBlocksHtml = activeMeals.map(function(meal) {
        var items = meals[meal.key] || [];
        var mTot = { cal: 0, prot: 0, carb: 0, fat: 0 };
        var rowsHtml = items.map(function(it) {
          var food = foods.find(function(f) { return f.id === it.foodId; });
          if (!food) return '<tr><td colspan="6" style="text-align:center;color:#f43f5e;padding:6px">⚠️ غذای ناشناخته</td></tr>';
          var unit = (food.units && food.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
          var grams = (it.qty || 0) * unit.g;
          var k = grams / 100;
          var cal = Math.round((food.cal || 0) * k);
          var prot = Math.round((food.prot || 0) * k * 10) / 10;
          var carb = Math.round((food.carb || 0) * k * 10) / 10;
          var fat = Math.round((food.fat || 0) * k * 10) / 10;
          mTot.cal += cal; mTot.prot += prot; mTot.carb += carb; mTot.fat += fat;
          return '<tr><td>' + (food.emoji || '') + ' ' + escHtml(food.name) + '</td>' +
            '<td style="text-align:center">' + it.qty + ' ' + unit.n + '</td>' +
            '<td style="text-align:center;color:#3b82f6;font-weight:700">' + cal + '</td>' +
            '<td style="text-align:center">' + prot + '</td>' +
            '<td style="text-align:center">' + carb + '</td>' +
            '<td style="text-align:center">' + fat + '</td></tr>';
        }).join('');

        mealTotalsGlobal.cal += mTot.cal;
        mealTotalsGlobal.prot += mTot.prot;
        mealTotalsGlobal.carb += mTot.carb;
        mealTotalsGlobal.fat += mTot.fat;

        return '<div style="margin-bottom:10px;padding:8px;background:#fafbfc;border-radius:6px;border:1px solid #f1f5f9;page-break-inside:avoid">' +
          '<h3 style="font-size:11px;color:#1e293b;margin-bottom:6px;padding-right:8px;border-right:3px solid #3b82f6;font-weight:800">' +
          (meal.emoji || '🍽️') + ' ' + escHtml(meal.name) + ' — ' + fN(Math.round(mTot.cal)) + ' kcal</h3>' +
          '<table><thead><tr>' +
          '<th style="text-align:right">غذا</th>' +
          '<th style="text-align:center;width:80px">مقدار</th>' +
          '<th style="text-align:center;width:55px">کالری</th>' +
          '<th style="text-align:center;width:50px">پروتئین</th>' +
          '<th style="text-align:center;width:50px">کرب</th>' +
          '<th style="text-align:center;width:50px">چربی</th>' +
          '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
      }).join('');
    }

    // Supplements
    var supplements = nutrition.supplements || [];
    var supplementsHtml = '';
    if (supplements.length) {
      supplementsHtml = '<table><thead><tr>' +
        '<th style="text-align:right">مکمل</th>' +
        '<th style="text-align:center;width:100px">دوز</th>' +
        '<th style="text-align:center;width:110px">زمان</th>' +
        '<th style="text-align:center;width:70px">وضعیت</th>' +
        '</tr></thead><tbody>' +
        supplements.map(function(s) {
          return '<tr><td style="font-weight:700">' + escHtml(s.name) + '</td>' +
            '<td style="text-align:center;color:#f59e0b;font-weight:700">' + escHtml(s.dose || '—') + '</td>' +
            '<td style="text-align:center">' + escHtml(s.timing || '—') + '</td>' +
            '<td style="text-align:center;color:' + (s.enabled ? '#10b981' : '#94a3b8') + ';font-weight:700">' + (s.enabled ? '✓ فعال' : 'غیرفعال') + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    // Body data
    var bodySorted = body.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
    var bodyTableHtml = '';
    if (bodySorted.length > 0) {
      var metrics = [
        { key: 'weight', name: 'وزن' }, { key: 'bodyfat', name: 'چربی' },
        { key: 'neck', name: 'گردن' }, { key: 'chest', name: 'سینه' },
        { key: 'waist', name: 'کمر' }, { key: 'hip', name: 'باسن' },
        { key: 'arm', name: 'بازو' }, { key: 'forearm', name: 'ساعد' },
        { key: 'thigh', name: 'ران' }, { key: 'calf', name: 'ساق' }
      ];
      var recent = bodySorted.slice(-15).reverse();
      bodyTableHtml = '<table><thead><tr><th style="text-align:right">تاریخ</th>' +
        metrics.map(function(m) { return '<th style="text-align:center">' + m.name + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        recent.map(function(e) {
          return '<tr><td style="font-weight:700">' + e.date + '</td>' +
            metrics.map(function(m) { return '<td style="text-align:center">' + (e[m.key] != null ? e[m.key] : '—') + '</td>'; }).join('') +
            '</tr>';
        }).join('') + '</tbody></table>';
    }

    // Roles
    var roleNames = { admin: 'مدیر', coach: 'مربی', student: 'شاگرد' };

    // Build report parts
    var P = [];
    P.push('<!DOCTYPE html>');
    P.push('<html lang="fa" dir="rtl">');
    P.push('<head>');
    P.push('<meta charset="UTF-8">');
    P.push('<title>گزارش ProFit - ' + escHtml(targetUser.displayName) + '</title>');
    P.push('<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&display=swap" rel="stylesheet">');
    P.push('<style>');
    P.push('@page{size:A4 portrait;margin:12mm 10mm}');
    P.push('*{margin:0;padding:0;box-sizing:border-box;font-family:Vazirmatn,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}');
    P.push('body{background:#fff;color:#0f172a;line-height:1.6;font-size:11px;padding:0}');
    P.push('.header{text-align:center;padding-bottom:12px;margin-bottom:16px;border-bottom:3px solid #3b82f6}');
    P.push('.header h1{font-size:20px;color:#3b82f6;margin-bottom:5px}');
    P.push('.header .sub{font-size:10px;color:#64748b}');
    P.push('.section{margin-bottom:16px}');
    P.push('.section h2{font-size:13px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;color:#1e293b}');
    P.push('.new-page{page-break-before:always;break-before:page}');
    P.push('.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}');
    P.push('.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px}');
    P.push('.stat{padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0}');
    P.push('.stat .lbl{font-size:9px;color:#64748b;font-weight:700}');
    P.push('.stat .val{font-size:16px;font-weight:900;color:#3b82f6;margin-top:3px}');
    P.push('.stat.green .val{color:#10b981}');
    P.push('.stat.orange .val{color:#f59e0b}');
    P.push('.stat.purple .val{color:#a855f7}');
    P.push('table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px}');
    P.push('th{background:#f1f5f9;padding:5px 4px;text-align:right;font-weight:800;color:#475569;font-size:9px}');
    P.push('td{padding:4px;border-bottom:1px solid #f1f5f9}');
    P.push('.macro{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:10px 0}');
    P.push('.mbox{text-align:center;padding:8px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0}');
    P.push('.mbox .ml{font-size:8px;color:#64748b;font-weight:700}');
    P.push('.mbox .mv{font-size:13px;font-weight:900;margin-top:2px}');
    P.push('.mbox.cal .mv{color:#10b981}');
    P.push('.mbox.prot .mv{color:#f43f5e}');
    P.push('.mbox.carb .mv{color:#3b82f6}');
    P.push('.mbox.fat .mv{color:#f59e0b}');
    P.push('.empty{padding:20px;text-align:center;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:12px}');
    P.push('.footer{text-align:center;padding-top:14px;margin-top:20px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8}');
    P.push('.no-print{position:fixed;bottom:20px;left:20px;display:flex;gap:8px;z-index:1000}');
    P.push('.no-print button{padding:10px 20px;border-radius:10px;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}');
    P.push('@media print{body{padding:0}.no-print{display:none!important}}');
    P.push('</style>');
    P.push('</head>');
    P.push('<body>');

    // Header
    P.push('<div class="header">');
    P.push('<h1>🏋️ گزارش کامل ProFit</h1>');
    P.push('<div class="sub"><b>' + escHtml(targetUser.displayName) + '</b> — @' + escHtml(targetUser.username) + ' — ' + (roleNames[targetUser.role] || targetUser.role) + '</div>');
    P.push('<div class="sub" style="margin-top:4px">تاریخ: ' + new Date().toLocaleDateString('fa-IR') + '</div>');
    if (!isSelf) P.push('<div class="sub" style="margin-top:4px;color:#f59e0b;font-weight:700">تولید توسط: ' + escHtml(u.displayName) + '</div>');
    P.push('</div>');

    // PAGE 1: Weekly Summary
    P.push('<div class="section">');
    P.push('<h2>📊 خلاصه عملکرد هفتگی</h2>');
    P.push('<div class="grid">');
    P.push('<div class="stat green"><div class="lbl">جلسات این هفته</div><div class="val">' + fN(sessions7) + '</div></div>');
    P.push('<div class="stat"><div class="lbl">حجم کل (kg)</div><div class="val">' + fN(Math.round(volume7)) + '</div></div>');
    P.push('<div class="stat purple"><div class="lbl">روزهای برنامه</div><div class="val">' + fN((program.days || []).length) + '</div></div>');
    P.push('</div></div>');

    // Volume Chart
    P.push('<div class="section">');
    P.push('<h2>💪 حجم تمرین (۱۲ هفته اخیر)</h2>');
    if (totalVolume12w > 0) {
      P.push('<div class="grid4">');
      P.push('<div class="stat"><div class="lbl">حجم کل</div><div class="val">' + fN(totalVolume12w) + '</div></div>');
      P.push('<div class="stat green"><div class="lbl">میانگین هفتگی</div><div class="val">' + fN(avgVolume) + '</div></div>');
      P.push('<div class="stat orange"><div class="lbl">جلسات</div><div class="val">' + fN(totalSessions12w) + '</div></div>');
      P.push('<div class="stat purple"><div class="lbl">میانگین جلسه</div><div class="val">' + avgSessions + '</div></div>');
      P.push('</div>');
      P.push(generateBarChartSVG(weekVolumes, weekLabels, { color: '#3b82f6', color2: '#a855f7' }));
    } else {
      P.push('<div class="empty">📭 هنوز داده تمرینی ثبت نشده</div>');
    }
    P.push('</div>');

    // PAGE 2: Program
    P.push('<div class="section new-page">');
    P.push('<h2>🗓️ برنامه تمرینی</h2>');
    if (program.days && program.days.length) {
      program.days.forEach(function(day) {
        P.push('<div style="margin-bottom:10px;padding:8px;background:#fafbfc;border-radius:6px;border:1px solid #f1f5f9">');
        P.push('<h3 style="font-size:11px;color:#1e293b;margin-bottom:6px;padding-right:8px;border-right:3px solid #3b82f6;font-weight:800">' + (day.icon || '💪') + ' ' + escHtml(day.name) + ' — ' + escHtml(day.focus || '') + '</h3>');
        P.push('<table><thead><tr><th style="width:25px;text-align:center">#</th><th>حرکت</th><th style="text-align:center;width:45px">ست</th><th style="text-align:center;width:65px">تکرار</th><th style="text-align:center;width:45px">RPE</th></tr></thead><tbody>');
        (day.exercises || []).forEach(function(ex, i) {
          var def = ((getDB() || {}).exercises || []).find(function(e) { return e.id === ex.exId; }) || {};
          P.push('<tr><td style="text-align:center;color:#94a3b8;font-weight:700">' + (i + 1) + '</td>');
          P.push('<td style="font-weight:700">' + escHtml(def.name || ex.exId) + '</td>');
          P.push('<td style="text-align:center;color:#3b82f6;font-weight:700">' + (ex.sets || 3) + '</td>');
          P.push('<td style="text-align:center">' + escHtml(ex.reps || '—') + '</td>');
          P.push('<td style="text-align:center;color:#f59e0b;font-weight:700">' + escHtml(ex.rpe || '—') + '</td></tr>');
        });
        P.push('</tbody></table></div>');
      });
    } else {
      P.push('<div class="empty">📭 هنوز برنامه‌ای ساخته نشده</div>');
    }
    P.push('</div>');

    // PAGE 3: Nutrition
    P.push('<div class="section new-page">');
    P.push('<h2>🎯 اهداف تغذیه</h2>');
    var targets = nutrition.targets;
    if (targets) {
      P.push('<div class="grid">');
      P.push('<div class="stat"><div class="lbl">BMR</div><div class="val">' + fN(targets.bmr || 0) + '</div></div>');
      P.push('<div class="stat"><div class="lbl">TDEE</div><div class="val">' + fN(targets.tdee || 0) + '</div></div>');
      P.push('<div class="stat green"><div class="lbl">کالری هدف</div><div class="val">' + fN(targets.calories || 0) + '</div></div>');
      P.push('</div>');
      P.push('<div class="macro">');
      P.push('<div class="mbox prot"><div class="ml">پروتئین</div><div class="mv">' + (targets.protein || 0) + 'g</div></div>');
      P.push('<div class="mbox carb"><div class="ml">کربوهیدرات</div><div class="mv">' + (targets.carbs || 0) + 'g</div></div>');
      P.push('<div class="mbox fat"><div class="ml">چربی</div><div class="mv">' + (targets.fat || 0) + 'g</div></div>');
      P.push('<div class="mbox cal"><div class="ml">جمع</div><div class="mv">' + fN((targets.protein || 0) * 4 + (targets.carbs || 0) * 4 + (targets.fat || 0) * 9) + '</div></div>');
      P.push('</div>');
    } else {
      P.push('<div class="empty">🧮 کالری محاسبه نشده</div>');
    }
    P.push('</div>');

    // Meals
    P.push('<div class="section">');
    P.push('<h2>🍽️ برنامه غذایی روزانه</h2>');
    if (hasMeals) {
      P.push(mealBlocksHtml);
      P.push('<div class="macro" style="background:#f0fdf4;padding:10px;border-radius:8px;border:1px solid #bbf7d0">');
      P.push('<div class="mbox cal"><div class="ml">کالری</div><div class="mv">' + fN(Math.round(mealTotalsGlobal.cal)) + '</div></div>');
      P.push('<div class="mbox prot"><div class="ml">پروتئین</div><div class="mv">' + mealTotalsGlobal.prot.toFixed(1) + 'g</div></div>');
      P.push('<div class="mbox carb"><div class="ml">کربوهیدرات</div><div class="mv">' + mealTotalsGlobal.carb.toFixed(1) + 'g</div></div>');
      P.push('<div class="mbox fat"><div class="ml">چربی</div><div class="mv">' + mealTotalsGlobal.fat.toFixed(1) + 'g</div></div>');
      P.push('</div>');
    } else {
      P.push('<div class="empty">🍽️ هنوز غذایی اضافه نشده</div>');
    }
    P.push('</div>');

    // PAGE 4: Supplements
    P.push('<div class="section new-page">');
    P.push('<h2>💊 مکمل‌ها</h2>');
    if (supplements.length) {
      P.push('<div style="font-size:10px;color:#64748b;margin-bottom:10px;padding:6px 10px;background:#fef3c7;border-radius:6px;border-right:3px solid #f59e0b">⚠️ قبل از مصرف با پزشک مشورت کن.</div>');
      P.push(supplementsHtml);
    } else {
      P.push('<div class="empty">💊 مکملی تنظیم نشده</div>');
    }
    P.push('</div>');

    // PAGE 5: Body
    P.push('<div class="section new-page">');
    P.push('<h2>📏 اندازه‌های بدن</h2>');
    if (bodyTableHtml) {
      P.push(bodyTableHtml);
    } else {
      P.push('<div class="empty">📏 اندازه‌ای ثبت نشده</div>');
    }
    P.push('</div>');

    // Footer
    P.push('<div class="footer">');
    P.push('<div>گزارش تولیدشده توسط <b>ProFit</b> — ' + new Date().toLocaleString('fa-IR') + '</div>');
    P.push('</div>');

    // Print buttons
    P.push('<div class="no-print">');
    P.push('<button onclick="window.print()" style="border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff">🖨️ چاپ / PDF</button>');
    P.push('<button onclick="window.close()" style="border:1px solid #cbd5e1;background:#fff;color:#334155">بستن</button>');
    P.push('</div>');

    P.push('</body></html>');

    var html = P.join('\n');

    // Open
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var w = window.open(url, '_blank');
    if (!w) {
      URL.revokeObjectURL(url);
      safeToast('پاپ‌آپ بلاک شده — اجازه بده', 'warn');
      return;
    }
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  } catch(e) {
    console.error('printReport error:', e);
    safeToast('خطا: ' + e.message, 'error');
  }
}
window.printReport = printReport;

/* ============================================================
   EXPORT DRAWER
   ============================================================ */
function openExportDrawer() {
  var drawer = document.getElementById('exportDrawer');
  var backdrop = document.getElementById('exportBackdrop');

  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'exportBackdrop';
    backdrop.className = 'backdrop';
    backdrop.onclick = function() { closeDrawerById('exportDrawer'); };
    document.body.appendChild(backdrop);

    drawer = document.createElement('div');
    drawer.id = 'exportDrawer';
    drawer.className = 'drawer right';
    drawer.innerHTML = '<div class="drawer-header"><h2>📤 خروجی و بکاپ</h2>' +
      '<button class="close-btn" onclick="closeDrawer(\'exportDrawer\')">✕</button></div>' +
      '<div class="drawer-body" id="exportDrawerBody"></div>';
    document.body.appendChild(drawer);
  }

  renderExportBody();

  // Open
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}
window.openExportDrawer = openExportDrawer;

function closeDrawerById(id) {
  var d = document.getElementById(id);
  if (d) d.classList.remove('open');
  var b = document.getElementById(id.replace('Drawer', 'Backdrop'));
  if (b) b.classList.remove('open');
}

function renderExportBody() {
  var el = document.getElementById('exportDrawerBody');
  if (!el) return;

  var u = getUser();
  if (!u) { el.innerHTML = '<div class="empty">لطفاً وارد شوید</div>'; return; }

  var isAdmin = u.role === 'admin';

  var h = '';
  h += '<div class="card" style="margin-bottom:14px"><div style="font-size:.78rem;color:var(--tx2);line-height:1.9">💾 از این بخش می‌تونی داده‌هات رو دانلود یا بازیابی کنی.</div></div>';

  h += '<div class="sh">📦 بکاپ کامل (JSON)</div>';
  h += '<button class="btn primary full" style="margin-bottom:8px;justify-content:flex-start;padding:14px" onclick="exportUserData(\'' + u.id + '\',\'' + u.username + '\')">';
  h += '<span style="font-size:1.2rem">💾</span><div style="flex:1;text-align:right"><div style="font-weight:800">دانلود بکاپ کامل</div><div style="font-size:.68rem;opacity:.8">همه داده‌ها</div></div></button>';

  h += '<button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="importUserData(\'' + u.id + '\')">';
  h += '<span style="font-size:1.2rem">📥</span><div style="flex:1;text-align:right"><div style="font-weight:800">بازیابی از بکاپ</div><div style="font-size:.68rem;color:var(--tx2)">فایل JSON بارگذاری کن</div></div></button>';

  h += '<div class="sh">📊 خروجی CSV</div>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportWorkoutCSV()"><span style="font-size:1.1rem">🏋️</span><span style="flex:1;text-align:right;font-size:.82rem">سابقه تمرینات</span></button>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportNutritionCSV()"><span style="font-size:1.1rem">🥗</span><span style="flex:1;text-align:right;font-size:.82rem">برنامه غذایی</span></button>';
  h += '<button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:12px" onclick="exportBodyCSV()"><span style="font-size:1.1rem">📏</span><span style="flex:1;text-align:right;font-size:.82rem">اندازه‌های بدن</span></button>';

  h += '<div class="sh">🖨️ گزارش PDF</div>';
  h += '<button class="btn success full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="printReport(\'' + u.id + '\')">';
  h += '<span style="font-size:1.2rem">📄</span><div style="flex:1;text-align:right"><div style="font-weight:800">گزارش کامل</div><div style="font-size:.68rem">شامل حجم، تغذیه، مکمل و اندازه‌ها</div></div></button>';

  if (isAdmin) {
    h += '<div class="sh">👑 مدیر</div>';
    h += '<button class="btn admin full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportAllUsersBackup()"><span style="font-size:1.1rem">👥</span><div style="flex:1;text-align:right"><div style="font-weight:800;font-size:.82rem">بکاپ همه کاربران</div></div></button>';
  }

  el.innerHTML = h;
}

/* ============================================================
   HELP DRAWER
   ============================================================ */
var HELP_CONTENT = {
  student: {
    icon: '🎓',
    title: 'راهنمای شاگرد',
    sections: [
      { title: '🚀 شروع سریع', items: [
        { q: 'چطور برنامه بسازم؟', a: 'تب «برنامه» → هوشمند، دستی یا ارجاع به مربی.' },
        { q: 'چطور به مربی وصل شم؟', a: 'تب «برنامه» → «ارجاع به مربی».' }
      ]},
      { title: '💪 تمرین', items: [
        { q: 'وزنه و تکرار؟', a: 'توی جدول هر حرکت پر کن. دکمه ⤴ از ست قبلی کپی می‌کنه.' },
        { q: 'تایمر؟', a: 'دکمه ▶ کنار هر ست.' }
      ]},
      { title: '🥗 تغذیه', items: [
        { q: 'محاسبه کالری؟', a: 'تب «تغذیه» → «محاسبه».' },
        { q: 'افزودن غذا؟', a: 'تب «غذاها» → روی وعده بزن → «افزودن غذا».' }
      ]},
      { title: '📤 خروجی', items: [
        { q: 'بکاپ؟', a: 'آیکن 👤 → «خروجی و بکاپ» → «دانلود بکاپ».' },
        { q: 'گزارش PDF؟', a: '«گزارش کامل» رو بزن.' }
      ]}
    ]
  },
  coach: {
    icon: '👨‍🏫',
    title: 'راهنمای مربی',
    sections: [
      { title: '👥 شاگردان', items: [
        { q: 'افزودن شاگرد؟', a: 'پنل مربی → «افزودن شاگرد».' }
      ]},
      { title: '📨 درخواست‌ها', items: [
        { q: 'کجا؟', a: 'بالای پنل مربی، بخش نارنجی.' },
        { q: 'قبول؟', a: 'روی «✓ قبول می‌کنم».' }
      ]}
    ]
  },
  admin: {
    icon: '👑',
    title: 'راهنمای مدیر',
    sections: [
      { title: '⏳ تأیید مربی', items: [
        { q: 'چطور؟', a: 'پنل مدیر → تب «مربیان» → ✅.' }
      ]},
      { title: '📨 درخواست‌ها', items: [
        { q: 'کجا؟', a: 'تب «درخواست برنامه».' }
      ]},
      { title: '👥 کاربران', items: [
        { q: 'ساخت؟', a: 'تب «کاربران» → «افزودن کاربر».' }
      ]}
    ]
  }
};

function openHelpDrawer() {
  var drawer = document.getElementById('helpDrawer');
  var backdrop = document.getElementById('helpBackdrop');

  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'helpBackdrop';
    backdrop.className = 'backdrop';
    backdrop.onclick = function() { closeDrawerById('helpDrawer'); };
    document.body.appendChild(backdrop);

    drawer = document.createElement('div');
    drawer.id = 'helpDrawer';
    drawer.className = 'drawer right';
    drawer.innerHTML = '<div class="drawer-header"><h2>📚 راهنما</h2>' +
      '<button class="close-btn" onclick="closeDrawer(\'helpDrawer\')">✕</button></div>' +
      '<div class="drawer-body" id="helpDrawerBody"></div>';
    document.body.appendChild(drawer);
  }

  renderHelpBody();
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}
window.openHelpDrawer = openHelpDrawer;

function renderHelpBody() {
  var el = document.getElementById('helpDrawerBody');
  if (!el) return;
  var u = getUser();
  var role = u ? u.role : 'student';
  var content = HELP_CONTENT[role] || HELP_CONTENT.student;

  var h = '';
  h += '<div style="text-align:center;padding:14px 0 18px">';
  h += '<div style="font-size:2.5rem;margin-bottom:6px">' + content.icon + '</div>';
  h += '<div style="font-weight:900;font-size:1.05rem">' + content.title + '</div>';
  h += '</div>';

  content.sections.forEach(function(sec, si) {
    h += '<div style="margin-bottom:14px">';
    h += '<div class="sh" style="cursor:pointer" onclick="toggleHelpSection(' + si + ')">';
    h += '<span>' + sec.title + '</span>';
    h += '<span id="helpArrow_' + si + '" style="font-size:.9rem">▼</span>';
    h += '</div>';
    h += '<div id="helpSec_' + si + '" style="display:none">';
    sec.items.forEach(function(it) {
      h += '<div style="background:var(--card2);border-radius:10px;margin-bottom:8px;overflow:hidden">';
      h += '<div style="padding:10px 12px;font-weight:800;font-size:.82rem;color:var(--bl);cursor:pointer;display:flex;align-items:center;gap:6px" onclick="toggleHelpItem(this)">';
      h += '<span style="color:var(--am)">❓</span>';
      h += '<span style="flex:1">' + it.q + '</span>';
      h += '<span style="font-size:.7rem;color:var(--tm)">›</span>';
      h += '</div>';
      h += '<div style="display:none;padding:0 12px 12px;font-size:.78rem;color:var(--tx2);line-height:1.9">' + it.a + '</div>';
      h += '</div>';
    });
    h += '</div></div>';
  });

  el.innerHTML = h;
  setTimeout(function() { window.toggleHelpSection(0); }, 100);
}

window.toggleHelpSection = function(si) {
  var el = document.getElementById('helpSec_' + si);
  var arrow = document.getElementById('helpArrow_' + si);
  if (!el) return;
  var isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0)' : 'rotate(180deg)';
};

window.toggleHelpItem = function(headerEl) {
  var body = headerEl.nextElementSibling;
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
};

/* ============================================================
   TOOLBAR BUTTONS INJECTION
   ============================================================ */
function addToolbarButtons() {
  try {
    var tb = document.getElementById('toolbar');
    if (!tb) return;

    if (!document.getElementById('helpToolbarBtn')) {
      var b1 = document.createElement('button');
      b1.id = 'helpToolbarBtn';
      b1.className = 'btn';
      b1.innerHTML = '<span>❓</span> راهنما';
      b1.onclick = function() { openHelpDrawer(); };
      tb.appendChild(b1);
    }

    if (!document.getElementById('expToolbarBtn')) {
      var b2 = document.createElement('button');
      b2.id = 'expToolbarBtn';
      b2.className = 'btn';
      b2.innerHTML = '<span>📤</span> خروجی';
      b2.onclick = function() { openExportDrawer(); };
      tb.appendChild(b2);
    }
  } catch(e) {
    console.warn('[Extras] toolbar button error:', e);
  }
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener('keydown', function(e) {
  try {
    var t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (e.ctrlKey && e.key === 'h') { e.preventDefault(); openHelpDrawer(); }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); openExportDrawer(); }
  } catch(err) {}
});

/* ============================================================
   BOOT
   ============================================================ */
ready(function() {
  try {
    console.log('✅ [Extras v1.6] Ready');

    // Inject toolbar buttons every 800ms as backup
    setInterval(addToolbarButtons, 800);
    setTimeout(addToolbarButtons, 500);
    setTimeout(addToolbarButtons, 1500);

    // Observe toolbar changes
    var observer = new MutationObserver(function() {
      addToolbarButtons();
    });

    var watchTimer = setInterval(function() {
      var tb = document.getElementById('toolbar');
      if (tb && !tb.__observed) {
        tb.__observed = true;
        observer.observe(tb, { childList: true, subtree: false });
        clearInterval(watchTimer);
      }
    }, 500);
  } catch(e) {
    console.error('[Extras] boot error:', e);
  }
});

console.log('✨ [Extras v1.6] Loaded');
console.log('   Shortcuts: Ctrl+H (راهنما) · Ctrl+E (خروجی)');

})();
