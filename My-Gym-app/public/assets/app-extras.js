/* ============================================================
   ProFit Extras v1.7 — Fixed Foods, Units & Coach Flow
   ============================================================ */
(function() {
'use strict';

/* ============================================================
   INJECT CSS FIX — Food item layout for mobile
   ============================================================ */
(function injectCSSFix() {
  var s = document.createElement('style');
  s.id = 'extras-css-fix';
  s.textContent = `
    /* Meal item layout — wider unit dropdown */
    .meal-item {
      display: grid !important;
      grid-template-columns: 24px minmax(60px, 1fr) 130px 52px 22px !important;
      gap: 5px !important;
      align-items: center !important;
      padding: 7px 2px !important;
      font-size: .76rem !important;
    }
    .mi-qty-wrap {
      display: grid !important;
      grid-template-columns: 48px 1fr !important;
      gap: 4px !important;
      align-items: center !important;
    }
    .mi-qty {
      width: 100% !important;
      padding: 6px 3px !important;
      text-align: center !important;
      font-size: .74rem !important;
    }
    .mi-unit {
      width: 100% !important;
      padding: 6px 2px !important;
      font-size: .68rem !important;
      direction: rtl !important;
      text-overflow: ellipsis !important;
      overflow: hidden !important;
      white-space: nowrap !important;
    }
    .mi-name {
      font-size: .72rem !important;
      line-height: 1.3 !important;
    }
    .mi-kcal {
      font-size: .68rem !important;
    }
    @media (max-width: 600px) {
      .meal-item {
        grid-template-columns: 20px minmax(50px, 1fr) 118px 46px 20px !important;
        gap: 4px !important;
        padding: 6px 2px !important;
      }
      .mi-qty-wrap {
        grid-template-columns: 42px 1fr !important;
        gap: 3px !important;
      }
      .mi-qty, .mi-unit {
        padding: 5px 2px !important;
        font-size: .66rem !important;
      }
    }
  `;
  if (document.head) document.head.appendChild(s);
  else document.addEventListener('DOMContentLoaded', function() { document.head.appendChild(s); });
})();

/* ============================================================
   OVERRIDE openNutritionForStudent — Close BOTH drawers
   ============================================================ */
window.openNutritionForStudent = async function(sid) {
  try {
    console.log('[Extras] Loading nutrition for student:', sid);

    // Fetch student data directly
    var d = await window.api('GET', '/api/users/' + sid + '/data');

    // Build nutrition object
    var nut = (d.nutrition && d.nutrition.profile)
      ? d.nutrition
      : { profile:{ gender:'male', age:30, weight:75, height:175, activity:1.55, goal:'maintain', bodyfat:20, formula:'mifflin' },
          targets:null,
          meals:{ breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] },
          supplements:[], suppGoalUsed:null };

    if (!nut.meals) nut.meals = { breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] };
    if (!nut.supplements) nut.supplements = [];

    // Update state
    window.state.nutrition = nut;
    window.state.nutritionOwnerId = (sid === window.state.user.id) ? null : sid;

    // Close ALL drawers
    window.closeDrawer('studentDetailDrawer');
    window.closeDrawer('coachDrawer');
    window.closeDrawer('adminDrawer');

    // Small delay for drawer animation, then switch view
    setTimeout(function() {
      window.state.currentView = 'nutrition';
      window.state.nutritionTab = 'calc';
      window.renderView();
      window.toast('تغذیه شاگرد بارگذاری شد ✓');
    }, 200);

  } catch (e) {
    console.error('openNutritionForStudent error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
};

/* ============================================================
   CHART SVG HELPERS
   ============================================================ */
function fN(n) {
  if (n == null || isNaN(n)) return '—';
  try { return Number(n).toLocaleString('fa-IR'); } catch(e) { return String(n); }
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateBarChartSVG(data, labels, opts) {
  opts = opts || {};
  var width = opts.width || 480, height = opts.height || 200;
  var pad = { top: 20, right: 15, bottom: 40, left: 50 };
  var chartW = width - pad.left - pad.right;
  var chartH = height - pad.top - pad.bottom;
  var color = opts.color || '#3b82f6';
  var color2 = opts.color2 || '#a855f7';

  if (!data || data.length === 0) return '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:12px">داده‌ای نیست</div>';

  var max = Math.max.apply(null, data.concat([1]));
  var realMax = max * 1.15;
  var barCount = data.length;
  var groupW = chartW / barCount;
  var barW = groupW * 0.6;

  var grid = '';
  for (var i = 0; i <= 4; i++) {
    var y = pad.top + (i / 4) * chartH;
    var val = realMax - (i / 4) * realMax;
    grid += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (width - pad.right) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="' + (i === 0 || i === 4 ? '' : '3,3') + '"/>';
    grid += '<text x="' + (pad.left - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + fN(Math.round(val)) + '</text>';
  }

  var gid = 'g' + Math.random().toString(36).slice(2, 8);
  var bars = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' + color + '"/><stop offset="100%" stop-color="' + color2 + '"/>' +
    '</linearGradient></defs>';

  data.forEach(function(v, i) {
    var groupX = pad.left + i * groupW;
    var h = (v / realMax) * chartH;
    var x = groupX + (groupW - barW) / 2;
    var y = pad.top + chartH - h;
    bars += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" rx="4" fill="url(#' + gid + ')" opacity="0.9"/>';
    if (v > 0) bars += '<text x="' + (x + barW / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="9" fill="#475569" font-weight="800">' + fN(Math.round(v)) + '</text>';
  });

  var xLabels = '';
  labels.forEach(function(l, i) {
    var x = pad.left + i * groupW + groupW / 2;
    xLabels += '<text x="' + x + '" y="' + (height - 12) + '" text-anchor="middle" font-size="8" fill="#64748b" font-weight="600">' + l + '</text>';
  });

  return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" style="display:block;background:#fafbfc;border-radius:6px;border:1px solid #e2e8f0">' + grid + bars + xLabels + '</svg>';
}

/* ============================================================
   OVERRIDE generateSampleMeals — Match target macros properly
   ============================================================ */
window.generateSampleMeals = function() {
  var t = window.state.nutrition.targets;
  if (!t) { window.toast('ابتدا کالری را محاسبه کن', 'warn'); return; }

  var NUT = window.NUT || {};
  var foods = NUT.foods || [];

  var templates = {
    breakfast: { p: 'egg_whole', c: 'oat', f: 'almond', fr: 'banana' },
    snack1: { f: 'almond', fr: 'apple' },
    lunch: { p: 'chicken_breast', c: 'rice_white', f: 'olive_oil', v: 'broccoli' },
    snack2: { p: 'yogurt_low', f: 'walnut' },
    dinner: { p: 'salmon', c: 'sweet_potato', f: 'olive_oil', v: 'spinach' }
  };

  function getFood(id) { return foods.find(function(f) { return f.id === id; }); }

  NUT.meals.forEach(function(meal) {
    var tp = templates[meal.key];
    if (!tp) return;

    var mCal = t.calories * meal.pct;
    var mProt = t.protein * meal.pct;
    var mCarb = t.carbs * meal.pct;
    var mFat = t.fat * meal.pct;

    var items = [];
    var accCal = 0, accProt = 0, accCarb = 0, accFat = 0;

    function addFood(foodId, grams) {
      var f = getFood(foodId);
      if (!f || grams <= 0) return;
      var k = grams / 100;
      items.push({ foodId: foodId, qty: Math.round(grams * 10) / 10, unitIdx: 0 });
      accCal += (f.cal || 0) * k;
      accProt += (f.prot || 0) * k;
      accCarb += (f.carb || 0) * k;
      accFat += (f.fat || 0) * k;
    }

    // 1. Protein source: cover 90% of protein target
    if (tp.p) {
      var fp = getFood(tp.p);
      if (fp && fp.prot > 0) {
        var needed = (mProt * 0.9) / (fp.prot / 100);
        addFood(tp.p, Math.max(30, Math.min(280, needed)));
      }
    }

    // 2. Carb source: remaining carbs
    if (tp.c) {
      var fc = getFood(tp.c);
      if (fc && fc.carb > 0) {
        var rem = Math.max(0, mCarb - accCarb);
        var needed2 = (rem * 0.95) / (fc.carb / 100);
        addFood(tp.c, Math.max(20, Math.min(300, needed2)));
      }
    }

    // 3. Fat source: remaining fat
    if (tp.f) {
      var ff = getFood(tp.f);
      if (ff && ff.fat > 0) {
        var remF = Math.max(0, mFat - accFat);
        var needed3 = (remF * 0.9) / (ff.fat / 100);
        addFood(tp.f, Math.max(4, Math.min(50, needed3)));
      }
    }

    // 4. Veggie / fruit (fixed)
    if (tp.v) addFood(tp.v, 150);
    if (tp.fr) addFood(tp.fr, 100);

    // 5. Fine tune: if total cal deviates >15%, scale protein/carb/fat items
    if (accCal > 0) {
      var ratio = mCal / accCal;
      if (ratio < 0.85 || ratio > 1.15) {
        items.forEach(function(it) {
          if (it.foodId === tp.v || it.foodId === tp.fr) return;
          it.qty = Math.round(it.qty * ratio * 10) / 10;
          if (it.qty < 1) it.qty = 1;
        });
      }
    }

    window.state.nutrition.meals[meal.key] = items;
  });

  // Save
  var targetId = window.state.nutritionOwnerId || window.state.user.id;
  window.api('POST', '/api/users/' + targetId + '/data/nutrition', { value: window.state.nutrition }).catch(function(){});
  window.renderView();
  window.toast('✓ نمونه ساخته شد', 'success');
};

/* ============================================================
   PRINT REPORT — Robust, always shows data
   ============================================================ */
window.printReport = async function(targetUserId) {
  try {
    var u = window.state.user;
    if (!u) { window.toast('لطفاً وارد شوید', 'warn'); return; }

    var tid = targetUserId || u.id;
    var isSelf = (tid === u.id);

    // ====== 1. GET DATA (multi-source) ======
    var program, history, nutrition, body;

    if (isSelf) {
      program = window.state.program || { days: [] };
      history = window.state.history || {};
      nutrition = window.state.nutrition || {};
      body = window.state.body || [];
      console.log('[Report] Source: LIVE state');
    } else {
      var d = await window.api('GET', '/api/users/' + tid + '/data');
      program = d.program || { days: [] };
      history = d.history || {};
      nutrition = d.nutrition || {};
      body = d.body || [];
      console.log('[Report] Source: API for ' + tid);
    }

    // ALWAYS fetch fresh from API as backup
    try {
      var fresh = await window.api('GET', '/api/users/' + tid + '/data');
      if (fresh.nutrition && fresh.nutrition.meals) {
        var freshMeals = fresh.nutrition.meals;
        var hasItems = Object.keys(freshMeals).some(function(k) {
          return Array.isArray(freshMeals[k]) && freshMeals[k].length > 0;
        });
        var stateHasItems = nutrition.meals && Object.keys(nutrition.meals).some(function(k) {
          return Array.isArray(nutrition.meals[k]) && nutrition.meals[k].length > 0;
        });
        if (hasItems && !stateHasItems) {
          nutrition = fresh.nutrition;
          console.log('[Report] ✅ Using API nutrition (state had no meals)');
        }
      }
    } catch(e) { console.warn('[Report] API fetch failed:', e.message); }

    // Debug
    var mealsObj = nutrition.meals || {};
    var mealsDebug = Object.keys(mealsObj).map(function(k) {
      var arr = mealsObj[k];
      return k + ':' + (Array.isArray(arr) ? arr.length : '?');
    }).join(', ') || 'EMPTY';
    console.log('[Report] Meals:', mealsDebug);
    console.log('[Report] Foods available:', (window.NUT && window.NUT.foods) ? window.NUT.foods.length : 0);
    console.log('[Report] Body records:', body.length);

    // ====== 2. TARGET USER INFO ======
    var targetUser = u;
    if (!isSelf) {
      try {
        var allUsers = await window.api('GET', '/api/users');
        var found = allUsers.find(function(x) { return x.id === tid; });
        if (found) targetUser = found;
      } catch(e) {}
    }

    // ====== 3. WEEKLY STATS ======
    var now = Date.now();
    var sessions7 = 0, volume7 = 0;
    Object.keys(history).forEach(function(k) {
      var t = new Date(k).getTime();
      if (now - t < 7 * 86400000) {
        if ((history[k].completed || 0) > 0) sessions7++;
        volume7 += history[k].volume || 0;
      }
    });

    // ====== 4. WEEKLY VOLUME CHART ======
    var weekLabels = [], weekVolumes = [], weekSessions = [], weeks = [];
    for (var w = 11; w >= 0; w--) {
      var ws = new Date();
      ws.setDate(ws.getDate() - (ws.getDay() + 1) % 7);
      ws.setHours(0, 0, 0, 0);
      ws.setDate(ws.getDate() - w * 7);

      var vol = 0, sess = 0;
      for (var dOff = 0; dOff < 7; dOff++) {
        var dd = new Date(ws);
        dd.setDate(dd.getDate() + dOff);
        var kk = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
        var hh = history[kk];
        if (hh) {
          if ((hh.completed || 0) > 0) sess++;
          vol += hh.volume || 0;
        }
      }

      weeks.push({ start: ws, vol: vol, sess: sess });
      weekLabels.push(ws.getDate() + '/' + (ws.getMonth() + 1));
      weekVolumes.push(Math.round(vol));
      weekSessions.push(sess);
    }
    var totalVolume12w = weekVolumes.reduce(function(s, v) { return s + v; }, 0);
    var totalSessions12w = weekSessions.reduce(function(s, v) { return s + v; }, 0);
    var avgVolume = Math.round(totalVolume12w / 12);
    var avgSessions = (totalSessions12w / 12).toFixed(1);

    // ====== 5. MEAL DEFINITIONS ======
    var MEAL_META = {
      breakfast: { name: 'صبحانه', emoji: '🌅' },
      snack1: { name: 'میان‌وعده صبح', emoji: '🍎' },
      lunch: { name: 'ناهار', emoji: '🍽️' },
      snack2: { name: 'میان‌وعده عصر', emoji: '🥤' },
      dinner: { name: 'شام', emoji: '🌙' }
    };

    var mealDefs = [];
    if (window.NUT && Array.isArray(window.NUT.meals) && window.NUT.meals.length > 0) {
      mealDefs = window.NUT.meals.slice();
      console.log('[Report] Using NUT.meals (' + mealDefs.length + ')');
    } else {
      mealDefs = Object.keys(MEAL_META).map(function(k) {
        return { key: k, name: MEAL_META[k].name, emoji: MEAL_META[k].emoji };
      });
    }

    // Add missing meal defs from data
    Object.keys(mealsObj).forEach(function(k) {
      if (!mealDefs.find(function(m) { return m.key === k; })) {
        var meta = MEAL_META[k] || { name: k, emoji: '🍽️' };
        mealDefs.push({ key: k, name: meta.name, emoji: meta.emoji });
      }
    });

    var foods = (window.NUT && window.NUT.foods) ? window.NUT.foods : [];
    var dataKeysWithItems = Object.keys(mealsObj).filter(function(k) {
      return Array.isArray(mealsObj[k]) && mealsObj[k].length > 0;
    });

    var hasMeals = dataKeysWithItems.length > 0;
    console.log('[Report] Has meals: ' + hasMeals);

    // ====== 6. BUILD MEAL TABLE ======
    var mealTotalsGlobal = { cal: 0, prot: 0, carb: 0, fat: 0 };
    var mealBlocksHtml = '';

    if (hasMeals) {
      var activeMeals = mealDefs.filter(function(m) {
        return (mealsObj[m.key] || []).length > 0;
      });

      mealBlocksHtml = activeMeals.map(function(meal) {
        var items = mealsObj[meal.key] || [];
        var mTot = { cal: 0, prot: 0, carb: 0, fat: 0 };

        var rowsHtml = items.map(function(it) {
          var food = foods.find(function(f) { return f.id === it.foodId; });
          if (!food) {
            console.warn('[Report] Food not found:', it.foodId);
            return '<tr><td colspan="6" style="text-align:center;color:#f43f5e;padding:6px;font-size:10px">⚠️ غذای ناشناخته: ' + escHtml(it.foodId || '?') + '</td></tr>';
          }
          var unit = (food.units && food.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
          var grams = (it.qty || 0) * unit.g;
          var k = grams / 100;
          var cal = Math.round((food.cal || 0) * k);
          var prot = Math.round((food.prot || 0) * k * 10) / 10;
          var carb = Math.round((food.carb || 0) * k * 10) / 10;
          var fat = Math.round((food.fat || 0) * k * 10) / 10;
          mTot.cal += cal; mTot.prot += prot; mTot.carb += carb; mTot.fat += fat;

          return '<tr>' +
            '<td>' + (food.emoji || '') + ' ' + escHtml(food.name) + '</td>' +
            '<td style="text-align:center">' + it.qty + ' ' + escHtml(unit.n) + '</td>' +
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

    // ====== 7. SUPPLEMENTS ======
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

    // ====== 8. BODY TABLE ======
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

    var roleNames = { admin: 'مدیر', coach: 'مربی', student: 'شاگرد' };

    // ====== 9. BUILD HTML ======
    var P = [];
    P.push('<!DOCTYPE html><html lang="fa" dir="rtl"><head>');
    P.push('<meta charset="UTF-8"><title>گزارش ProFit - ' + escHtml(targetUser.displayName) + '</title>');
    P.push('<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&display=swap" rel="stylesheet">');
    P.push('<style>');
    P.push('@page{size:A4 portrait;margin:12mm 10mm}');
    P.push('*{margin:0;padding:0;box-sizing:border-box;font-family:Vazirmatn,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}');
    P.push('body{background:#fff;color:#0f172a;line-height:1.6;font-size:11px;padding:0}');
    P.push('.header{text-align:center;padding-bottom:12px;margin-bottom:16px;border-bottom:3px solid #3b82f6}');
    P.push('.header h1{font-size:20px;color:#3b82f6;margin-bottom:5px}');
    P.push('.header .sub{font-size:10px;color:#64748b}');
    P.push('.section{margin-bottom:16px}.section h2{font-size:13px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;color:#1e293b}');
    P.push('.new-page{page-break-before:always;break-before:page}');
    P.push('.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}');
    P.push('.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px}');
    P.push('.stat{padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0}');
    P.push('.stat .lbl{font-size:9px;color:#64748b;font-weight:700}');
    P.push('.stat .val{font-size:16px;font-weight:900;color:#3b82f6;margin-top:3px}');
    P.push('.stat.green .val{color:#10b981}.stat.orange .val{color:#f59e0b}.stat.purple .val{color:#a855f7}');
    P.push('table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px}');
    P.push('th{background:#f1f5f9;padding:5px 4px;text-align:right;font-weight:800;color:#475569;font-size:9px}');
    P.push('td{padding:4px;border-bottom:1px solid #f1f5f9}');
    P.push('.macro{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:10px 0}');
    P.push('.mbox{text-align:center;padding:8px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0}');
    P.push('.mbox .ml{font-size:8px;color:#64748b;font-weight:700}.mbox .mv{font-size:13px;font-weight:900;margin-top:2px}');
    P.push('.mbox.cal .mv{color:#10b981}.mbox.prot .mv{color:#f43f5e}.mbox.carb .mv{color:#3b82f6}.mbox.fat .mv{color:#f59e0b}');
    P.push('.empty{padding:20px;text-align:center;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:12px}');
    P.push('.footer{text-align:center;padding-top:14px;margin-top:20px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8}');
    P.push('.no-print{position:fixed;bottom:20px;left:20px;display:flex;gap:8px;z-index:1000}');
    P.push('.no-print button{padding:10px 20px;border-radius:10px;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}');
    P.push('@media print{body{padding:0}.no-print{display:none!important}}');
    P.push('</style></head><body>');

    // Header
    P.push('<div class="header"><h1>🏋️ گزارش کامل ProFit</h1>');
    P.push('<div class="sub"><b>' + escHtml(targetUser.displayName) + '</b> — @' + escHtml(targetUser.username) + ' — ' + (roleNames[targetUser.role] || targetUser.role) + '</div>');
    P.push('<div class="sub" style="margin-top:4px">تاریخ: ' + new Date().toLocaleDateString('fa-IR') + '</div>');
    if (!isSelf) P.push('<div class="sub" style="margin-top:4px;color:#f59e0b;font-weight:700">تولید توسط: ' + escHtml(u.displayName) + '</div>');
    P.push('</div>');

    // Section 1: Weekly
    P.push('<div class="section"><h2>📊 خلاصه عملکرد هفتگی</h2><div class="grid">');
    P.push('<div class="stat green"><div class="lbl">جلسات این هفته</div><div class="val">' + fN(sessions7) + '</div></div>');
    P.push('<div class="stat"><div class="lbl">حجم کل (kg)</div><div class="val">' + fN(Math.round(volume7)) + '</div></div>');
    P.push('<div class="stat purple"><div class="lbl">روزهای برنامه</div><div class="val">' + fN((program.days || []).length) + '</div></div>');
    P.push('</div></div>');

    // Section 2: Volume Chart
    P.push('<div class="section"><h2>💪 حجم تمرین (۱۲ هفته اخیر)</h2>');
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

    // Section 3: Program
    P.push('<div class="section new-page"><h2>🗓️ برنامه تمرینی</h2>');
    if (program.days && program.days.length) {
      program.days.forEach(function(day) {
        P.push('<div style="margin-bottom:10px;padding:8px;background:#fafbfc;border-radius:6px;border:1px solid #f1f5f9">');
        P.push('<h3 style="font-size:11px;color:#1e293b;margin-bottom:6px;padding-right:8px;border-right:3px solid #3b82f6;font-weight:800">' + (day.icon || '💪') + ' ' + escHtml(day.name) + ' — ' + escHtml(day.focus || '') + '</h3>');
        P.push('<table><thead><tr><th style="width:25px;text-align:center">#</th><th>حرکت</th><th style="text-align:center;width:45px">ست</th><th style="text-align:center;width:65px">تکرار</th><th style="text-align:center;width:45px">RPE</th></tr></thead><tbody>');
        (day.exercises || []).forEach(function(ex, i) {
          var DB = window.DB || {};
          var def = (DB.exercises || []).find(function(e) { return e.id === ex.exId; }) || {};
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

    // Section 4: Nutrition targets
    P.push('<div class="section new-page"><h2>🎯 اهداف تغذیه</h2>');
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

    // Section 5: Meals
    P.push('<div class="section"><h2>🍽️ برنامه غذایی روزانه</h2>');
    if (hasMeals) {
      P.push(mealBlocksHtml);
      P.push('<div class="macro" style="background:#f0fdf4;padding:10px;border-radius:8px;border:1px solid #bbf7d0">');
      P.push('<div class="mbox cal"><div class="ml">کالری</div><div class="mv">' + fN(Math.round(mealTotalsGlobal.cal)) + '</div></div>');
      P.push('<div class="mbox prot"><div class="ml">پروتئین</div><div class="mv">' + mealTotalsGlobal.prot.toFixed(1) + 'g</div></div>');
      P.push('<div class="mbox carb"><div class="ml">کربوهیدرات</div><div class="mv">' + mealTotalsGlobal.carb.toFixed(1) + 'g</div></div>');
      P.push('<div class="mbox fat"><div class="ml">چربی</div><div class="mv">' + mealTotalsGlobal.fat.toFixed(1) + 'g</div></div>');
      P.push('</div>');
    } else {
      P.push('<div class="empty">🍽️ هنوز غذایی اضافه نشده<br><span style="font-size:10px">(توی تب تغذیه → غذاها، وعده‌هات رو پر کن)</span></div>');
    }
    P.push('</div>');

    // Section 6: Supplements
    P.push('<div class="section new-page"><h2>💊 مکمل‌ها</h2>');
    if (supplements.length) {
      P.push('<div style="font-size:10px;color:#64748b;margin-bottom:10px;padding:6px 10px;background:#fef3c7;border-radius:6px;border-right:3px solid #f59e0b">⚠️ قبل از مصرف با پزشک مشورت کن.</div>');
      P.push(supplementsHtml);
    } else {
      P.push('<div class="empty">💊 مکملی تنظیم نشده</div>');
    }
    P.push('</div>');

    // Section 7: Body
    P.push('<div class="section new-page"><h2>📏 اندازه‌های بدن</h2>');
    if (bodyTableHtml) P.push(bodyTableHtml);
    else P.push('<div class="empty">📏 اندازه‌ای ثبت نشده</div>');
    P.push('</div>');

    // Footer
    P.push('<div class="footer"><div>گزارش تولیدشده توسط <b>ProFit</b> — ' + new Date().toLocaleString('fa-IR') + '</div></div>');

    // Buttons
    P.push('<div class="no-print">');
    P.push('<button onclick="window.print()" style="border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff">🖨️ چاپ / PDF</button>');
    P.push('<button onclick="window.close()" style="border:1px solid #cbd5e1;background:#fff;color:#334155">بستن</button>');
    P.push('</div></body></html>');

    var html = P.join('\n');
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var w = window.open(url, '_blank');
    if (!w) {
      URL.revokeObjectURL(url);
      window.toast('پاپ‌آپ بلاک شده — اجازه بده', 'warn');
      return;
    }
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);

  } catch (e) {
    console.error('[Report] error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
};

/* ============================================================
   EXPORT DRAWER (simplified)
   ============================================================ */
window.openExportDrawer = function() {
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
    drawer.innerHTML = '<div class="drawer-header"><h2>📤 خروجی و بکاپ</h2><button class="close-btn" onclick="closeDrawer(\'exportDrawer\')">✕</button></div><div class="drawer-body" id="exportDrawerBody"></div>';
    document.body.appendChild(drawer);
  }
  renderExportBody();
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
};

function closeDrawerById(id) {
  var d = document.getElementById(id);
  if (d) d.classList.remove('open');
  var b = document.getElementById(id.replace('Drawer', 'Backdrop'));
  if (b) b.classList.remove('open');
}

function renderExportBody() {
  var el = document.getElementById('exportDrawerBody');
  if (!el) return;
  var u = window.state.user;
  if (!u) { el.innerHTML = '<div class="empty">لطفاً وارد شوید</div>'; return; }
  var isAdmin = u.role === 'admin';

  var h = '<div class="card" style="margin-bottom:14px"><div style="font-size:.78rem;color:var(--tx2);line-height:1.9">💾 از این بخش داده‌هات رو دانلود یا بازیابی کن.</div></div>';
  h += '<div class="sh">📦 بکاپ کامل (JSON)</div>';
  h += '<button class="btn primary full" style="margin-bottom:8px;justify-content:flex-start;padding:14px" onclick="exportUserData(\'' + u.id + '\',\'' + u.username + '\')"><span style="font-size:1.2rem">💾</span><div style="flex:1;text-align:right"><div style="font-weight:800">دانلود بکاپ</div><div style="font-size:.68rem;opacity:.8">همه داده‌ها</div></div></button>';
  h += '<button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="importUserData(\'' + u.id + '\')"><span style="font-size:1.2rem">📥</span><div style="flex:1;text-align:right"><div style="font-weight:800">بازیابی از بکاپ</div></div></button>';

  h += '<div class="sh">📊 CSV</div>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportWorkoutCSV()"><span style="font-size:1.1rem">🏋️</span><span style="flex:1;text-align:right;font-size:.82rem">سابقه تمرینات</span></button>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportNutritionCSV()"><span style="font-size:1.1rem">🥗</span><span style="flex:1;text-align:right;font-size:.82rem">برنامه غذایی</span></button>';
  h += '<button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:12px" onclick="exportBodyCSV()"><span style="font-size:1.1rem">📏</span><span style="flex:1;text-align:right;font-size:.82rem">اندازه‌های بدن</span></button>';

  h += '<div class="sh">🖨️ گزارش PDF</div>';
  h += '<button class="btn success full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="printReport(\'' + u.id + '\')"><span style="font-size:1.2rem">📄</span><div style="flex:1;text-align:right"><div style="font-weight:800">گزارش کامل</div><div style="font-size:.68rem">شامل همه بخش‌ها</div></div></button>';

  if (isAdmin) {
    h += '<div class="sh">👑 مدیر</div>';
    h += '<button class="btn admin full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportAllUsersBackup()"><span style="font-size:1.1rem">👥</span><div style="flex:1;text-align:right"><div style="font-weight:800;font-size:.82rem">بکاپ همه کاربران</div></div></button>';
  }
  el.innerHTML = h;
}

/* ============================================================
   CSV EXPORTS
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
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.exportUserData = async function(userId, username) {
  try {
    window.toast('در حال آماده‌سازی...', 'info');
    var d = await window.api('GET', '/api/users/' + userId + '/data');
    var backup = { _meta: { type: 'profit-user-backup', version: '1.0', exportedAt: new Date().toISOString(), userId: userId, username: username }, data: d };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'profit-backup-' + (username || userId) + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast('بکاپ دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportWorkoutCSV = async function() {
  try {
    var u = window.state.user;
    var d = await window.api('GET', '/api/users/' + u.id + '/data');
    var workout = d.workout || { logs: {}, completed: {} };
    var history = d.history || {};
    var program = d.program || { days: [] };
    var DB = window.DB || {};
    var exNameMap = {};
    (program.days || []).forEach(function(day) {
      (day.exercises || []).forEach(function(ex, i) {
        var def = (DB.exercises || []).find(function(e) { return e.id === ex.exId; }) || {};
        exNameMap[i] = def.name || ex.exId;
      });
    });
    var rows = [['تاریخ', 'شماره', 'نام حرکت', 'ست', 'وزنه', 'تکرار', 'حجم', 'انجام‌شده']];
    var allKeys = Object.keys(workout.logs || {}).concat(Object.keys(workout.completed || {}));
    var uniq = allKeys.filter(function(k, i, arr) { return arr.indexOf(k) === i; }).sort();
    uniq.forEach(function(key) {
      var parts = key.split(':');
      var date = parts[0], idx = parseInt(parts[1]);
      var logs = workout.logs[key] || {};
      var isDone = !!workout.completed[key];
      var setKeys = Object.keys(logs).sort(function(a, b) { return parseInt(a) - parseInt(b); });
      if (setKeys.length === 0 && !isDone) return;
      if (setKeys.length === 0) {
        rows.push([date, idx + 1, exNameMap[idx] || 'حرکت ' + (idx + 1), '-', '-', '-', '0', isDone ? 'بله' : 'خیر']);
      } else {
        setKeys.forEach(function(si) {
          var l = logs[si] || {};
          var vol = (l.weight && l.reps) ? l.weight * l.reps : 0;
          rows.push([date, idx + 1, exNameMap[idx] || 'حرکت ' + (idx + 1), parseInt(si) + 1, l.weight || '', l.reps || '', vol, isDone ? 'بله' : 'خیر']);
        });
      }
    });
    rows.push([]); rows.push(['--- خلاصه ---']); rows.push(['تاریخ', 'جلسات', 'حجم']);
    Object.keys(history).sort().forEach(function(k) { rows.push([k, history[k].completed || 0, history[k].volume || 0]); });
    downloadCSV('workout-log-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    window.toast('CSV دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportNutritionCSV = async function() {
  try {
    var u = window.state.user;
    var d = await window.api('GET', '/api/users/' + u.id + '/data');
    var nut = d.nutrition || {};
    var NUT = window.NUT || {};
    var foods = NUT.foods || [];
    var rows = [['--- پروفایل ---']];
    var p = nut.profile || {};
    rows.push(['جنسیت', p.gender === 'male' ? 'مرد' : 'زن']);
    rows.push(['سن', p.age || '']);
    rows.push(['وزن', p.weight || '']);
    rows.push(['قد', p.height || '']);
    if (nut.targets) {
      rows.push([]); rows.push(['--- اهداف ---']);
      rows.push(['BMR', nut.targets.bmr || '']);
      rows.push(['TDEE', nut.targets.tdee || '']);
      rows.push(['کالری', nut.targets.calories || '']);
      rows.push(['پروتئین', nut.targets.protein || '']);
      rows.push(['کرب', nut.targets.carbs || '']);
      rows.push(['چربی', nut.targets.fat || '']);
    }
    rows.push([]); rows.push(['--- غذاها ---']);
    rows.push(['وعده', 'غذا', 'مقدار', 'واحد', 'کالری', 'پروتئین', 'کرب', 'چربی']);
    (NUT.meals || []).forEach(function(meal) {
      var items = (nut.meals && nut.meals[meal.key]) || [];
      if (items.length === 0) { rows.push([meal.name, '—', '', '', '', '', '', '']); return; }
      items.forEach(function(it) {
        var f = foods.find(function(x) { return x.id === it.foodId; });
        if (!f) return;
        var unit = (f.units && f.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        var g = (it.qty || 0) * unit.g; var k = g / 100;
        rows.push([meal.name, f.name, it.qty, unit.n, Math.round((f.cal || 0) * k), Math.round((f.prot || 0) * k * 10) / 10, Math.round((f.carb || 0) * k * 10) / 10, Math.round((f.fat || 0) * k * 10) / 10]);
      });
    });
    downloadCSV('nutrition-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    window.toast('CSV دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportBodyCSV = async function() {
  try {
    var u = window.state.user;
    var d = await window.api('GET', '/api/users/' + u.id + '/data');
    var body = d.body || [];
    if (!body.length) { window.toast('داده‌ای نیست', 'warn'); return; }
    var metrics = [
      { key: 'weight', name: 'وزن' }, { key: 'bodyfat', name: 'چربی' },
      { key: 'neck', name: 'گردن' }, { key: 'chest', name: 'سینه' },
      { key: 'waist', name: 'کمر' }, { key: 'hip', name: 'باسن' },
      { key: 'arm', name: 'بازو' }, { key: 'forearm', name: 'ساعد' },
      { key: 'thigh', name: 'ران' }, { key: 'calf', name: 'ساق' }
    ];
    var rows = [['تاریخ'].concat(metrics.map(function(m) { return m.name; }))];
    body.slice().sort(function(a, b) { return a.date.localeCompare(b.date); }).forEach(function(e) {
      var row = [e.date];
      metrics.forEach(function(m) { row.push(e[m.key] != null ? e[m.key] : ''); });
      rows.push(row);
    });
    downloadCSV('body-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    window.toast('CSV دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportAllUsersBackup = async function() {
  try {
    window.toast('در حال آماده‌سازی...', 'info');
    var allUsers = await window.api('GET', '/api/users');
    var backup = { _meta: { type: 'profit-db-backup', version: '1.0', exportedAt: new Date().toISOString(), count: allUsers.length }, users: [] };
    for (var i = 0; i < allUsers.length; i++) {
      try {
        var d = await window.api('GET', '/api/users/' + allUsers[i].id + '/data');
        backup.users.push({ user: allUsers[i], data: d });
      } catch(e) { backup.users.push({ user: allUsers[i], data: null, error: e.message }); }
    }
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'profit-full-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast('بکاپ کامل دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.importUserData = function(userId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var text = await file.text();
      var backup = JSON.parse(text);
      if (!backup._meta || backup._meta.type !== 'profit-user-backup') { window.toast('فایل معتبر نیست', 'error'); return; }
      var fields = Object.keys(backup.data || {});
      if (!confirm('بازیابی ' + fields.length + ' بخش؟')) return;
      for (var i = 0; i < fields.length; i++) {
        await window.api('POST', '/api/users/' + userId + '/data/' + fields[i], { value: backup.data[fields[i]] });
      }
      window.toast('بازیابی شد ✓');
      setTimeout(function() { location.reload(); }, 1000);
    } catch (err) { window.toast('خطا: ' + err.message, 'error'); }
  };
  input.click();
};

/* ============================================================
   HELP DRAWER
   ============================================================ */
var HELP_CONTENT = {
  student: { icon: '🎓', title: 'راهنمای شاگرد', sections: [
    { title: '🚀 شروع', items: [
      { q: 'برنامه بسازم؟', a: 'تب «برنامه» → هوشمند / دستی / ارجاع به مربی' },
      { q: 'خروجی بگیرم؟', a: 'آیکن 👤 → «خروجی و بکاپ»' }
    ]},
    { title: '🥗 تغذیه', items: [
      { q: 'محاسبه کالری؟', a: 'تب «تغذیه» → «محاسبه»' },
      { q: 'افزودن غذا؟', a: 'تب «غذاها» → روی وعده بزن → «افزودن غذا»' },
      { q: 'تولید نمونه؟', a: 'توی تب «غذاها» دکمه «✨ تولید نمونه»' }
    ]}
  ]},
  coach: { icon: '👨‍🏫', title: 'راهنمای مربی', sections: [
    { title: '👥 شاگردان', items: [{ q: 'افزودن؟', a: 'پنل مربی → «افزودن شاگرد»' }] },
    { title: '✏️ ویرایش', items: [
      { q: 'برنامه؟', a: 'پنل مربی → روی شاگرد → «ویرایش برنامه»' },
      { q: 'تغذیه؟', a: 'پنل مربی → روی شاگرد → «ویرایش تغذیه»' }
    ]}
  ]},
  admin: { icon: '👑', title: 'راهنمای مدیر', sections: [
    { title: '👥 کاربران', items: [{ q: 'ساخت؟', a: 'پنل مدیر → تب «کاربران»' }] },
    { title: '⏳ تأیید مربی', items: [{ q: 'چطور؟', a: 'پنل مدیر → تب «مربیان» → ✅' }] }
  ]}
};

window.openHelpDrawer = function() {
  var drawer = document.getElementById('helpDrawer');
  var backdrop = document.getElementById('helpBackdrop');
  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'helpBackdrop'; backdrop.className = 'backdrop';
    backdrop.onclick = function() { closeDrawerById('helpDrawer'); };
    document.body.appendChild(backdrop);

    drawer = document.createElement('div');
    drawer.id = 'helpDrawer'; drawer.className = 'drawer right';
    drawer.innerHTML = '<div class="drawer-header"><h2>📚 راهنما</h2><button class="close-btn" onclick="closeDrawer(\'helpDrawer\')">✕</button></div><div class="drawer-body" id="helpDrawerBody"></div>';
    document.body.appendChild(drawer);
  }
  var u = window.state.user;
  var role = u ? u.role : 'student';
  var content = HELP_CONTENT[role] || HELP_CONTENT.student;
  var el = document.getElementById('helpDrawerBody');
  var h = '<div style="text-align:center;padding:14px 0 18px"><div style="font-size:2.5rem;margin-bottom:6px">' + content.icon + '</div><div style="font-weight:900;font-size:1.05rem">' + content.title + '</div></div>';
  content.sections.forEach(function(sec, si) {
    h += '<div style="margin-bottom:14px"><div class="sh" style="cursor:pointer" onclick="toggleHelpSection(' + si + ')"><span>' + sec.title + '</span><span id="helpArrow_' + si + '" style="font-size:.9rem">▼</span></div>';
    h += '<div id="helpSec_' + si + '" style="display:none">';
    sec.items.forEach(function(it) {
      h += '<div style="background:var(--card2);border-radius:10px;margin-bottom:8px"><div style="padding:10px 12px;font-weight:800;font-size:.82rem;color:var(--bl);cursor:pointer" onclick="toggleHelpItem(this)">❓ ' + it.q + '</div><div style="display:none;padding:0 12px 12px;font-size:.78rem;color:var(--tx2);line-height:1.9">' + it.a + '</div></div>';
    });
    h += '</div></div>';
  });
  el.innerHTML = h;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
  setTimeout(function() { window.toggleHelpSection(0); }, 100);
};

window.toggleHelpSection = function(si) {
  var el = document.getElementById('helpSec_' + si);
  if (!el) return;
  var isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
};

window.toggleHelpItem = function(headerEl) {
  var body = headerEl.nextElementSibling;
  if (!body) return;
  body.style.display = body.style.display === 'none' ? 'block' : 'none';
};

/* ============================================================
   TOOLBAR BUTTONS
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
      b1.onclick = function() { window.openHelpDrawer(); };
      tb.appendChild(b1);
    }

    if (!document.getElementById('expToolbarBtn')) {
      var b2 = document.createElement('button');
      b2.id = 'expToolbarBtn';
      b2.className = 'btn';
      b2.innerHTML = '<span>📤</span> خروجی';
      b2.onclick = function() { window.openExportDrawer(); };
      tb.appendChild(b2);
    }
  } catch(e) { console.warn('[Extras] toolbar error:', e); }
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener('keydown', function(e) {
  var t = e.target.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  if (e.ctrlKey && e.key === 'h') { e.preventDefault(); window.openHelpDrawer(); }
  if (e.ctrlKey && e.key === 'e') { e.preventDefault(); window.openExportDrawer(); }
});

/* ============================================================
   BOOT
   ============================================================ */
function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else setTimeout(fn, 0);
}

ready(function() {
  console.log('✅ [Extras v1.7] Ready');

  setInterval(addToolbarButtons, 800);
  setTimeout(addToolbarButtons, 500);
  setTimeout(addToolbarButtons, 1500);

  var observer = new MutationObserver(addToolbarButtons);
  var watchTimer = setInterval(function() {
    var tb = document.getElementById('toolbar');
    if (tb && !tb.__observed) {
      tb.__observed = true;
      observer.observe(tb, { childList: true, subtree: false });
      clearInterval(watchTimer);
    }
  }, 500);
});

console.log('✨ [Extras v1.7] Loaded');
console.log('   Shortcuts: Ctrl+H (راهنما) · Ctrl+E (خروجی)');

})();
