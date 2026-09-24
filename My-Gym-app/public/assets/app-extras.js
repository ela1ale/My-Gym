/* ============================================================
   ProFit Extras v1.8 — Accurate Meals + Fixed Mobile CSS
   ============================================================ */
(function() {
'use strict';

/* ============================================================
   CSS FIX — Flexbox layout for meal items
   ============================================================ */
(function injectCSSFix() {
  var css = `
    /* === Meal item: flexbox layout that works on every device === */
    .meal-item {
      display: flex !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 8px 4px !important;
      border-bottom: 1px solid var(--bd) !important;
      width: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .meal-item .mi-emoji {
      flex: 0 0 24px !important;
      font-size: 1rem !important;
      text-align: center !important;
    }
    .meal-item .mi-name {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-weight: 700 !important;
      font-size: .76rem !important;
    }
    .meal-item .mi-qty-wrap {
      display: flex !important;
      gap: 4px !important;
      align-items: center !important;
      flex: 0 0 auto !important;
      width: 140px !important;
    }
    .meal-item .mi-qty {
      flex: 0 0 52px !important;
      width: 52px !important;
      padding: 6px 4px !important;
      text-align: center !important;
      font-size: .76rem !important;
      border-radius: 6px !important;
      border: 1px solid var(--bd) !important;
      background: var(--card) !important;
      color: var(--tx) !important;
      box-sizing: border-box !important;
    }
    .meal-item .mi-unit {
      flex: 1 1 auto !important;
      width: auto !important;
      min-width: 70px !important;
      padding: 6px 4px !important;
      font-size: .72rem !important;
      border-radius: 6px !important;
      border: 1px solid var(--bd) !important;
      background: var(--card) !important;
      color: var(--tx) !important;
      box-sizing: border-box !important;
      direction: rtl !important;
    }
    .meal-item .mi-kcal {
      flex: 0 0 52px !important;
      width: 52px !important;
      text-align: center !important;
      font-size: .72rem !important;
      font-weight: 800 !important;
      color: var(--gr) !important;
      direction: ltr !important;
    }
    .meal-item .mi-del {
      flex: 0 0 22px !important;
      width: 22px !important;
      padding: 0 !important;
      background: none !important;
      border: none !important;
      color: var(--rd) !important;
      cursor: pointer !important;
      font-size: .9rem !important;
    }

    /* === Mobile (< 600px): make unit dropdown bigger === */
    @media (max-width: 600px) {
      .meal-item {
        gap: 4px !important;
        padding: 8px 2px !important;
      }
      .meal-item .mi-emoji { flex-basis: 20px !important; font-size: .9rem !important; }
      .meal-item .mi-name { font-size: .72rem !important; }
      .meal-item .mi-qty-wrap { width: 132px !important; gap: 3px !important; }
      .meal-item .mi-qty { flex-basis: 44px !important; width: 44px !important; font-size: .72rem !important; }
      .meal-item .mi-unit { min-width: 78px !important; font-size: .68rem !important; padding: 6px 2px !important; }
      .meal-item .mi-kcal { flex-basis: 42px !important; width: 42px !important; font-size: .68rem !important; }
      .meal-item .mi-del { flex-basis: 18px !important; width: 18px !important; }
    }

    /* === Very small (< 380px): stack name above rest === */
    @media (max-width: 380px) {
      .meal-item {
        flex-wrap: wrap !important;
        row-gap: 4px !important;
      }
      .meal-item .mi-name {
        flex-basis: calc(100% - 28px) !important;
      }
      .meal-item .mi-qty-wrap {
        width: 100% !important;
        flex-basis: 100% !important;
        padding-right: 26px !important;
      }
      .meal-item .mi-qty { flex-basis: 60px !important; width: 60px !important; }
      .meal-item .mi-unit { min-width: 0 !important; flex: 1 1 auto !important; }
    }
  `;
  var s = document.createElement('style');
  s.id = 'extras-css-fix-v2';
  s.textContent = css;
  if (document.head) document.head.appendChild(s);
  else document.addEventListener('DOMContentLoaded', function() { document.head.appendChild(s); });
})();

/* ============================================================
   HELPERS
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

/* ============================================================
   OVERRIDE: openNutritionForStudent — close ALL drawers
   ============================================================ */
window.openNutritionForStudent = async function(sid) {
  try {
    var d = await window.api('GET', '/api/users/' + sid + '/data');

    var nut = (d.nutrition && d.nutrition.profile)
      ? d.nutrition
      : { profile:{ gender:'male', age:30, weight:75, height:175, activity:1.55, goal:'maintain', bodyfat:20, formula:'mifflin' },
          targets:null,
          meals:{ breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] },
          supplements:[], suppGoalUsed:null };

    if (!nut.meals) nut.meals = { breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] };
    if (!nut.supplements) nut.supplements = [];

    window.state.nutrition = nut;
    window.state.nutritionOwnerId = (sid === window.state.user.id) ? null : sid;

    window.closeDrawer('studentDetailDrawer');
    window.closeDrawer('coachDrawer');
    window.closeDrawer('adminDrawer');

    setTimeout(function() {
      window.state.currentView = 'nutrition';
      window.state.nutritionTab = 'calc';
      window.renderView();
      window.toast('تغذیه شاگرد بارگذاری شد ✓');
    }, 200);
  } catch (e) {
    window.toast('خطا: ' + e.message, 'error');
  }
};

/* ============================================================
   SMART MEAL GENERATOR — Iterative least-squares macro matching
   ============================================================ */
window.generateSampleMeals = function() {
  var t = window.state.nutrition.targets;
  if (!t) { window.toast('ابتدا کالری را محاسبه کن', 'warn'); return; }

  var NUT = window.NUT || {};
  var foods = NUT.foods || [];
  if (!foods.length) { window.toast('لیست غذاها بارگذاری نشده', 'error'); return; }

  var templates = {
    breakfast: { p: 'egg_whole', c: 'oat', f: 'almond', fr: 'banana' },
    snack1:    { f: 'almond', fr: 'apple' },
    lunch:     { p: 'chicken_breast', c: 'rice_white', f: 'olive_oil', v: 'broccoli' },
    snack2:    { p: 'yogurt_low', f: 'walnut' },
    dinner:    { p: 'salmon', c: 'sweet_potato', f: 'olive_oil', v: 'spinach' }
  };

  function getFood(id) { return foods.find(function(f) { return f.id === id; }); }

  // ============ ITERATIVE MACRO SOLVER ============
  // foods: array of food objects
  // target: { cal, prot, carb, fat }
  // returns: array of quantities (grams) for each food
  function solveQuantities(foodList, target) {
    var n = foodList.length;
    if (n === 0) return [];

    // Get macro vectors per 100g
    var calPer100 = foodList.map(function(f) { return f.cal || 0; });
    var protPer100 = foodList.map(function(f) { return f.prot || 0; });
    var carbPer100 = foodList.map(function(f) { return f.carb || 0; });
    var fatPer100 = foodList.map(function(f) { return f.fat || 0; });

    // Initial guess: use protein for protein food, carbs for carb food, fat for fat food
    var quantities = foodList.map(function(f, i) {
      // If this food is a protein source (>15g prot per 100g) → use for protein
      if ((f.prot || 0) > 15 && (f.prot || 0) > (f.carb || 0) && (f.prot || 0) > (f.fat || 0)) {
        return (target.prot * 100) / (f.prot || 1) / Math.max(1, foodList.filter(function(x) { return (x.prot || 0) > 15; }).length);
      }
      // Carb source
      if ((f.carb || 0) > 15 && (f.carb || 0) > (f.prot || 0) && (f.carb || 0) > (f.fat || 0)) {
        return (target.carb * 100) / (f.carb || 1) / Math.max(1, foodList.filter(function(x) { return (x.carb || 0) > 15; }).length);
      }
      // Fat source
      if ((f.fat || 0) > 10 && (f.fat || 0) > (f.prot || 0) && (f.fat || 0) > (f.carb || 0)) {
        return (target.fat * 100) / (f.fat || 1) / Math.max(1, foodList.filter(function(x) { return (x.fat || 0) > 10; }).length);
      }
      // Other (veggie, fruit) — start with 100g
      return 100;
    });

    // Weights: how much we care about each macro
    var W_CAL = 1.0, W_PROT = 2.5, W_CARB = 1.5, W_FAT = 1.8;

    // Iteratively adjust quantities
    for (var iter = 0; iter < 30; iter++) {
      // Current totals
      var cal = 0, prot = 0, carb = 0, fat = 0;
      for (var i = 0; i < n; i++) {
        var q = quantities[i] / 100;
        cal += calPer100[i] * q;
        prot += protPer100[i] * q;
        carb += carbPer100[i] * q;
        fat += fatPer100[i] * q;
      }

      // Errors
      var eCal = target.cal - cal;
      var eProt = target.prot - prot;
      var eCarb = target.carb - carb;
      var eFat = target.fat - fat;

      // Check convergence
      var errTotal = Math.abs(eCal) / Math.max(1, target.cal)
                   + Math.abs(eProt) / Math.max(1, target.prot)
                   + Math.abs(eCarb) / Math.max(1, target.carb)
                   + Math.abs(eFat) / Math.max(1, target.fat);
      if (errTotal < 0.05) break;

      // Gradient descent step for each food
      for (var i2 = 0; i2 < n; i2++) {
        // Only adjust non-veggie/fruit foods
        var f2 = foodList[i2];
        var isVeggieOrFruit = (f2.cat === 'veg' || f2.cat === 'fruit');
        if (isVeggieOrFruit) continue;

        var cGrad = calPer100[i2] / 100;
        var pGrad = protPer100[i2] / 100;
        var cbGrad = carbPer100[i2] / 100;
        var fGrad = fatPer100[i2] / 100;

        // Numerator: weighted error * gradient
        var num = W_CAL * (eCal / Math.max(1, target.cal)) * cGrad
                + W_PROT * (eProt / Math.max(1, target.prot)) * pGrad
                + W_CARB * (eCarb / Math.max(1, target.carb)) * cbGrad
                + W_FAT * (eFat / Math.max(1, target.fat)) * fGrad;

        // Denominator: weighted gradient squared
        var den = W_CAL * cGrad * cGrad / Math.max(1, target.cal)
                + W_PROT * pGrad * pGrad / Math.max(1, target.prot)
                + W_CARB * cbGrad * cbGrad / Math.max(1, target.carb)
                + W_FAT * fGrad * fGrad / Math.max(1, target.fat);

        if (den > 1e-6) {
          var delta = (num / den) * 0.3 * 100; // learning rate
          quantities[i2] += delta;
        }

        // Clamp
        if (quantities[i2] < 3) quantities[i2] = 3;
        if (quantities[i2] > 600) quantities[i2] = 600;
      }
    }

    // Round to sensible precision
    return quantities.map(function(q) { return Math.max(1, Math.round(q)); });
  }

  // ============ BUILD MEALS ============
  var totalGenerated = 0;
  NUT.meals.forEach(function(meal) {
    var tp = templates[meal.key];
    if (!tp) return;

    var mTarget = {
      cal: t.calories * meal.pct,
      prot: t.protein * meal.pct,
      carb: t.carbs * meal.pct,
      fat: t.fat * meal.pct
    };

    // Collect food objects
    var foodList = [];
    var foodIds = [];

    if (tp.p) { var fp = getFood(tp.p); if (fp) { foodList.push(fp); foodIds.push(tp.p); } }
    if (tp.c) { var fc = getFood(tp.c); if (fc) { foodList.push(fc); foodIds.push(tp.c); } }
    if (tp.f) { var ff = getFood(tp.f); if (ff) { foodList.push(ff); foodIds.push(tp.f); } }
    // Fixed-amount foods added LAST so they don't get adjusted
    var fixedFoods = [];
    if (tp.v) { var fv = getFood(tp.v); if (fv) { fixedFoods.push({ food: fv, id: tp.v, qty: 150 }); } }
    if (tp.fr) { var fr = getFood(tp.fr); if (fr) { fixedFoods.push({ food: fr, id: tp.fr, qty: 100 }); } }

    // Solve for adjustable foods
    var quantities = solveQuantities(foodList, mTarget);

    // Build final items
    var items = [];
    foodList.forEach(function(f, i) {
      items.push({ foodId: foodIds[i], qty: quantities[i], unitIdx: 0 });
    });
    fixedFoods.forEach(function(x) {
      items.push({ foodId: x.id, qty: x.qty, unitIdx: 0 });
    });

    window.state.nutrition.meals[meal.key] = items;
    totalGenerated++;
  });

  if (totalGenerated === 0) {
    window.toast('قالب وعده‌ای پیدا نشد', 'error');
    return;
  }

  // Save
  var targetId = window.state.nutritionOwnerId || window.state.user.id;
  window.api('POST', '/api/users/' + targetId + '/data/nutrition', { value: window.state.nutrition }).catch(function(){});

  // Show result summary
  var summary = [];
  NUT.meals.forEach(function(m) {
    var items = window.state.nutrition.meals[m.key] || [];
    var tot = { cal: 0, prot: 0, carb: 0, fat: 0 };
    items.forEach(function(it) {
      var f = getFood(it.foodId);
      if (!f) return;
      var k = it.qty / 100;
      tot.cal += (f.cal || 0) * k;
      tot.prot += (f.prot || 0) * k;
      tot.carb += (f.carb || 0) * k;
      tot.fat += (f.fat || 0) * k;
    });
    var tgt = t.calories * m.pct;
    summary.push(m.name + ': ' + Math.round(tot.cal) + '/' + Math.round(tgt) + ' kcal');
  });

  window.renderView();
  console.log('[generateSampleMeals] Results:');
  summary.forEach(function(s) { console.log('  ' + s); });
  window.toast('✓ ' + totalGenerated + ' وعده ساخته شد (نتیجه در Console)', 'success');
};

/* ============================================================
   PRINT REPORT — Robust with API fallback
   ============================================================ */
window.printReport = async function(targetUserId) {
  try {
    var u = window.state.user;
    if (!u) { window.toast('لطفاً وارد شوید', 'warn'); return; }

    var tid = targetUserId || u.id;
    var isSelf = (tid === u.id);

    // ====== Get data ======
    var program, history, nutrition, body;

    if (isSelf) {
      program = window.state.program || { days: [] };
      history = window.state.history || {};
      nutrition = window.state.nutrition || {};
      body = window.state.body || [];
    } else {
      var d = await window.api('GET', '/api/users/' + tid + '/data');
      program = d.program || { days: [] };
      history = d.history || {};
      nutrition = d.nutrition || {};
      body = d.body || [];
    }

    // Backup: if state has no meals, fetch from API
    var mealsObj = nutrition.meals || {};
    var hasMealsInState = Object.keys(mealsObj).some(function(k) {
      return Array.isArray(mealsObj[k]) && mealsObj[k].length > 0;
    });

    if (!hasMealsInState) {
      try {
        var fresh = await window.api('GET', '/api/users/' + tid + '/data');
        if (fresh.nutrition && fresh.nutrition.meals) {
          var freshHasItems = Object.keys(fresh.nutrition.meals).some(function(k) {
            return Array.isArray(fresh.nutrition.meals[k]) && fresh.nutrition.meals[k].length > 0;
          });
          if (freshHasItems) {
            nutrition = fresh.nutrition;
            mealsObj = nutrition.meals;
            console.log('[Report] ✅ Loaded nutrition from API');
          }
        }
      } catch(e) {}
    }

    console.log('[Report] Meals:', Object.keys(mealsObj).map(function(k) {
      return k + ':' + (Array.isArray(mealsObj[k]) ? mealsObj[k].length : 0);
    }).join(', '));

    // ====== Weekly stats ======
    var now = Date.now();
    var sessions7 = 0, volume7 = 0;
    Object.keys(history).forEach(function(k) {
      var t = new Date(k).getTime();
      if (now - t < 7 * 86400000) {
        if ((history[k].completed || 0) > 0) sessions7++;
        volume7 += history[k].volume || 0;
      }
    });

    // ====== Weekly volume chart ======
    var weekLabels = [], weekVolumes = [], weeks = [];
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
    }
    var totalVolume12w = weekVolumes.reduce(function(s, v) { return s + v; }, 0);

    // ====== Meal defs ======
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

    Object.keys(mealsObj).forEach(function(k) {
      if (!mealDefs.find(function(m) { return m.key === k; })) {
        var meta = MEAL_META[k] || { name: k, emoji: '🍽️' };
        mealDefs.push({ key: k, name: meta.name, emoji: meta.emoji });
      }
    });

    var foods = (window.NUT && window.NUT.foods) ? window.NUT.foods : [];
    var activeMeals = mealDefs.filter(function(m) {
      return (mealsObj[m.key] || []).length > 0;
    });
    var hasMeals = activeMeals.length > 0;

    // ====== Build meal HTML ======
    var mealTotalsGlobal = { cal: 0, prot: 0, carb: 0, fat: 0 };
    var mealBlocksHtml = '';

    if (hasMeals) {
      mealBlocksHtml = activeMeals.map(function(meal) {
        var items = mealsObj[meal.key] || [];
        var mTot = { cal: 0, prot: 0, carb: 0, fat: 0 };

        var rowsHtml = items.map(function(it) {
          var food = foods.find(function(f) { return f.id === it.foodId; });
          if (!food) return '<tr><td colspan="6" style="text-align:center;color:#f43f5e;padding:6px;font-size:10px">⚠️ غذای ناشناخته: ' + escHtml(it.foodId || '?') + '</td></tr>';
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

    // ====== Supplements ======
    var supplements = nutrition.supplements || [];
    var supplementsHtml = supplements.length
      ? '<table><thead><tr><th style="text-align:right">مکمل</th><th style="text-align:center;width:100px">دوز</th><th style="text-align:center;width:110px">زمان</th><th style="text-align:center;width:70px">وضعیت</th></tr></thead><tbody>' +
        supplements.map(function(s) {
          return '<tr><td style="font-weight:700">' + escHtml(s.name) + '</td><td style="text-align:center;color:#f59e0b;font-weight:700">' + escHtml(s.dose || '—') + '</td><td style="text-align:center">' + escHtml(s.timing || '—') + '</td><td style="text-align:center;color:' + (s.enabled ? '#10b981' : '#94a3b8') + ';font-weight:700">' + (s.enabled ? '✓ فعال' : 'غیرفعال') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '';

    // ====== Body ======
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

    // ====== Build HTML ======
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

    P.push('<div class="header"><h1>🏋️ گزارش کامل ProFit</h1>');
    P.push('<div class="sub"><b>' + escHtml(targetUser.displayName) + '</b> — @' + escHtml(targetUser.username) + ' — ' + (roleNames[targetUser.role] || targetUser.role) + '</div>');
    P.push('<div class="sub" style="margin-top:4px">تاریخ: ' + new Date().toLocaleDateString('fa-IR') + '</div>');
    if (!isSelf) P.push('<div class="sub" style="margin-top:4px;color:#f59e0b;font-weight:700">تولید توسط: ' + escHtml(u.displayName) + '</div>');
    P.push('</div>');

    // Weekly
    P.push('<div class="section"><h2>📊 خلاصه عملکرد هفتگی</h2><div class="grid">');
    P.push('<div class="stat green"><div class="lbl">جلسات این هفته</div><div class="val">' + fN(sessions7) + '</div></div>');
    P.push('<div class="stat"><div class="lbl">حجم کل (kg)</div><div class="val">' + fN(Math.round(volume7)) + '</div></div>');
    P.push('<div class="stat purple"><div class="lbl">روزهای برنامه</div><div class="val">' + fN((program.days || []).length) + '</div></div>');
    P.push('</div></div>');

    // Volume chart
    P.push('<div class="section"><h2>💪 حجم تمرین (۱۲ هفته اخیر)</h2>');
    if (totalVolume12w > 0) {
      P.push(generateBarChartSVG(weekVolumes, weekLabels, { color: '#3b82f6', color2: '#a855f7' }));
    } else {
      P.push('<div class="empty">📭 هنوز داده تمرینی ثبت نشده</div>');
    }
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
    } else {
      P.push('<div class="empty">📭 هنوز برنامه‌ای ساخته نشده</div>');
    }
    P.push('</div>');

    // Nutrition targets
    P.push('<div class="section new-page"><h2>🎯 اهداف تغذیه</h2>');
    var targets = nutrition.targets;
    if (targets) {
      P.push('<div class="grid"><div class="stat"><div class="lbl">BMR</div><div class="val">' + fN(targets.bmr) + '</div></div><div class="stat"><div class="lbl">TDEE</div><div class="val">' + fN(targets.tdee) + '</div></div><div class="stat green"><div class="lbl">کالری هدف</div><div class="val">' + fN(targets.calories) + '</div></div></div>');
      P.push('<div class="macro"><div class="mbox prot"><div class="ml">پروتئین</div><div class="mv">' + (targets.protein || 0) + 'g</div></div><div class="mbox carb"><div class="ml">کربوهیدرات</div><div class="mv">' + (targets.carbs || 0) + 'g</div></div><div class="mbox fat"><div class="ml">چربی</div><div class="mv">' + (targets.fat || 0) + 'g</div></div><div class="mbox cal"><div class="ml">جمع</div><div class="mv">' + fN((targets.protein || 0) * 4 + (targets.carbs || 0) * 4 + (targets.fat || 0) * 9) + '</div></div></div>');
    } else {
      P.push('<div class="empty">🧮 کالری محاسبه نشده</div>');
    }
    P.push('</div>');

    // Meals
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
      P.push('<div class="empty">🍽️ هنوز غذایی اضافه نشده</div>');
    }
    P.push('</div>');

    // Supplements
    P.push('<div class="section new-page"><h2>💊 مکمل‌ها</h2>');
    if (supplements.length) {
      P.push(supplementsHtml);
    } else {
      P.push('<div class="empty">💊 مکملی تنظیم نشده</div>');
    }
    P.push('</div>');

    // Body
    P.push('<div class="section new-page"><h2>📏 اندازه‌های بدن</h2>');
    if (bodyTableHtml) P.push(bodyTableHtml);
    else P.push('<div class="empty">📏 اندازه‌ای ثبت نشده</div>');
    P.push('</div>');

    P.push('<div class="footer"><div>گزارش تولیدشده توسط <b>ProFit</b> — ' + new Date().toLocaleString('fa-IR') + '</div></div>');
    P.push('<div class="no-print"><button onclick="window.print()" style="border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff">🖨️ چاپ / PDF</button><button onclick="window.close()" style="border:1px solid #cbd5e1;background:#fff;color:#334155">بستن</button></div></body></html>');

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
   CHART SVG
   ============================================================ */
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

/* ============================================================
   EXPORT DRAWER
   ============================================================ */
function closeDrawerById(id) {
  var d = document.getElementById(id);
  if (d) d.classList.remove('open');
  var b = document.getElementById(id.replace('Drawer', 'Backdrop'));
  if (b) b.classList.remove('open');
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
  var el = document.getElementById('exportDrawerBody');
  var u = window.state.user;
  var isAdmin = u.role === 'admin';
  var h = '<div class="card" style="margin-bottom:14px"><div style="font-size:.78rem;color:var(--tx2);line-height:1.9">💾 از این بخش داده‌هات رو دانلود یا بازیابی کن.</div></div>';
  h += '<div class="sh">📦 بکاپ کامل</div>';
  h += '<button class="btn primary full" style="margin-bottom:8px;justify-content:flex-start;padding:14px" onclick="exportUserData(\'' + u.id + '\',\'' + u.username + '\')"><span style="font-size:1.2rem">💾</span><div style="flex:1;text-align:right"><div style="font-weight:800">دانلود بکاپ</div></div></button>';
  h += '<button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="importUserData(\'' + u.id + '\')"><span style="font-size:1.2rem">📥</span><div style="flex:1;text-align:right"><div style="font-weight:800">بازیابی</div></div></button>';
  h += '<div class="sh">📊 CSV</div>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportWorkoutCSV()"><span style="font-size:1.1rem">🏋️</span><span style="flex:1;text-align:right;font-size:.82rem">سابقه تمرینات</span></button>';
  h += '<button class="btn full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportNutritionCSV()"><span style="font-size:1.1rem">🥗</span><span style="flex:1;text-align:right;font-size:.82rem">برنامه غذایی</span></button>';
  h += '<button class="btn full" style="margin-bottom:14px;justify-content:flex-start;padding:12px" onclick="exportBodyCSV()"><span style="font-size:1.1rem">📏</span><span style="flex:1;text-align:right;font-size:.82rem">اندازه‌های بدن</span></button>';
  h += '<div class="sh">🖨️ PDF</div>';
  h += '<button class="btn success full" style="margin-bottom:14px;justify-content:flex-start;padding:14px" onclick="printReport(\'' + u.id + '\')"><span style="font-size:1.2rem">📄</span><div style="flex:1;text-align:right"><div style="font-weight:800">گزارش کامل</div></div></button>';
  if (isAdmin) {
    h += '<div class="sh">👑 مدیر</div>';
    h += '<button class="btn admin full" style="margin-bottom:6px;justify-content:flex-start;padding:12px" onclick="exportAllUsersBackup()"><span style="font-size:1.1rem">👥</span><div style="flex:1;text-align:right"><div style="font-weight:800;font-size:.82rem">بکاپ همه کاربران</div></div></button>';
  }
  el.innerHTML = h;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
};

/* ============================================================
   CSV + Backups
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
    window.toast('آماده‌سازی...', 'info');
    var d = await window.api('GET', '/api/users/' + userId + '/data');
    var backup = { _meta: { type: 'profit-user-backup', version: '1.0', exportedAt: new Date().toISOString(), userId: userId, username: username }, data: d };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'profit-backup-' + (username || userId) + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportWorkoutCSV = async function() {
  try {
    var u = window.state.user;
    var d = await window.api('GET', '/api/users/' + u.id + '/data');
    var workout = d.workout || { logs: {}, completed: {} };
    var history = d.history || {};
    var rows = [['تاریخ', 'شماره', 'ست', 'وزنه', 'تکرار', 'حجم']];
    Object.keys(workout.logs || {}).sort().forEach(function(key) {
      var parts = key.split(':');
      var logs = workout.logs[key] || {};
      Object.keys(logs).forEach(function(si) {
        var l = logs[si] || {};
        var v = (l.weight && l.reps) ? l.weight * l.reps : 0;
        rows.push([parts[0], parseInt(parts[1]) + 1, parseInt(si) + 1, l.weight || '', l.reps || '', v]);
      });
    });
    downloadCSV('workout-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportNutritionCSV = async function() {
  try {
    var u = window.state.user;
    var d = await window.api('GET', '/api/users/' + u.id + '/data');
    var nut = d.nutrition || {};
    var NUT = window.NUT || {};
    var foods = NUT.foods || [];
    var rows = [['وعده', 'غذا', 'مقدار', 'واحد', 'کالری', 'پروتئین', 'کرب', 'چربی']];
    (NUT.meals || []).forEach(function(meal) {
      var items = (nut.meals && nut.meals[meal.key]) || [];
      items.forEach(function(it) {
        var f = foods.find(function(x) { return x.id === it.foodId; });
        if (!f) return;
        var unit = (f.units && f.units[it.unitIdx || 0]) || { n: 'گرم', g: 1 };
        var k = ((it.qty || 0) * unit.g) / 100;
        rows.push([meal.name, f.name, it.qty, unit.n, Math.round((f.cal || 0) * k), Math.round((f.prot || 0) * k * 10) / 10, Math.round((f.carb || 0) * k * 10) / 10, Math.round((f.fat || 0) * k * 10) / 10]);
      });
    });
    downloadCSV('nutrition-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
    window.toast('دانلود شد ✓');
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
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.exportAllUsersBackup = async function() {
  try {
    window.toast('آماده‌سازی...', 'info');
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
    a.href = url; a.download = 'profit-full-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.toast('دانلود شد ✓');
  } catch (e) { window.toast('خطا: ' + e.message, 'error'); }
};

window.importUserData = function(userId) {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
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
   HELP + TOOLBAR
   ============================================================ */
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
    drawer.innerHTML = '<div class="drawer-header"><h2>📚 راهنما</h2><button class="close-btn" onclick="closeDrawer(\'helpDrawer\')">✕</button></div><div class="drawer-body"><div style="text-align:center;padding:20px"><div style="font-size:3rem">📚</div><div style="font-weight:800;margin-top:10px">راهنما</div><div style="color:var(--tx2);margin-top:8px;line-height:1.9;font-size:.82rem">از تب‌های بالا استفاده کن. سؤالی داری؟ از دکمه «خروجی» یه گزارش PDF بگیر و برای مربی‌ات بفرست.</div></div></div>';
    document.body.appendChild(drawer);
  }
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
};

function addToolbarButtons() {
  try {
    var tb = document.getElementById('toolbar');
    if (!tb) return;
    if (!document.getElementById('helpToolbarBtn')) {
      var b1 = document.createElement('button');
      b1.id = 'helpToolbarBtn'; b1.className = 'btn';
      b1.innerHTML = '<span>❓</span> راهنما';
      b1.onclick = function() { window.openHelpDrawer(); };
      tb.appendChild(b1);
    }
    if (!document.getElementById('expToolbarBtn')) {
      var b2 = document.createElement('button');
      b2.id = 'expToolbarBtn'; b2.className = 'btn';
      b2.innerHTML = '<span>📤</span> خروجی';
      b2.onclick = function() { window.openExportDrawer(); };
      tb.appendChild(b2);
    }
  } catch(e) {}
}

document.addEventListener('keydown', function(e) {
  var t = e.target.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  if (e.ctrlKey && e.key === 'h') { e.preventDefault(); window.openHelpDrawer(); }
  if (e.ctrlKey && e.key === 'e') { e.preventDefault(); window.openExportDrawer(); }
});

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else setTimeout(fn, 0);
}

ready(function() {
  console.log('✅ [Extras v1.8] Ready');
  setInterval(addToolbarButtons, 800);
  setTimeout(addToolbarButtons, 500);
  setTimeout(addToolbarButtons, 1500);
});

console.log('✨ [Extras v1.8] Loaded');

})();
