/* ============================================================
   ProFit Extras v2.0 — Direct Access, No Compromises
   ============================================================ */
(function() {
'use strict';

/* ============================================================
   PART 1: INJECT CSS — override meal-item completely
   ============================================================ */
(function injectCSS() {
  var css = `
    /* Force hide utility */
    .hidden-force {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      opacity: 0 !important;
    }

    /* Complete override of meal-item: switch from grid to flex */
    .meal-item {
      display: flex !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 10px 6px !important;
      border-bottom: 1px solid var(--bd) !important;
      width: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }

    .meal-item .mi-emoji {
      flex: 0 0 22px !important;
      min-width: 22px !important;
      font-size: 1.05rem !important;
      text-align: center !important;
    }

    .meal-item .mi-name {
      flex: 1 1 60px !important;
      min-width: 40px !important;
      max-width: 130px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-weight: 700 !important;
      font-size: .76rem !important;
      line-height: 1.3 !important;
    }

    .meal-item .mi-qty-wrap {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 5px !important;
      align-items: center !important;
      flex: 0 0 155px !important;
      min-width: 155px !important;
      max-width: 155px !important;
    }

    .meal-item .mi-qty {
      flex: 0 0 55px !important;
      width: 55px !important;
      min-width: 55px !important;
      max-width: 55px !important;
      padding: 8px 4px !important;
      text-align: center !important;
      font-size: .78rem !important;
      font-weight: 700 !important;
      border-radius: 6px !important;
      border: 1px solid var(--bd) !important;
      background: var(--card) !important;
      color: var(--tx) !important;
      box-sizing: border-box !important;
    }

    .meal-item .mi-unit {
      flex: 1 1 auto !important;
      width: auto !important;
      min-width: 90px !important;
      max-width: 100% !important;
      padding: 8px 6px !important;
      font-size: .74rem !important;
      font-weight: 700 !important;
      border-radius: 6px !important;
      border: 1px solid var(--bd) !important;
      background: var(--card) !important;
      color: var(--tx) !important;
      box-sizing: border-box !important;
      direction: rtl !important;
      text-align: center !important;
      text-align-last: center !important;
    }

    .meal-item .mi-kcal {
      flex: 0 0 50px !important;
      width: 50px !important;
      min-width: 50px !important;
      text-align: center !important;
      font-size: .74rem !important;
      font-weight: 800 !important;
      color: var(--gr) !important;
      direction: ltr !important;
    }

    .meal-item .mi-del {
      flex: 0 0 24px !important;
      width: 24px !important;
      padding: 0 !important;
      background: none !important;
      border: none !important;
      color: var(--rd) !important;
      cursor: pointer !important;
      font-size: .95rem !important;
    }

    @media (max-width: 420px) {
      .meal-item { gap: 4px !important; padding: 10px 4px !important; }
      .meal-item .mi-emoji { flex-basis: 20px !important; min-width: 20px !important; }
      .meal-item .mi-name { font-size: .72rem !important; flex-basis: 50px !important; max-width: 90px !important; }
      .meal-item .mi-qty-wrap { flex-basis: 150px !important; min-width: 150px !important; max-width: 150px !important; gap: 4px !important; }
      .meal-item .mi-qty { flex-basis: 52px !important; width: 52px !important; min-width: 52px !important; }
      .meal-item .mi-unit { min-width: 90px !important; font-size: .7rem !important; padding: 8px 4px !important; }
      .meal-item .mi-kcal { flex-basis: 46px !important; width: 46px !important; font-size: .72rem !important; }
      .meal-item .mi-del { flex-basis: 20px !important; width: 20px !important; font-size: .85rem !important; }
    }
  `;
  var s = document.createElement('style');
  s.id = 'extras-css-v2';
  s.textContent = css;
  if (document.head) document.head.appendChild(s);
  else document.addEventListener('DOMContentLoaded', function() { document.head.appendChild(s); });
})();

/* ============================================================
   PART 2: FORCE-CLOSE DRAWERS (bulletproof)
   ============================================================ */
function forceCloseAllDrawers() {
  document.querySelectorAll('.drawer').forEach(function(el) {
    el.classList.remove('open');
    el.classList.add('hidden-force');
  });
  document.querySelectorAll('.backdrop').forEach(function(el) {
    el.classList.remove('open');
    el.classList.add('hidden-force');
  });
  setTimeout(function() {
    document.querySelectorAll('.drawer, .backdrop').forEach(function(el) {
      el.classList.remove('hidden-force');
    });
  }, 450);
}

window.openNutritionForStudent = async function(sid) {
  try {
    console.log('[Extras] openNutritionForStudent:', sid);

    // Close drawers FIRST (before async work)
    forceCloseAllDrawers();

    var d = await window.api('GET', '/api/users/' + sid + '/data');
    var nut = (d.nutrition && d.nutrition.profile)
      ? d.nutrition
      : { profile:{ gender:'male', age:30, weight:75, height:175, activity:1.55, goal:'maintain', bodyfat:20, formula:'mifflin' },
          targets:null, meals:{ breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] },
          supplements:[], suppGoalUsed:null };
    if (!nut.meals) nut.meals = { breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] };
    if (!nut.supplements) nut.supplements = [];

    window.state.nutrition = nut;
    window.state.nutritionOwnerId = (sid === window.state.user.id) ? null : sid;

    window.state.currentView = 'nutrition';
    window.state.nutritionTab = 'calc';
    window.renderView();
    window.toast('تغذیه بارگذاری شد ✓');
  } catch (e) {
    console.error('[Extras] openNutritionForStudent error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
};

/* ============================================================
   PART 3: MEAL SOLVER — Direct substitution (Cramer's rule)
   ============================================================ */
function solve3x3(A, b) {
  var a=A[0][0], b1=A[0][1], c=A[0][2];
  var d=A[1][0], e=A[1][1], f=A[1][2];
  var g=A[2][0], h=A[2][1], i=A[2][2];
  var det = a*(e*i-f*h) - b1*(d*i-f*g) + c*(d*h-e*g);
  if (Math.abs(det) < 1e-9) return null;
  var x1 = ((e*i-f*h)*b[0] + (c*h-b1*i)*b[1] + (b1*f-c*e)*b[2]) / det;
  var x2 = ((f*g-d*i)*b[0] + (a*i-c*g)*b[1] + (c*d-a*f)*b[2]) / det;
  var x3 = ((d*h-e*g)*b[0] + (b1*g-a*h)*b[1] + (a*e-b1*d)*b[2]) / det;
  return [x1, x2, x3];
}

function solveMeal(foodList, target) {
  var n = foodList.length;
  if (n === 0) return [];
  if (n === 1) {
    var f = foodList[0];
    var g = (target.cal * 100) / Math.max(1, f.cal || 1);
    return [Math.max(5, Math.min(500, Math.round(g)))];
  }
  var A = [[0,0,0],[0,0,0],[0,0,0]];
  for (var j = 0; j < Math.min(3, n); j++) {
    var f2 = foodList[j];
    A[0][j] = (f2.prot || 0) / 100;
    A[1][j] = (f2.carb || 0) / 100;
    A[2][j] = (f2.fat || 0) / 100;
  }
  var b = [target.prot, target.carb, target.fat];
  if (n >= 3) {
    var sol3 = solve3x3(A, b);
    if (sol3 && sol3.every(function(x) { return x > -5 && x < 800; })) {
      return sol3.map(function(x) { return Math.max(5, Math.min(500, Math.round(x))); });
    }
  }
  // Fallback: scale each to its primary macro
  return foodList.map(function(f) {
    var p = f.prot || 0, c = f.carb || 0, fa = f.fat || 0;
    if (p >= c && p >= fa && p > 0) return Math.max(20, Math.min(400, Math.round((target.prot * 100) / p)));
    if (c >= p && c >= fa && c > 0) return Math.max(20, Math.min(400, Math.round((target.carb * 100) / c)));
    if (fa > 0) return Math.max(5, Math.min(80, Math.round((target.fat * 100) / fa)));
    return 100;
  });
}

window.generateSampleMeals = function() {
  var t = window.state.nutrition.targets;
  if (!t) { window.toast('ابتدا کالری را محاسبه کن', 'warn'); return; }
  var NUT = window.NUT || {};
  var foods = NUT.foods || [];
  if (!foods.length) { window.toast('غذاها لود نشدن', 'error'); return; }

  var templates = {
    breakfast: { p: 'egg_whole', c: 'oat', f: 'almond', fr: 'banana' },
    snack1:    { f: 'almond', fr: 'apple' },
    lunch:     { p: 'chicken_breast', c: 'rice_white', f: 'olive_oil', v: 'broccoli' },
    snack2:    { p: 'yogurt_low', f: 'walnut' },
    dinner:    { p: 'salmon', c: 'sweet_potato', f: 'olive_oil', v: 'spinach' }
  };
  function getFood(id) { return foods.find(function(f) { return f.id === id; }); }
  var log = [];

  NUT.meals.forEach(function(meal) {
    var tp = templates[meal.key];
    if (!tp) return;
    var mT = { cal: t.calories * meal.pct, prot: t.protein * meal.pct, carb: t.carbs * meal.pct, fat: t.fat * meal.pct };

    // Fixed items
    var fixed = [];
    if (tp.v) { var fv = getFood(tp.v); if (fv) fixed.push({ id: tp.v, food: fv, qty: 150 }); }
    if (tp.fr) { var fr = getFood(tp.fr); if (fr) fixed.push({ id: tp.fr, food: fr, qty: 100 }); }

    var fixedTot = { cal:0, prot:0, carb:0, fat:0 };
    fixed.forEach(function(x) {
      var k = x.qty / 100;
      fixedTot.cal += (x.food.cal||0) * k;
      fixedTot.prot += (x.food.prot||0) * k;
      fixedTot.carb += (x.food.carb||0) * k;
      fixedTot.fat += (x.food.fat||0) * k;
    });

    var adjT = {
      cal: Math.max(0, mT.cal - fixedTot.cal),
      prot: Math.max(0, mT.prot - fixedTot.prot),
      carb: Math.max(0, mT.carb - fixedTot.carb),
      fat: Math.max(0, mT.fat - fixedTot.fat)
    };

    var adjFoods = [];
    if (tp.p) { var fp = getFood(tp.p); if (fp) adjFoods.push(fp); }
    if (tp.c) { var fc = getFood(tp.c); if (fc) adjFoods.push(fc); }
    if (tp.f) { var ff = getFood(tp.f); if (ff) adjFoods.push(ff); }

    var qs = solveMeal(adjFoods, adjT);

    var items = [];
    adjFoods.forEach(function(f, i) { items.push({ foodId: f.id, qty: qs[i], unitIdx: 0 }); });
    fixed.forEach(function(x) { items.push({ foodId: x.id, qty: x.qty, unitIdx: 0 }); });

    window.state.nutrition.meals[meal.key] = items;

    // Log totals
    var tot = { cal:0, prot:0, carb:0, fat:0 };
    items.forEach(function(it) {
      var f = getFood(it.foodId); if (!f) return;
      var k = it.qty / 100;
      tot.cal += (f.cal||0)*k; tot.prot += (f.prot||0)*k;
      tot.carb += (f.carb||0)*k; tot.fat += (f.fat||0)*k;
    });
    log.push(meal.name + ': ' + Math.round(tot.cal) + '/' + Math.round(mT.cal) + ' kcal');
  });

  var targetId = window.state.nutritionOwnerId || window.state.user.id;
  window.api('POST', '/api/users/' + targetId + '/data/nutrition', { value: window.state.nutrition }).catch(function(){});

  window.renderView();
  console.log('════════ Meal Gen ════════');
  log.forEach(function(l) { console.log('  ' + l); });
  console.log('══════════════════════════');
  window.toast('✓ نمونه ساخته شد');
};

/* ============================================================
   PART 4: PRINT REPORT — Direct, no conditional meal logic
   ============================================================ */
function fN(n) {
  if (n == null || isNaN(n)) return '—';
  try { return Number(n).toLocaleString('fa-IR'); } catch(e) { return String(n); }
}
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function barChart(data, labels, opts) {
  opts = opts || {};
  var W = 480, H = 180;
  var pad = { t: 20, r: 15, b: 40, l: 50 };
  var cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  var c1 = opts.color || '#3b82f6', c2 = opts.color2 || '#a855f7';
  if (!data || !data.length) return '<div style="text-align:center;color:#94a3b8;padding:20px">داده‌ای نیست</div>';
  var mx = Math.max.apply(null, data.concat([1])) * 1.15;
  var gw = cw / data.length, bw = gw * 0.6;
  var gid = 'g' + Math.random().toString(36).slice(2, 8);
  var out = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;background:#fafbfc;border-radius:6px;border:1px solid #e2e8f0">';
  out += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient></defs>';
  for (var i = 0; i <= 4; i++) {
    var y = pad.t + (i / 4) * ch;
    out += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1"/>';
    out += '<text x="' + (pad.l - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + fN(Math.round(mx - (i / 4) * mx)) + '</text>';
  }
  data.forEach(function(v, i) {
    var gx = pad.l + i * gw;
    var h = (v / mx) * ch;
    var x = gx + (gw - bw) / 2, y = pad.t + ch - h;
    out += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="4" fill="url(#' + gid + ')" opacity="0.9"/>';
    if (v > 0) out += '<text x="' + (x + bw/2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="9" fill="#475569" font-weight="800">' + fN(Math.round(v)) + '</text>';
  });
  labels.forEach(function(l, i) {
    var x = pad.l + i * gw + gw / 2;
    out += '<text x="' + x + '" y="' + (H - 12) + '" text-anchor="middle" font-size="8" fill="#64748b">' + l + '</text>';
  });
  return out + '</svg>';
}

window.printReport = async function(targetUserId) {
  try {
    var u = window.state.user;
    if (!u) { window.toast('لطفاً وارد شوید', 'warn'); return; }
    var tid = targetUserId || u.id;
    var isSelf = (tid === u.id);

    // ===== Fetch from API =====
    var apiData = {};
    try { apiData = await window.api('GET', '/api/users/' + tid + '/data'); } catch(e) { console.warn(e); }

    // ===== Merge data (prefer non-empty) =====
    var stateData = isSelf ? window.state : {};

    function pick(apiVal, stateVal, def) {
      if (apiVal && (Array.isArray(apiVal) ? apiVal.length : Object.keys(apiVal).length)) return apiVal;
      if (stateVal && (Array.isArray(stateVal) ? stateVal.length : Object.keys(stateVal).length)) return stateVal;
      return apiVal || stateVal || def;
    }

    var program = pick(apiData.program, stateData.program, { days: [] });
    var history = pick(apiData.history, stateData.history, {});
    var body    = pick(apiData.body, stateData.body, []);
    var nutrition = pick(apiData.nutrition, stateData.nutrition, {});

    console.log('[Report] isSelf:', isSelf);
    console.log('[Report] nutrition keys:', Object.keys(nutrition).join(','));
    console.log('[Report] meals keys:', nutrition.meals ? Object.keys(nutrition.meals).join(',') : 'NONE');

    // ===== DIRECT MEALS — hardcoded list, no dependency =====
    var MEAL_LIST = [
      { key: 'breakfast', name: 'صبحانه', emoji: '🌅' },
      { key: 'snack1', name: 'میان‌وعده صبح', emoji: '🍎' },
      { key: 'lunch', name: 'ناهار', emoji: '🍽️' },
      { key: 'snack2', name: 'میان‌وعده عصر', emoji: '🥤' },
      { key: 'dinner', name: 'شام', emoji: '🌙' }
    ];

    var allMeals = nutrition.meals || {};
    var foodsArr = (window.NUT && window.NUT.foods) || [];

    // Build meal rows directly
    var mealBlocks = '';
    var grandTotal = { cal: 0, prot: 0, carb: 0, fat: 0 };
    var mealCount = 0;

    MEAL_LIST.forEach(function(meal) {
      var items = allMeals[meal.key];
      if (!Array.isArray(items) || items.length === 0) return;
      mealCount++;

      var mTot = { cal: 0, prot: 0, carb: 0, fat: 0 };
      var rowsHtml = '';

      items.forEach(function(it) {
        var food = foodsArr.find(function(f) { return f.id === it.foodId; });
        if (!food) {
          rowsHtml += '<tr><td colspan="6" style="text-align:center;color:#f43f5e;padding:6px;font-size:10px">⚠️ غذای ناشناخته: ' + escHtml(it.foodId) + '</td></tr>';
          return;
        }
        var unit = (food.units && food.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        var grams = (it.qty || 0) * unit.g;
        var k = grams / 100;
        var cal = Math.round((food.cal || 0) * k);
        var prot = Math.round((food.prot || 0) * k * 10) / 10;
        var carb = Math.round((food.carb || 0) * k * 10) / 10;
        var fat = Math.round((food.fat || 0) * k * 10) / 10;
        mTot.cal += cal; mTot.prot += prot; mTot.carb += carb; mTot.fat += fat;

        rowsHtml += '<tr>' +
          '<td>' + (food.emoji || '') + ' ' + escHtml(food.name) + '</td>' +
          '<td style="text-align:center">' + it.qty + ' ' + escHtml(unit.n) + '</td>' +
          '<td style="text-align:center;color:#3b82f6;font-weight:700">' + cal + '</td>' +
          '<td style="text-align:center">' + prot + '</td>' +
          '<td style="text-align:center">' + carb + '</td>' +
          '<td style="text-align:center">' + fat + '</td>' +
        '</tr>';
      });

      grandTotal.cal += mTot.cal;
      grandTotal.prot += mTot.prot;
      grandTotal.carb += mTot.carb;
      grandTotal.fat += mTot.fat;

      mealBlocks += '<div style="margin-bottom:12px;padding:10px;background:#fafbfc;border-radius:6px;border:1px solid #e2e8f0">' +
        '<h3 style="font-size:12px;color:#1e293b;margin-bottom:8px;padding-right:10px;border-right:3px solid #3b82f6;font-weight:800">' +
          (meal.emoji) + ' ' + meal.name + ' — ' + fN(Math.round(mTot.cal)) + ' kcal' +
        '</h3>' +
        '<table style="width:100%;border-collapse:collapse;font-size:10px">' +
          '<thead><tr style="background:#f1f5f9">' +
            '<th style="padding:5px 4px;text-align:right;font-weight:800;color:#475569;font-size:9px">غذا</th>' +
            '<th style="padding:5px 4px;text-align:center;font-weight:800;color:#475569;font-size:9px;width:80px">مقدار</th>' +
            '<th style="padding:5px 4px;text-align:center;font-weight:800;color:#475569;font-size:9px;width:55px">کالری</th>' +
            '<th style="padding:5px 4px;text-align:center;font-weight:800;color:#475569;font-size:9px;width:55px">پروتئین</th>' +
            '<th style="padding:5px 4px;text-align:center;font-weight:800;color:#475569;font-size:9px;width:50px">کرب</th>' +
            '<th style="padding:5px 4px;text-align:center;font-weight:800;color:#475569;font-size:9px;width:50px">چربی</th>' +
          '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
    });

    console.log('[Report] Meal count rendered:', mealCount);

    // ===== Weekly stats =====
    var now = Date.now(), s7 = 0, v7 = 0;
    Object.keys(history).forEach(function(k) {
      var t = new Date(k).getTime();
      if (now - t < 7 * 86400000) {
        if ((history[k].completed || 0) > 0) s7++;
        v7 += history[k].volume || 0;
      }
    });

    // ===== Weekly chart =====
    var wLabels = [], wVols = [];
    for (var w = 11; w >= 0; w--) {
      var ws = new Date();
      ws.setDate(ws.getDate() - (ws.getDay() + 1) % 7);
      ws.setHours(0,0,0,0);
      ws.setDate(ws.getDate() - w * 7);
      var vv = 0;
      for (var dO = 0; dO < 7; dO++) {
        var dd = new Date(ws); dd.setDate(dd.getDate() + dO);
        var kk = dd.getFullYear() + '-' + String(dd.getMonth()+1).padStart(2,'0') + '-' + String(dd.getDate()).padStart(2,'0');
        if (history[kk]) vv += history[kk].volume || 0;
      }
      wLabels.push(ws.getDate() + '/' + (ws.getMonth() + 1));
      wVols.push(Math.round(vv));
    }
    var total12w = wVols.reduce(function(a,b) { return a + b; }, 0);

    // ===== Supplements =====
    var supps = nutrition.supplements || [];
    var suppHtml = '';
    if (supps.length) {
      suppHtml = '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#f1f5f9">' +
        '<th style="padding:5px;text-align:right;font-weight:800;color:#475569;font-size:9px">مکمل</th>' +
        '<th style="padding:5px;text-align:center;font-weight:800;color:#475569;font-size:9px">دوز</th>' +
        '<th style="padding:5px;text-align:center;font-weight:800;color:#475569;font-size:9px">زمان</th>' +
        '<th style="padding:5px;text-align:center;font-weight:800;color:#475569;font-size:9px">وضعیت</th>' +
        '</tr></thead><tbody>';
      supps.forEach(function(s) {
        suppHtml += '<tr><td style="padding:4px;border-bottom:1px solid #f1f5f9;font-weight:700">' + escHtml(s.name) + '</td>' +
          '<td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center;color:#f59e0b;font-weight:700">' + escHtml(s.dose || '—') + '</td>' +
          '<td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center">' + escHtml(s.timing || '—') + '</td>' +
          '<td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center;color:' + (s.enabled ? '#10b981' : '#94a3b8') + ';font-weight:700">' + (s.enabled ? '✓' : 'خیر') + '</td></tr>';
      });
      suppHtml += '</tbody></table>';
    }

    // ===== Body =====
    var bSorted = body.slice().sort(function(a,b) { return a.date.localeCompare(b.date); });
    var bodyHtml = '';
    if (bSorted.length) {
      var mets = ['weight','bodyfat','neck','chest','waist','hip','arm','forearm','thigh','calf'];
      var mNames = { weight:'وزن', bodyfat:'چربی', neck:'گردن', chest:'سینه', waist:'کمر', hip:'باسن', arm:'بازو', forearm:'ساعد', thigh:'ران', calf:'ساق' };
      bodyHtml = '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#f1f5f9">' +
        '<th style="padding:5px;text-align:right;font-weight:800;color:#475569;font-size:9px">تاریخ</th>' +
        mets.map(function(k) { return '<th style="padding:5px;text-align:center;font-weight:800;color:#475569;font-size:9px">' + mNames[k] + '</th>'; }).join('') +
        '</tr></thead><tbody>';
      bSorted.slice(-15).reverse().forEach(function(e) {
        bodyHtml += '<tr><td style="padding:4px;border-bottom:1px solid #f1f5f9;font-weight:700">' + e.date + '</td>';
        mets.forEach(function(k) { bodyHtml += '<td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center">' + (e[k] != null ? e[k] : '—') + '</td>'; });
        bodyHtml += '</tr>';
      });
      bodyHtml += '</tbody></table>';
    }

    // ===== Target user info =====
    var tUser = u;
    if (!isSelf) {
      try {
        var all = await window.api('GET', '/api/users');
        var fo = all.find(function(x) { return x.id === tid; });
        if (fo) tUser = fo;
      } catch(e) {}
    }

    var roles = { admin:'مدیر', coach:'مربی', student:'شاگرد' };

    // ===== Build final HTML =====
    var H = '';
    H += '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>گزارش ProFit</title>';
    H += '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&display=swap" rel="stylesheet">';
    H += '<style>@page{size:A4 portrait;margin:12mm 10mm}';
    H += '*{margin:0;padding:0;box-sizing:border-box;font-family:Vazirmatn,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}';
    H += 'body{background:#fff;color:#0f172a;line-height:1.6;font-size:11px}';
    H += '.hdr{text-align:center;padding-bottom:12px;margin-bottom:16px;border-bottom:3px solid #3b82f6}';
    H += '.hdr h1{font-size:20px;color:#3b82f6;margin-bottom:5px}';
    H += '.hdr .sub{font-size:10px;color:#64748b}';
    H += '.sec{margin-bottom:18px}.sec h2{font-size:13px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;color:#1e293b}';
    H += '.np{page-break-before:always;break-before:page}';
    H += '.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}';
    H += '.stat{padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0}';
    H += '.stat .l{font-size:9px;color:#64748b;font-weight:700}.stat .v{font-size:16px;font-weight:900;color:#3b82f6;margin-top:3px}';
    H += '.green .v{color:#10b981}.purple .v{color:#a855f7}.orange .v{color:#f59e0b}';
    H += '.mac{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:10px 0}';
    H += '.mb{text-align:center;padding:8px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0}';
    H += '.mb .ml{font-size:8px;color:#64748b;font-weight:700}.mb .mv{font-size:13px;font-weight:900;margin-top:2px}';
    H += '.c1{color:#10b981}.c2{color:#f43f5e}.c3{color:#3b82f6}.c4{color:#f59e0b}';
    H += '.empty{padding:20px;text-align:center;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:12px}';
    H += '.ft{text-align:center;padding-top:14px;margin-top:20px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8}';
    H += '.np-btn{position:fixed;bottom:20px;left:20px;display:flex;gap:8px;z-index:1000}';
    H += '.np-btn button{padding:10px 20px;border-radius:10px;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}';
    H += '@media print{.np-btn{display:none!important}}';
    H += '</style></head><body>';

    // Header
    H += '<div class="hdr"><h1>🏋️ گزارش کامل ProFit</h1>';
    H += '<div class="sub"><b>' + escHtml(tUser.displayName) + '</b> — @' + escHtml(tUser.username) + ' — ' + (roles[tUser.role] || tUser.role) + '</div>';
    H += '<div class="sub" style="margin-top:4px">' + new Date().toLocaleDateString('fa-IR') + '</div>';
    if (!isSelf) H += '<div class="sub" style="margin-top:4px;color:#f59e0b;font-weight:700">تولید توسط: ' + escHtml(u.displayName) + '</div>';
    H += '</div>';

    // Weekly
    H += '<div class="sec"><h2>📊 خلاصه هفتگی</h2><div class="grid">';
    H += '<div class="stat green"><div class="l">جلسات</div><div class="v">' + fN(s7) + '</div></div>';
    H += '<div class="stat"><div class="l">حجم (kg)</div><div class="v">' + fN(Math.round(v7)) + '</div></div>';
    H += '<div class="stat purple"><div class="l">روزهای برنامه</div><div class="v">' + fN((program.days || []).length) + '</div></div>';
    H += '</div></div>';

    // Volume chart
    H += '<div class="sec"><h2>💪 حجم تمرین (۱۲ هفته)</h2>';
    if (total12w > 0) H += barChart(wVols, wLabels, { color: '#3b82f6', color2: '#a855f7' });
    else H += '<div class="empty">📭 هنوز داده‌ای نیست</div>';
    H += '</div>';

    // Program
    H += '<div class="sec np"><h2>🗓️ برنامه تمرینی</h2>';
    if (program.days && program.days.length) {
      program.days.forEach(function(day) {
        H += '<div style="margin-bottom:12px;padding:10px;background:#fafbfc;border-radius:6px;border:1px solid #e2e8f0">';
        H += '<h3 style="font-size:12px;color:#1e293b;margin-bottom:8px;padding-right:10px;border-right:3px solid #3b82f6;font-weight:800">' + (day.icon || '💪') + ' ' + escHtml(day.name) + '</h3>';
        H += '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#f1f5f9"><th style="padding:5px;text-align:center;width:25px;font-size:9px;color:#475569">#</th><th style="padding:5px;text-align:right;font-size:9px;color:#475569">حرکت</th><th style="padding:5px;text-align:center;width:45px;font-size:9px;color:#475569">ست</th><th style="padding:5px;text-align:center;width:65px;font-size:9px;color:#475569">تکرار</th><th style="padding:5px;text-align:center;width:45px;font-size:9px;color:#475569">RPE</th></tr></thead><tbody>';
        (day.exercises || []).forEach(function(ex, i) {
          var DB = window.DB || {};
          var def = (DB.exercises || []).find(function(e) { return e.id === ex.exId; }) || {};
          H += '<tr><td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8;font-weight:700">' + (i+1) + '</td><td style="padding:4px;border-bottom:1px solid #f1f5f9;font-weight:700">' + escHtml(def.name || ex.exId) + '</td><td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center;color:#3b82f6;font-weight:700">' + (ex.sets || 3) + '</td><td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center">' + escHtml(ex.reps || '—') + '</td><td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center;color:#f59e0b;font-weight:700">' + escHtml(ex.rpe || '—') + '</td></tr>';
        });
        H += '</tbody></table></div>';
      });
    } else H += '<div class="empty">📭 برنامه‌ای نیست</div>';
    H += '</div>';

    // Nutrition targets
    H += '<div class="sec np"><h2>🎯 اهداف تغذیه</h2>';
    var tg = nutrition.targets;
    if (tg) {
      H += '<div class="grid"><div class="stat"><div class="l">BMR</div><div class="v">' + fN(tg.bmr) + '</div></div><div class="stat"><div class="l">TDEE</div><div class="v">' + fN(tg.tdee) + '</div></div><div class="stat green"><div class="l">کالری هدف</div><div class="v">' + fN(tg.calories) + '</div></div></div>';
      H += '<div class="mac"><div class="mb"><div class="ml">پروتئین</div><div class="mv c2">' + (tg.protein||0) + 'g</div></div><div class="mb"><div class="ml">کربوهیدرات</div><div class="mv c3">' + (tg.carbs||0) + 'g</div></div><div class="mb"><div class="ml">چربی</div><div class="mv c4">' + (tg.fat||0) + 'g</div></div><div class="mb"><div class="ml">جمع</div><div class="mv c1">' + fN((tg.protein||0)*4+(tg.carbs||0)*4+(tg.fat||0)*9) + '</div></div></div>';
    } else H += '<div class="empty">🧮 کالری محاسبه نشده</div>';
    H += '</div>';

    // ==== MEALS — ALWAYS SHOW ====
    H += '<div class="sec"><h2>🍽️ برنامه غذایی روزانه</h2>';
    if (mealCount > 0) {
      H += mealBlocks;
      H += '<div class="mac" style="background:#f0fdf4;padding:10px;border-radius:8px;border:1px solid #bbf7d0">';
      H += '<div class="mb"><div class="ml">کالری</div><div class="mv c1">' + fN(Math.round(grandTotal.cal)) + '</div></div>';
      H += '<div class="mb"><div class="ml">پروتئین</div><div class="mv c2">' + grandTotal.prot.toFixed(1) + 'g</div></div>';
      H += '<div class="mb"><div class="ml">کربوهیدرات</div><div class="mv c3">' + grandTotal.carb.toFixed(1) + 'g</div></div>';
      H += '<div class="mb"><div class="ml">چربی</div><div class="mv c4">' + grandTotal.fat.toFixed(1) + 'g</div></div>';
      H += '</div>';
    } else {
      H += '<div class="empty">🍽️ هنوز غذایی اضافه نشده</div>';
    }
    H += '</div>';

    // Supplements
    H += '<div class="sec np"><h2>💊 مکمل‌ها</h2>';
    if (supps.length) H += suppHtml;
    else H += '<div class="empty">💊 مکملی تنظیم نشده</div>';
    H += '</div>';

    // Body
    H += '<div class="sec np"><h2>📏 اندازه‌های بدن</h2>';
    if (bodyHtml) H += bodyHtml;
    else H += '<div class="empty">📏 اندازه‌ای ثبت نشده</div>';
    H += '</div>';

    H += '<div class="ft">گزارش ProFit — ' + new Date().toLocaleString('fa-IR') + '</div>';
    H += '<div class="np-btn"><button onclick="window.print()" style="border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff">🖨️ چاپ / PDF</button><button onclick="window.close()" style="border:1px solid #cbd5e1;background:#fff;color:#334155">بستن</button></div>';
    H += '</body></html>';

    var blob = new Blob([H], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var win = window.open(url, '_blank');
    if (!win) { URL.revokeObjectURL(url); window.toast('پاپ‌آپ بلاک شده', 'warn'); return; }
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  } catch(e) {
    console.error('[Report] FATAL:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
};

/* ============================================================
   PART 5: EXPORT DRAWER
   ============================================================ */
function closeDrawerById(id) {
  var d = document.getElementById(id);
  if (d) { d.classList.remove('open'); d.classList.add('hidden-force'); setTimeout(function() { d.classList.remove('hidden-force'); }, 400); }
  var b = document.getElementById(id.replace('Drawer', 'Backdrop'));
  if (b) { b.classList.remove('open'); b.classList.add('hidden-force'); setTimeout(function() { b.classList.remove('hidden-force'); }, 400); }
}

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
    drawer.innerHTML = '<div class="drawer-header"><h2>📤 خروجی</h2><button class="close-btn" onclick="closeDrawer(\'exportDrawer\')">✕</button></div><div class="drawer-body" id="exportDrawerBody"></div>';
    document.body.appendChild(drawer);
  }
  var u = window.state.user;
  var h = '<div class="sh">📦 بکاپ</div>';
  h += '<button class="btn primary full" style="margin-bottom:10px;justify-content:flex-start;padding:14px" onclick="exportUserData(\'' + u.id + '\',\'' + u.username + '\')"><span style="font-size:1.2rem">💾</span><div style="flex:1;text-align:right"><div style="font-weight:800">دانلود بکاپ JSON</div></div></button>';
  h += '<div class="sh">📊 CSV</div>';
  h += '<button class="btn full" style="margin-bottom:8px;justify-content:flex-start;padding:12px" onclick="exportWorkoutCSV()"><span>🏋️</span><span style="flex:1;text-align:right">تمرینات</span></button>';
  h += '<button class="btn full" style="margin-bottom:8px;justify-content:flex-start;padding:12px" onclick="exportNutritionCSV()"><span>🥗</span><span style="flex:1;text-align:right">تغذیه</span></button>';
  h += '<div class="sh">🖨️ گزارش PDF</div>';
  h += '<button class="btn success full" style="justify-content:flex-start;padding:14px" onclick="printReport(\'' + u.id + '\')"><span style="font-size:1.2rem">📄</span><div style="flex:1;text-align:right"><div style="font-weight:800">گزارش کامل</div></div></button>';
  document.getElementById('exportDrawerBody').innerHTML = h;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
};

function downloadCSV(filename, rows) {
  var csv = rows.map(function(r) {
    return r.map(function(c) {
      var s = String(c == null ? '' : c);
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

window.exportUserData = async function(uid, uname) {
  try {
    var d = await window.api('GET', '/api/users/' + uid + '/data');
    var backup = { _meta: { type: 'profit-user-backup', version: '1.0', exportedAt: new Date().toISOString() }, data: d };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'backup-' + uname + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportWorkoutCSV = async function() {
  try {
    var d = await window.api('GET', '/api/users/' + window.state.user.id + '/data');
    var rows = [['تاریخ', 'شماره', 'ست', 'وزنه', 'تکرار']];
    var logs = (d.workout || {}).logs || {};
    Object.keys(logs).sort().forEach(function(key) {
      var p = key.split(':');
      Object.keys(logs[key] || {}).forEach(function(si) {
        var l = logs[key][si] || {};
        rows.push([p[0], parseInt(p[1])+1, parseInt(si)+1, l.weight || '', l.reps || '']);
      });
    });
    downloadCSV('workout.csv', rows);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportNutritionCSV = async function() {
  try {
    var d = await window.api('GET', '/api/users/' + window.state.user.id + '/data');
    var nut = d.nutrition || {};
    var foods = (window.NUT || {}).foods || [];
    var rows = [['وعده', 'غذا', 'مقدار', 'واحد', 'کالری', 'پروتئین', 'کرب', 'چربی']];
    var MEAL_LIST = [
      { key: 'breakfast', name: 'صبحانه' }, { key: 'snack1', name: 'میان‌وعده صبح' },
      { key: 'lunch', name: 'ناهار' }, { key: 'snack2', name: 'میان‌وعده عصر' },
      { key: 'dinner', name: 'شام' }
    ];
    MEAL_LIST.forEach(function(m) {
      var items = (nut.meals && nut.meals[m.key]) || [];
      items.forEach(function(it) {
        var f = foods.find(function(x) { return x.id === it.foodId; });
        if (!f) return;
        var unit = (f.units && f.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        var k = ((it.qty || 0) * unit.g) / 100;
        rows.push([m.name, f.name, it.qty, unit.n, Math.round((f.cal||0)*k), Math.round((f.prot||0)*k*10)/10, Math.round((f.carb||0)*k*10)/10, Math.round((f.fat||0)*k*10)/10]);
      });
    });
    downloadCSV('nutrition.csv', rows);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

/* ============================================================
   PART 6: TOOLBAR BUTTONS
   ============================================================ */
function addToolbarButtons() {
  try {
    var tb = document.getElementById('toolbar');
    if (!tb) return;
    if (!document.getElementById('expToolbarBtn')) {
      var b = document.createElement('button');
      b.id = 'expToolbarBtn';
      b.className = 'btn';
      b.innerHTML = '<span>📤</span> خروجی';
      b.onclick = function() { window.openExportDrawer(); };
      tb.appendChild(b);
    }
  } catch(e) {}
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else setTimeout(fn, 0);
}

ready(function() {
  console.log('✅ [Extras v2.0] Ready');
  setInterval(addToolbarButtons, 800);
  setTimeout(addToolbarButtons, 500);
  setTimeout(addToolbarButtons, 1500);
});

console.log('✨ [Extras v2.0] Loaded — Ctrl+E for export');

})();
