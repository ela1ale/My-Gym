/* ============================================================
   ProFit Extras v1.9 — Definitive fix
   ============================================================ */
(function() {
'use strict';

/* ============================================================
   PART 1: FORCE UNIT STYLES VIA INLINE (guaranteed)
   ============================================================ */
function applyUnitStyles() {
  document.querySelectorAll('select.mi-unit').forEach(function(el) {
    if (el.dataset.styledV19) return;
    el.dataset.styledV19 = '1';
    el.style.setProperty('min-width', '95px', 'important');
    el.style.setProperty('width', '95px', 'important');
    el.style.setProperty('padding', '8px 6px', 'important');
    el.style.setProperty('font-size', '0.78rem', 'important');
    el.style.setProperty('font-weight', '700', 'important');
    el.style.setProperty('text-align', 'center', 'important');
    el.style.setProperty('text-align-last', 'center', 'important');
    el.style.setProperty('direction', 'rtl', 'important');
    el.style.setProperty('border', '1px solid var(--bd)', 'important');
    el.style.setProperty('border-radius', '6px', 'important');
    el.style.setProperty('background', 'var(--card)', 'important');
    el.style.setProperty('color', 'var(--tx)', 'important');
    el.style.setProperty('box-sizing', 'border-box', 'important');
  });
  document.querySelectorAll('input.mi-qty').forEach(function(el) {
    if (el.dataset.styledV19) return;
    el.dataset.styledV19 = '1';
    el.style.setProperty('width', '55px', 'important');
    el.style.setProperty('min-width', '55px', 'important');
    el.style.setProperty('padding', '8px 4px', 'important');
    el.style.setProperty('font-size', '0.78rem', 'important');
    el.style.setProperty('text-align', 'center', 'important');
  });
  // Wider container
  document.querySelectorAll('.mi-qty-wrap').forEach(function(el) {
    if (el.dataset.styledV19) return;
    el.dataset.styledV19 = '1';
    el.style.setProperty('width', '155px', 'important');
    el.style.setProperty('min-width', '155px', 'important');
    el.style.setProperty('gap', '5px', 'important');
  });
}

// Run on every DOM change
var unitObserver = new MutationObserver(function() {
  applyUnitStyles();
});
if (document.body) {
  unitObserver.observe(document.body, { childList: true, subtree: true });
  applyUnitStyles();
} else {
  document.addEventListener('DOMContentLoaded', function() {
    unitObserver.observe(document.body, { childList: true, subtree: true });
    applyUnitStyles();
  });
}

/* ============================================================
   PART 2: FORCE-CLOSE drawer + show nutrition (z-index fix)
   ============================================================ */
window.openNutritionForStudent = async function(sid) {
  try {
    var d = await window.api('GET', '/api/users/' + sid + '/data');
    var nut = (d.nutrition && d.nutrition.profile) ? d.nutrition
      : { profile:{ gender:'male', age:30, weight:75, height:175, activity:1.55, goal:'maintain', bodyfat:20, formula:'mifflin' },
          targets:null, meals:{ breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] },
          supplements:[], suppGoalUsed:null };
    if (!nut.meals) nut.meals = { breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] };
    if (!nut.supplements) nut.supplements = [];

    window.state.nutrition = nut;
    window.state.nutritionOwnerId = (sid === window.state.user.id) ? null : sid;

    // === FORCE CLOSE all drawers & backdrops (no transition) ===
    document.querySelectorAll('.drawer').forEach(function(el) {
      el.classList.remove('open');
      el.style.transition = 'none';
      el.style.display = 'none';
      el.style.transform = 'translateX(110%)';
    });
    document.querySelectorAll('.backdrop').forEach(function(el) {
      el.classList.remove('open');
      el.style.transition = 'none';
      el.style.display = 'none';
      el.style.opacity = '0';
    });

    // Restore transitions after a moment
    setTimeout(function() {
      document.querySelectorAll('.drawer').forEach(function(el) {
        el.style.transition = '';
        el.style.display = '';
        el.style.transform = '';
      });
      document.querySelectorAll('.backdrop').forEach(function(el) {
        el.style.transition = '';
        el.style.display = '';
        el.style.opacity = '';
      });
    }, 100);

    // Switch view immediately
    window.state.currentView = 'nutrition';
    window.state.nutritionTab = 'calc';
    window.renderView();
    window.toast('تغذیه بارگذاری شد ✓');
  } catch (e) {
    window.toast('خطا: ' + e.message, 'error');
  }
};

/* ============================================================
   PART 3: EXACT MATH MEAL SOLVER (Cramer's rule)
   ============================================================ */
function solve3x3(A, b) {
  var a=A[0][0], b1=A[0][1], c=A[0][2];
  var d=A[1][0], e=A[1][1], f=A[1][2];
  var g=A[2][0], h=A[2][1], i=A[2][2];
  var det = a*(e*i-f*h) - b1*(d*i-f*g) + c*(d*h-e*g);
  if (Math.abs(det) < 1e-9) return null;
  var x1 = ( (e*i-f*h)*b[0] + (c*h-b1*i)*b[1] + (b1*f-c*e)*b[2] ) / det;
  var x2 = ( (f*g-d*i)*b[0] + (a*i-c*g)*b[1] + (c*d-a*f)*b[2] ) / det;
  var x3 = ( (d*h-e*g)*b[0] + (b1*g-a*h)*b[1] + (a*e-b1*d)*b[2] ) / det;
  return [x1, x2, x3];
}

function solve2x2(A, b) {
  var det = A[0][0]*A[1][1] - A[0][1]*A[1][0];
  if (Math.abs(det) < 1e-9) return null;
  var x1 = (b[0]*A[1][1] - A[0][1]*b[1]) / det;
  var x2 = (A[0][0]*b[1] - b[0]*A[1][0]) / det;
  return [x1, x2];
}

function solveMealQuantities(foodList, target) {
  var n = foodList.length;
  if (n === 0) return [];
  if (n === 1) {
    // Single food: scale to hit calories
    var f = foodList[0];
    var calPer100 = f.cal || 1;
    var g = (target.cal * 100) / calPer100;
    return [Math.max(5, Math.min(500, Math.round(g)))];
  }

  // Build matrix A: column j = [prot, carb, fat] per gram of food j
  var A = [[0,0,0],[0,0,0],[0,0,0]];
  for (var j = 0; j < Math.min(3, n); j++) {
    var f = foodList[j];
    A[0][j] = (f.prot || 0) / 100;
    A[1][j] = (f.carb || 0) / 100;
    A[2][j] = (f.fat || 0) / 100;
  }

  var b = [target.prot, target.carb, target.fat];

  if (n >= 3) {
    var sol3 = solve3x3(A, b);
    if (sol3 && sol3.every(function(x) { return x > -5 && x < 800; })) {
      return sol3.map(function(x) { return Math.max(5, Math.min(500, Math.round(x))); });
    }
  }

  if (n === 2) {
    // Try solving for protein+carbs
    var A2 = [[A[0][0], A[0][1]], [A[1][0], A[1][1]]];
    var b2 = [b[0], b[1]];
    var sol2 = solve2x2(A2, b2);
    if (sol2 && sol2.every(function(x) { return x > -5 && x < 800; })) {
      return sol2.map(function(x) { return Math.max(5, Math.min(500, Math.round(x))); });
    }
    // Try protein+fat
    var A2b = [[A[0][0], A[0][1]], [A[2][0], A[2][1]]];
    var b2b = [b[0], b[2]];
    var sol2b = solve2x2(A2b, b2b);
    if (sol2b && sol2b.every(function(x) { return x > -5 && x < 800; })) {
      return sol2b.map(function(x) { return Math.max(5, Math.min(500, Math.round(x))); });
    }
  }

  // Fallback: scale each food to hit its primary macro
  return foodList.map(function(f) {
    var p = f.prot || 0, c = f.carb || 0, fa = f.fat || 0;
    if (p > c && p > fa) return Math.max(20, Math.min(400, Math.round((target.prot * 100) / p)));
    if (c > p && c > fa) return Math.max(20, Math.min(400, Math.round((target.carb * 100) / c)));
    if (fa > p && fa > c) return Math.max(5, Math.min(80, Math.round((target.fat * 100) / fa)));
    return 100;
  });
}

/* ============================================================
   PART 4: OVERRIDE generateSampleMeals
   ============================================================ */
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

    var mTarget = {
      cal: t.calories * meal.pct,
      prot: t.protein * meal.pct,
      carb: t.carbs * meal.pct,
      fat: t.fat * meal.pct
    };

    // Fixed items (fruit, veg) first
    var items = [];
    var fixedContrib = { cal: 0, prot: 0, carb: 0, fat: 0 };
    var fixedItems = [];
    if (tp.v) { var fv = getFood(tp.v); if (fv) fixedItems.push({ food: fv, id: tp.v, qty: 150 }); }
    if (tp.fr) { var fr = getFood(tp.fr); if (fr) fixedItems.push({ food: fr, id: tp.fr, qty: 100 }); }
    fixedItems.forEach(function(x) {
      var k = x.qty / 100;
      fixedContrib.cal  += (x.food.cal  || 0) * k;
      fixedContrib.prot += (x.food.prot || 0) * k;
      fixedContrib.carb += (x.food.carb || 0) * k;
      fixedContrib.fat  += (x.food.fat  || 0) * k;
    });

    // Adjustable targets (subtract fixed contributions)
    var adjTarget = {
      cal:  Math.max(0, mTarget.cal  - fixedContrib.cal),
      prot: Math.max(0, mTarget.prot - fixedContrib.prot),
      carb: Math.max(0, mTarget.carb - fixedContrib.carb),
      fat:  Math.max(0, mTarget.fat  - fixedContrib.fat)
    };

    // Adjustable foods
    var adjFoods = [];
    if (tp.p) { var fp = getFood(tp.p); if (fp) adjFoods.push(fp); }
    if (tp.c) { var fc = getFood(tp.c); if (fc) adjFoods.push(fc); }
    if (tp.f) { var ff = getFood(tp.f); if (ff) adjFoods.push(ff); }

    var quantities = solveMealQuantities(adjFoods, adjTarget);

    // Build final list
    adjFoods.forEach(function(f, i) {
      items.push({ foodId: f.id, qty: quantities[i], unitIdx: 0 });
    });
    fixedItems.forEach(function(x) {
      items.push({ foodId: x.id, qty: x.qty, unitIdx: 0 });
    });

    window.state.nutrition.meals[meal.key] = items;

    // Log
    var tot = { cal: 0, prot: 0, carb: 0, fat: 0 };
    items.forEach(function(it) {
      var f = getFood(it.foodId);
      if (!f) return;
      var k = it.qty / 100;
      tot.cal  += (f.cal  || 0) * k;
      tot.prot += (f.prot || 0) * k;
      tot.carb += (f.carb || 0) * k;
      tot.fat  += (f.fat  || 0) * k;
    });
    log.push(meal.name + ': ' + Math.round(tot.cal) + '/' + Math.round(mTarget.cal) + ' kcal (P:' + Math.round(tot.prot) + '/' + Math.round(mTarget.prot) + ' C:' + Math.round(tot.carb) + '/' + Math.round(mTarget.carb) + ' F:' + Math.round(tot.fat) + '/' + Math.round(mTarget.fat) + ')');
  });

  // Save
  var targetId = window.state.nutritionOwnerId || window.state.user.id;
  window.api('POST', '/api/users/' + targetId + '/data/nutrition', { value: window.state.nutrition }).catch(function(){});

  window.renderView();
  console.log('══════ Meal Generation Results ══════');
  log.forEach(function(l) { console.log('  ' + l); });
  console.log('═════════════════════════════════════');
  window.toast('✓ نمونه ساخته شد — نتایج در Console');
};

/* ============================================================
   PART 5: ROBUST PRINT REPORT
   ============================================================ */
function fN(n) {
  if (n == null || isNaN(n)) return '—';
  try { return Number(n).toLocaleString('fa-IR'); } catch(e) { return String(n); }
}
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function generateBarChartSVG(data, labels, opts) {
  opts = opts || {};
  var width = opts.width || 480, height = opts.height || 200;
  var pad = { top: 20, right: 15, bottom: 40, left: 50 };
  var chartW = width - pad.left - pad.right;
  var chartH = height - pad.top - pad.bottom;
  var color = opts.color || '#3b82f6', color2 = opts.color2 || '#a855f7';

  if (!data || data.length === 0) return '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:12px">داده‌ای نیست</div>';
  var max = Math.max.apply(null, data.concat([1]));
  var realMax = max * 1.15;
  var groupW = chartW / data.length;
  var barW = groupW * 0.6;

  var grid = '';
  for (var i = 0; i <= 4; i++) {
    var y = pad.top + (i / 4) * chartH;
    var val = realMax - (i / 4) * realMax;
    grid += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (width - pad.right) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1"/>';
    grid += '<text x="' + (pad.left - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + fN(Math.round(val)) + '</text>';
  }

  var gid = 'g' + Math.random().toString(36).slice(2, 8);
  var bars = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '"/><stop offset="100%" stop-color="' + color2 + '"/></linearGradient></defs>';

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

window.printReport = async function(targetUserId) {
  try {
    var u = window.state.user;
    if (!u) { window.toast('لطفاً وارد شوید', 'warn'); return; }

    var tid = targetUserId || u.id;
    var isSelf = (tid === u.id);

    // ==== ALWAYS fetch fresh from API (source of truth) ====
    console.log('[Report] Fetching fresh data for: ' + tid);
    var freshData = {};
    try {
      freshData = await window.api('GET', '/api/users/' + tid + '/data');
      console.log('[Report] Data keys:', Object.keys(freshData).join(', '));
      if (freshData.nutrition) {
        console.log('[Report] Nutrition keys:', Object.keys(freshData.nutrition).join(', '));
        if (freshData.nutrition.meals) {
          var mealsSummary = Object.keys(freshData.nutrition.meals).map(function(k) {
            var arr = freshData.nutrition.meals[k];
            return k + ':' + (Array.isArray(arr) ? arr.length : '?');
          }).join(', ');
          console.log('[Report] Meals: ' + mealsSummary);
        }
      }
    } catch(e) {
      console.warn('[Report] API fetch failed, using state');
    }

    // Merge: prefer fresh API data, fallback to state
    var program = freshData.program || window.state.program || { days: [] };
    var history = freshData.history || window.state.history || {};
    var body = freshData.body || window.state.body || [];

    // For nutrition: pick whichever has meals with items
    var stateNut = (isSelf ? (window.state.nutrition || {}) : {});
    var apiNut = freshData.nutrition || {};

    function countItems(nut) {
      if (!nut || !nut.meals) return 0;
      return Object.keys(nut.meals).reduce(function(s, k) {
        return s + ((nut.meals[k] || []).length);
      }, 0);
    }
    var apiCount = countItems(apiNut);
    var stateCount = countItems(stateNut);

    var nutrition;
    if (apiCount > 0) {
      nutrition = apiNut;
      console.log('[Report] ✅ Using API nutrition (' + apiCount + ' items)');
    } else if (stateCount > 0) {
      nutrition = stateNut;
      console.log('[Report] ⚠️ API empty, using state nutrition (' + stateCount + ' items)');
    } else {
      nutrition = apiNut || stateNut || {};
      console.log('[Report] ❌ No meals in either source');
    }

    // ==== Weekly stats ====
    var now = Date.now();
    var sessions7 = 0, volume7 = 0;
    Object.keys(history).forEach(function(k) {
      var t = new Date(k).getTime();
      if (now - t < 7 * 86400000) {
        if ((history[k].completed || 0) > 0) sessions7++;
        volume7 += history[k].volume || 0;
      }
    });

    // ==== Weekly chart ====
    var weekLabels = [], weekVolumes = [];
    for (var w = 11; w >= 0; w--) {
      var ws = new Date();
      ws.setDate(ws.getDate() - (ws.getDay() + 1) % 7);
      ws.setHours(0, 0, 0, 0);
      ws.setDate(ws.getDate() - w * 7);
      var vol = 0;
      for (var dOff = 0; dOff < 7; dOff++) {
        var dd = new Date(ws);
        dd.setDate(dd.getDate() + dOff);
        var kk = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
        if (history[kk]) vol += history[kk].volume || 0;
      }
      weekLabels.push(ws.getDate() + '/' + (ws.getMonth() + 1));
      weekVolumes.push(Math.round(vol));
    }
    var totalVolume12w = weekVolumes.reduce(function(s, v) { return s + v; }, 0);

    // ==== Meal defs ====
    var MEAL_META = {
      breakfast: { name: 'صبحانه', emoji: '🌅' },
      snack1: { name: 'میان‌وعده صبح', emoji: '🍎' },
      lunch: { name: 'ناهار', emoji: '🍽️' },
      snack2: { name: 'میان‌وعده عصر', emoji: '🥤' },
      dinner: { name: 'شام', emoji: '🌙' }
    };
    var mealDefs = (window.NUT && Array.isArray(window.NUT.meals) && window.NUT.meals.length)
      ? window.NUT.meals.slice()
      : Object.keys(MEAL_META).map(function(k) { return { key: k, name: MEAL_META[k].name, emoji: MEAL_META[k].emoji }; });

    var foods = (window.NUT && window.NUT.foods) ? window.NUT.foods : [];
    var mealsObj = nutrition.meals || {};

    // ==== Build meal HTML (only meals WITH items) ====
    var mealsWithItems = mealDefs.filter(function(m) {
      return (mealsObj[m.key] || []).length > 0;
    });

    console.log('[Report] Active meals: ' + mealsWithItems.length);

    var mealTotalsGlobal = { cal: 0, prot: 0, carb: 0, fat: 0 };
    var mealBlocksHtml = mealsWithItems.map(function(meal) {
      var items = mealsObj[meal.key] || [];
      var mTot = { cal: 0, prot: 0, carb: 0, fat: 0 };

      var rowsHtml = items.map(function(it) {
        var food = foods.find(function(f) { return f.id === it.foodId; });
        if (!food) return '<tr><td colspan="6" style="text-align:center;color:#f43f5e;padding:6px;font-size:10px">⚠️ ' + escHtml(it.foodId) + '</td></tr>';
        var unit = (food.units && food.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        var grams = (it.qty || 0) * unit.g;
        var k = grams / 100;
        var cal = Math.round((food.cal || 0) * k);
        var prot = Math.round((food.prot || 0) * k * 10) / 10;
        var carb = Math.round((food.carb || 0) * k * 10) / 10;
        var fat = Math.round((food.fat || 0) * k * 10) / 10;
        mTot.cal += cal; mTot.prot += prot; mTot.carb += carb; mTot.fat += fat;
        return '<tr><td>' + (food.emoji || '') + ' ' + escHtml(food.name) + '</td>' +
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
        '<table><thead><tr><th style="text-align:right">غذا</th><th style="text-align:center;width:80px">مقدار</th><th style="text-align:center;width:55px">کالری</th><th style="text-align:center;width:50px">پروتئین</th><th style="text-align:center;width:50px">کرب</th><th style="text-align:center;width:50px">چربی</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
    }).join('');

    var hasMeals = mealsWithItems.length > 0;

    // ==== Supplements ====
    var supplements = nutrition.supplements || [];
    var supplementsHtml = supplements.length
      ? '<table><thead><tr><th style="text-align:right">مکمل</th><th style="text-align:center;width:100px">دوز</th><th style="text-align:center;width:110px">زمان</th><th style="text-align:center;width:70px">وضعیت</th></tr></thead><tbody>' +
        supplements.map(function(s) {
          return '<tr><td style="font-weight:700">' + escHtml(s.name) + '</td><td style="text-align:center;color:#f59e0b;font-weight:700">' + escHtml(s.dose || '—') + '</td><td style="text-align:center">' + escHtml(s.timing || '—') + '</td><td style="text-align:center;color:' + (s.enabled ? '#10b981' : '#94a3b8') + ';font-weight:700">' + (s.enabled ? '✓' : 'خیر') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '';

    // ==== Body ====
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
    var targetUser = u;
    if (!isSelf) {
      try {
        var allUsers = await window.api('GET', '/api/users');
        var found = allUsers.find(function(x) { return x.id === tid; });
        if (found) targetUser = found;
      } catch(e) {}
    }

    // ==== Build HTML ====
    var P = [];
    P.push('<!DOCTYPE html><html lang="fa" dir="rtl"><head>');
    P.push('<meta charset="UTF-8"><title>گزارش ProFit</title>');
    P.push('<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&display=swap" rel="stylesheet">');
    P.push('<style>');
    P.push('@page{size:A4 portrait;margin:12mm 10mm}');
    P.push('*{margin:0;padding:0;box-sizing:border-box;font-family:Vazirmatn,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}');
    P.push('body{background:#fff;color:#0f172a;line-height:1.6;font-size:11px}');
    P.push('.header{text-align:center;padding-bottom:12px;margin-bottom:16px;border-bottom:3px solid #3b82f6}');
    P.push('.header h1{font-size:20px;color:#3b82f6;margin-bottom:5px}');
    P.push('.header .sub{font-size:10px;color:#64748b}');
    P.push('.section{margin-bottom:16px}');
    P.push('.section h2{font-size:13px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #e2e8f0;color:#1e293b}');
    P.push('.new-page{page-break-before:always}');
    P.push('.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}');
    P.push('.stat{padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0}');
    P.push('.stat .lbl{font-size:9px;color:#64748b;font-weight:700}');
    P.push('.stat .val{font-size:16px;font-weight:900;color:#3b82f6;margin-top:3px}');
    P.push('.stat.green .val{color:#10b981}.stat.orange .val{color:#f59e0b}.stat.purple .val{color:#a855f7}');
    P.push('table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px}');
    P.push('th{background:#f1f5f9;padding:5px 4px;text-align:right;font-weight:800;color:#475569;font-size:9px}');
    P.push('td{padding:4px;border-bottom:1px solid #f1f5f9}');
    P.push('.macro{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:10px 0}');
    P.push('.mbox{text-align:center;padding:8px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0}');
    P.push('.mbox .ml{font-size:8px;color:#64748b;font-weight:700}');
    P.push('.mbox .mv{font-size:13px;font-weight:900;margin-top:2px}');
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
    P.push('<div class="sub" style="margin-top:4px">' + new Date().toLocaleDateString('fa-IR') + '</div>');
    if (!isSelf) P.push('<div class="sub" style="margin-top:4px;color:#f59e0b;font-weight:700">تولید توسط: ' + escHtml(u.displayName) + '</div>');
    P.push('</div>');

    // Weekly
    P.push('<div class="section"><h2>📊 خلاصه هفتگی</h2><div class="grid">');
    P.push('<div class="stat green"><div class="lbl">جلسات</div><div class="val">' + fN(sessions7) + '</div></div>');
    P.push('<div class="stat"><div class="lbl">حجم (kg)</div><div class="val">' + fN(Math.round(volume7)) + '</div></div>');
    P.push('<div class="stat purple"><div class="lbl">روزهای برنامه</div><div class="val">' + fN((program.days || []).length) + '</div></div>');
    P.push('</div></div>');

    // Volume chart
    P.push('<div class="section"><h2>💪 حجم تمرین (۱۲ هفته)</h2>');
    if (totalVolume12w > 0) P.push(generateBarChartSVG(weekVolumes, weekLabels, { color: '#3b82f6', color2: '#a855f7' }));
    else P.push('<div class="empty">📭 هنوز داده‌ای نیست</div>');
    P.push('</div>');

    // Program
    P.push('<div class="section new-page"><h2>🗓️ برنامه تمرینی</h2>');
    if (program.days && program.days.length) {
      program.days.forEach(function(day) {
        P.push('<div style="margin-bottom:10px;padding:8px;background:#fafbfc;border-radius:6px;border:1px solid #f1f5f9">');
        P.push('<h3 style="font-size:11px;color:#1e293b;margin-bottom:6px;padding-right:8px;border-right:3px solid #3b82f6;font-weight:800">' + (day.icon || '💪') + ' ' + escHtml(day.name) + '</h3>');
        P.push('<table><thead><tr><th style="width:25px;text-align:center">#</th><th>حرکت</th><th style="text-align:center;width:45px">ست</th><th style="text-align:center;width:65px">تکرار</th><th style="text-align:center;width:45px">RPE</th></tr></thead><tbody>');
        (day.exercises || []).forEach(function(ex, i) {
          var DB = window.DB || {};
          var def = (DB.exercises || []).find(function(e) { return e.id === ex.exId; }) || {};
          P.push('<tr><td style="text-align:center;color:#94a3b8;font-weight:700">' + (i + 1) + '</td><td style="font-weight:700">' + escHtml(def.name || ex.exId) + '</td><td style="text-align:center;color:#3b82f6;font-weight:700">' + (ex.sets || 3) + '</td><td style="text-align:center">' + escHtml(ex.reps || '—') + '</td><td style="text-align:center;color:#f59e0b;font-weight:700">' + escHtml(ex.rpe || '—') + '</td></tr>');
        });
        P.push('</tbody></table></div>');
      });
    } else P.push('<div class="empty">📭 برنامه‌ای نیست</div>');
    P.push('</div>');

    // Nutrition targets
    P.push('<div class="section new-page"><h2>🎯 اهداف تغذیه</h2>');
    var targets = nutrition.targets;
    if (targets) {
      P.push('<div class="grid"><div class="stat"><div class="lbl">BMR</div><div class="val">' + fN(targets.bmr) + '</div></div><div class="stat"><div class="lbl">TDEE</div><div class="val">' + fN(targets.tdee) + '</div></div><div class="stat green"><div class="lbl">کالری هدف</div><div class="val">' + fN(targets.calories) + '</div></div></div>');
      P.push('<div class="macro"><div class="mbox prot"><div class="ml">پروتئین</div><div class="mv">' + (targets.protein || 0) + 'g</div></div><div class="mbox carb"><div class="ml">کربوهیدرات</div><div class="mv">' + (targets.carbs || 0) + 'g</div></div><div class="mbox fat"><div class="ml">چربی</div><div class="mv">' + (targets.fat || 0) + 'g</div></div><div class="mbox cal"><div class="ml">جمع</div><div class="mv">' + fN((targets.protein || 0) * 4 + (targets.carbs || 0) * 4 + (targets.fat || 0) * 9) + '</div></div></div>');
    } else P.push('<div class="empty">🧮 کالری محاسبه نشده</div>');
    P.push('</div>');

    // Meals
    P.push('<div class="section"><h2>🍽️ برنامه غذایی</h2>');
    if (hasMeals) {
      P.push(mealBlocksHtml);
      P.push('<div class="macro" style="background:#f0fdf4;padding:10px;border-radius:8px;border:1px solid #bbf7d0">');
      P.push('<div class="mbox cal"><div class="ml">کالری</div><div class="mv">' + fN(Math.round(mealTotalsGlobal.cal)) + '</div></div>');
      P.push('<div class="mbox prot"><div class="ml">پروتئین</div><div class="mv">' + mealTotalsGlobal.prot.toFixed(1) + 'g</div></div>');
      P.push('<div class="mbox carb"><div class="ml">کربوهیدرات</div><div class="mv">' + mealTotalsGlobal.carb.toFixed(1) + 'g</div></div>');
      P.push('<div class="mbox fat"><div class="ml">چربی</div><div class="mv">' + mealTotalsGlobal.fat.toFixed(1) + 'g</div></div>');
      P.push('</div>');
    } else {
      P.push('<div class="empty">🍽️ هنوز غذایی اضافه نشده<br><span style="font-size:10px">(این یه یادآوریه که توی تب «تغذیه» → «غذاها» وعده‌هات رو پر کنی)</span></div>');
    }
    P.push('</div>');

    // Supplements
    P.push('<div class="section new-page"><h2>💊 مکمل‌ها</h2>');
    if (supplements.length) P.push(supplementsHtml);
    else P.push('<div class="empty">💊 مکملی تنظیم نشده</div>');
    P.push('</div>');

    // Body
    P.push('<div class="section new-page"><h2>📏 اندازه‌های بدن</h2>');
    if (bodyTableHtml) P.push(bodyTableHtml);
    else P.push('<div class="empty">📏 اندازه‌ای ثبت نشده</div>');
    P.push('</div>');

    P.push('<div class="footer"><div>گزارش ProFit — ' + new Date().toLocaleString('fa-IR') + '</div></div>');
    P.push('<div class="no-print"><button onclick="window.print()" style="border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff">🖨️ چاپ / PDF</button><button onclick="window.close()" style="border:1px solid #cbd5e1;background:#fff;color:#334155">بستن</button></div></body></html>');

    var html = P.join('\n');
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var w = window.open(url, '_blank');
    if (!w) { URL.revokeObjectURL(url); window.toast('پاپ‌آپ بلاک شده', 'warn'); return; }
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  } catch (e) {
    console.error('[Report] error:', e);
    window.toast('خطا: ' + e.message, 'error');
  }
};

/* ============================================================
   PART 6: EXPORT DRAWER
   ============================================================ */
function closeDrawerById(id) {
  var d = document.getElementById(id);
  if (d) { d.classList.remove('open'); d.style.display = 'none'; setTimeout(function() { d.style.display = ''; }, 100); }
  var b = document.getElementById(id.replace('Drawer', 'Backdrop'));
  if (b) { b.classList.remove('open'); b.style.display = 'none'; setTimeout(function() { b.style.display = ''; }, 100); }
}

window.openExportDrawer = function() {
  var drawer = document.getElementById('exportDrawer');
  var backdrop = document.getElementById('exportBackdrop');
  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'exportBackdrop'; backdrop.className = 'backdrop';
    backdrop.onclick = function() { closeDrawerById('exportDrawer'); };
    document.body.appendChild(backdrop);
    drawer = document.createElement('div');
    drawer.id = 'exportDrawer'; drawer.className = 'drawer right';
    drawer.innerHTML = '<div class="drawer-header"><h2>📤 خروجی و بکاپ</h2><button class="close-btn" onclick="closeDrawer(\'exportDrawer\')">✕</button></div><div class="drawer-body" id="exportDrawerBody"></div>';
    document.body.appendChild(drawer);
  }
  var u = window.state.user;
  var isAdmin = u.role === 'admin';
  var h = '<div class="sh">📦 بکاپ کامل</div>';
  h += '<button class="btn primary full" style="margin-bottom:8px;justify-content:flex-start;padding:14px" onclick="exportUserData(\'' + u.id + '\',\'' + u.username + '\')"><span style="font-size:1.2rem">💾</span><div style="flex:1;text-align:right"><div style="font-weight:800">دانلود بکاپ</div></div></button>';
  h += '<div class="sh">📊 CSV</div>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportWorkoutCSV()"><span style="font-size:1.1rem">🏋️</span><span style="flex:1;text-align:right;font-size:.82rem">سابقه تمرینات</span></button>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportNutritionCSV()"><span style="font-size:1.1rem">🥗</span><span style="flex:1;text-align:right;font-size:.82rem">تغذیه</span></button>';
  h += '<button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:12px" onclick="exportBodyCSV()"><span style="font-size:1.1rem">📏</span><span style="flex:1;text-align:right;font-size:.82rem">اندازه‌ها</span></button>';
  h += '<div class="sh">🖨️ PDF</div>';
  h += '<button class="btn success full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="printReport(\'' + u.id + '\')"><span style="font-size:1.2rem">📄</span><div style="flex:1;text-align:right"><div style="font-weight:800">گزارش کامل</div></div></button>';
  document.getElementById('exportDrawerBody').innerHTML = h;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
};

/* CSV downloads */
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
    var backup = { _meta: { type: 'profit-user-backup', version: '1.0', exportedAt: new Date().toISOString(), userId: uid, username: uname }, data: d };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'backup-' + uname + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportWorkoutCSV = async function() {
  try {
    var d = await window.api('GET', '/api/users/' + window.state.user.id + '/data');
    var rows = [['تاریخ', 'شماره', 'ست', 'وزنه', 'تکرار', 'حجم']];
    var logs = (d.workout || {}).logs || {};
    Object.keys(logs).sort().forEach(function(key) {
      var parts = key.split(':');
      Object.keys(logs[key] || {}).forEach(function(si) {
        var l = logs[key][si] || {};
        rows.push([parts[0], parseInt(parts[1]) + 1, parseInt(si) + 1, l.weight || '', l.reps || '', (l.weight && l.reps) ? l.weight * l.reps : 0]);
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
    ((window.NUT || {}).meals || []).forEach(function(m) {
      var items = (nut.meals && nut.meals[m.key]) || [];
      items.forEach(function(it) {
        var f = foods.find(function(x) { return x.id === it.foodId; });
        if (!f) return;
        var unit = (f.units && f.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        var k = ((it.qty || 0) * unit.g) / 100;
        rows.push([m.name, f.name, it.qty, unit.n, Math.round((f.cal || 0) * k), Math.round((f.prot || 0) * k * 10) / 10, Math.round((f.carb || 0) * k * 10) / 10, Math.round((f.fat || 0) * k * 10) / 10]);
      });
    });
    downloadCSV('nutrition.csv', rows);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportBodyCSV = async function() {
  try {
    var d = await window.api('GET', '/api/users/' + window.state.user.id + '/data');
    var body = d.body || [];
    if (!body.length) { window.toast('داده‌ای نیست', 'warn'); return; }
    var metrics = ['weight', 'bodyfat', 'neck', 'chest', 'waist', 'hip', 'arm', 'forearm', 'thigh', 'calf'];
    var rows = [['تاریخ'].concat(metrics)];
    body.slice().sort(function(a, b) { return a.date.localeCompare(b.date); }).forEach(function(e) {
      var row = [e.date];
      metrics.forEach(function(k) { row.push(e[k] != null ? e[k] : ''); });
      rows.push(row);
    });
    downloadCSV('body.csv', rows);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportAllUsersBackup = async function() {
  try {
    var allUsers = await window.api('GET', '/api/users');
    var backup = { _meta: { type: 'profit-db-backup', exportedAt: new Date().toISOString(), count: allUsers.length }, users: [] };
    for (var i = 0; i < allUsers.length; i++) {
      try {
        var d = await window.api('GET', '/api/users/' + allUsers[i].id + '/data');
        backup.users.push({ user: allUsers[i], data: d });
      } catch(e) { backup.users.push({ user: allUsers[i], data: null }); }
    }
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'profit-full-backup.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.importUserData = function(uid) {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var backup = JSON.parse(await file.text());
      if (!backup._meta || backup._meta.type !== 'profit-user-backup') { window.toast('فایل معتبر نیست', 'error'); return; }
      var fields = Object.keys(backup.data || {});
      if (!confirm('بازیابی ' + fields.length + ' بخش؟')) return;
      for (var i = 0; i < fields.length; i++) {
        await window.api('POST', '/api/users/' + uid + '/data/' + fields[i], { value: backup.data[fields[i]] });
      }
      window.toast('بازیابی شد ✓');
      setTimeout(function() { location.reload(); }, 1000);
    } catch (err) { window.toast('خطا: ' + err.message, 'error'); }
  };
  input.click();
};

/* ============================================================
   PART 7: HELP + TOOLBAR
   ============================================================ */
window.openHelpDrawer = function() {
  window.toast('راهنما: به تب‌های بالا مراجعه کن', 'info');
};

function addToolbarButtons() {
  try {
    var tb = document.getElementById('toolbar');
    if (!tb) return;
    if (!document.getElementById('expToolbarBtn')) {
      var b2 = document.createElement('button');
      b2.id = 'expToolbarBtn'; b2.className = 'btn';
      b2.innerHTML = '<span>📤</span> خروجی';
      b2.onclick = function() { window.openExportDrawer(); };
      tb.appendChild(b2);
    }
  } catch(e) {}
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else setTimeout(fn, 0);
}

ready(function() {
  console.log('✅ [Extras v1.9] Ready');
  setInterval(addToolbarButtons, 800);
  setTimeout(addToolbarButtons, 500);
  setTimeout(addToolbarButtons, 1500);
  setInterval(applyUnitStyles, 1500); // Backup for unit styles
});

document.addEventListener('keydown', function(e) {
  var t = e.target.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  if (e.ctrlKey && e.key === 'e') { e.preventDefault(); window.openExportDrawer(); }
});

console.log('✨ [Extras v1.9] Loaded');

})();
