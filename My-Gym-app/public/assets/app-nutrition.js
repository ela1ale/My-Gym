/* ============================================================
   app-nutrition.js — تغذیه، مکمل، اندازه‌های بدن
   (همان کد ماژول تغذیه/مکمل/اندازه‌های بدن از فایل اصلی)
   ============================================================ */

let nutritionData = null;
let currentFoodMeal = null;
let currentFoodCat = 'all';
let editingSuppIdx = null;

function getNutritionKey(){ return NUTRITION_KEY_PREFIX + currentUserId; }
function defaultNutritionData(){
  return {
    profile: { gender:'male', age:30, weight:75, height:175, activity:1.55, goal:'maintain', bodyfat:20, formula:'mifflin' },
    targets: null,
    meals: { breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] },
    supplements: [], suppGoalUsed: null
  };
}

function loadNutritionData(){
  try{
    const raw = localStorage.getItem(getNutritionKey());
    nutritionData = raw ? JSON.parse(raw) : defaultNutritionData();
    if(!nutritionData.meals) nutritionData.meals = { breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] };
    if(!nutritionData.supplements) nutritionData.supplements = [];
    if(!nutritionData.profile) nutritionData.profile = defaultNutritionData().profile;
    if(!nutritionData.profile.formula) nutritionData.profile.formula = 'mifflin';
    if(nutritionData.profile.bodyfat == null) nutritionData.profile.bodyfat = 20;
  }catch(e){ nutritionData = defaultNutritionData(); }
}
function saveNutritionData(){ try{ localStorage.setItem(getNutritionKey(), JSON.stringify(nutritionData)); }catch(e){} }
function initNutrition(){ loadNutritionData(); }

function openNutritionDrawer(){
  if(!nutritionData) loadNutritionData();
  renderCalcTab(); renderPlanTab(); renderSupplements();
  document.getElementById('nutritionBackdrop').classList.add('open');
  document.getElementById('nutritionDrawer').classList.add('open');
}
function closeNutritionDrawer(){
  document.getElementById('nutritionBackdrop').classList.remove('open');
  document.getElementById('nutritionDrawer').classList.remove('open');
}
function switchNutritionTab(tab){
  document.querySelectorAll('.drawer-tab[data-ntab]').forEach(t=>t.classList.toggle('active', t.dataset.ntab === tab));
  document.getElementById('ntab-calc').classList.toggle('active', tab === 'calc');
  document.getElementById('ntab-plan').classList.toggle('active', tab === 'plan');
  document.getElementById('ntab-supp').classList.toggle('active', tab === 'supp');
  if(tab === 'plan') renderPlanTab();
  if(tab === 'supp') renderSupplements();
  if(tab === 'calc') renderCalcTab();
}

function calcBMR_Mifflin(p){ const base = 10*p.weight + 6.25*p.height - 5*p.age; return p.gender === 'male' ? base + 5 : base - 161; }
function calcBMR_Harris(p){ if(p.gender === 'male') return 88.362 + 13.397*p.weight + 4.799*p.height - 5.677*p.age; return 447.593 + 9.247*p.weight + 3.098*p.height - 4.330*p.age; }
function calcBMR_Katch(p){ const lbm = p.weight * (1 - (p.bodyfat || 20)/100); return 370 + 21.6 * lbm; }
function calcBMR_Cunningham(p){ const lbm = p.weight * (1 - (p.bodyfat || 20)/100); return 500 + 22 * lbm; }
function calcBMR(p){
  switch(p.formula){
    case 'harris': return calcBMR_Harris(p);
    case 'katch': return calcBMR_Katch(p);
    case 'cunningham': return calcBMR_Cunningham(p);
    case 'mifflin': default: return calcBMR_Mifflin(p);
  }
}
function calcTDEE(p){ return calcBMR(p) * p.activity; }
function goalAdjust(tdee, goal){
  switch(goal){
    case 'lose': return Math.round(tdee * 0.80);
    case 'cut': return Math.round(tdee * 0.85);
    case 'gain': return Math.round(tdee * 1.15);
    case 'bulk': return Math.round(tdee * 1.20);
    default: return Math.round(tdee);
  }
}
function calcMacros(calories, goal){
  const p = nutritionData.profile;
  let protPerKg = 1.8;
  if(goal === 'lose' || goal === 'cut') protPerKg = 2.2;
  if(goal === 'gain' || goal === 'bulk') protPerKg = 2.0;
  const protein = Math.round(p.weight * protPerKg);
  const proteinCal = protein * 4;
  let fatPct = 0.25;
  if(goal === 'lose') fatPct = 0.30;
  if(goal === 'bulk') fatPct = 0.22;
  const fat = Math.round((calories * fatPct) / 9);
  const fatCal = fat * 9;
  const carbs = Math.max(0, Math.round((calories - proteinCal - fatCal) / 4));
  return { protein, carbs, fat };
}
function onFormulaChange(){
  const f = document.getElementById('npFormula').value;
  const info = BMR_FORMULAS[f]; if(!info) return;
  const bfRow = document.getElementById('bodyfatRow');
  if(bfRow) bfRow.style.display = info.needsBodyfat ? 'grid' : 'none';
  const box = document.getElementById('formulaInfoBox');
  if(box){
    let formulaTxt = '';
    if(!info.isManual){
      if(f === 'katch' || f === 'cunningham'){
        formulaTxt = `<code>${info.male}</code><br><small>LBM = وزن × (۱ − درصد چربی ÷ ۱۰۰)</small>`;
      } else {
        formulaTxt = `<div><strong>مرد:</strong> <code>${info.male}</code></div>
          <div style="margin-top:5px"><strong>زن:</strong> <code>${info.female}</code></div>
          <small style="display:block;margin-top:6px">W=وزن(kg) · H=قد(cm) · A=سن</small>`;
      }
    } else {
      formulaTxt = '<small>در حالت دستی، مقادیر را خودتان وارد کنید.</small>';
    }
    box.innerHTML = `<strong>📐 ${info.name}</strong><br>${info.desc}<div style="margin-top:8px">${formulaTxt}</div>`;
  }
}
function calculateAndSaveNutrition(){
  const f = document.getElementById('npFormula').value;
  const p = {
    gender: document.getElementById('npGender').value,
    age: parseInt(document.getElementById('npAge').value) || 30,
    weight: parseFloat(document.getElementById('npWeight').value) || 75,
    height: parseFloat(document.getElementById('npHeight').value) || 175,
    activity: parseFloat(document.getElementById('npActivity').value) || 1.55,
    goal: document.getElementById('npGoal').value || 'maintain',
    bodyfat: parseFloat(document.getElementById('npBodyfat').value) || 20,
    formula: f
  };
  nutritionData.profile = p;
  let targets;
  if(f === 'manual'){
    targets = { bmr: 0, tdee: 0, calories: 2000, protein: 150, carbs: 200, fat: 67, manual: true, formula: 'manual' };
  } else {
    const bmr = Math.round(calcBMR(p));
    const tdee = Math.round(calcTDEE(p));
    const target = goalAdjust(tdee, p.goal);
    const macros = calcMacros(target, p.goal);
    targets = { bmr, tdee, calories: target, ...macros, manual: false, formula: f };
  }
  nutritionData.targets = targets;
  saveNutritionData();
  renderCalcResults(); renderPlanTab();
  showToast('محاسبه و ذخیره شد ✓', 'success');
}
function renderCalcTab(){
  if(!nutritionData) return;
  const p = nutritionData.profile;
  document.getElementById('npGender').value = p.gender;
  document.getElementById('npAge').value = p.age;
  document.getElementById('npWeight').value = p.weight;
  document.getElementById('npHeight').value = p.height;
  document.getElementById('npActivity').value = String(p.activity);
  document.getElementById('npGoal').value = p.goal;
  document.getElementById('npBodyfat').value = p.bodyfat || 20;
  document.getElementById('npFormula').value = p.formula || 'mifflin';
  onFormulaChange();
  renderCalcResults();
}
function renderCalcResults(){
  const wrap = document.getElementById('calcResultsWrap'); if(!wrap) return;
  const t = nutritionData.targets;
  if(!t){ wrap.innerHTML = ''; return; }
  const goalLabels = { lose:'کاهش وزن', cut:'خشک کردن', maintain:'حفظ وزن', gain:'عضله‌سازی', bulk:'افزایش حجم' };
  const formulaLabels = { mifflin:'Mifflin-St Jeor', harris:'Harris-Benedict', katch:'Katch-McArdle', cunningham:'Cunningham', manual:'ورود دستی' };
  const formulaUsed = t.formula || 'mifflin';
  wrap.innerHTML = `
    <div class="calc-card">
      <div class="section-title-nut">🎯 نتایج — هدف: ${goalLabels[nutritionData.profile.goal]}</div>
      <div class="formula-info" style="margin-bottom:12px">📐 فرمول: <strong>${formulaLabels[formulaUsed]}</strong>${t.manual?' (دستی)':''}</div>
      <div class="calc-result-row">
        <div class="calc-result-item"><div class="crv">${formatNum(t.bmr)}</div><div class="crl">BMR</div></div>
        <div class="calc-result-item"><div class="crv">${formatNum(t.tdee)}</div><div class="crl">TDEE</div></div>
      </div>
      <div class="calc-result-item highlight" style="margin-bottom:12px">
        <div class="crv">${formatNum(t.calories)}</div>
        <div class="crl">کالری هدف (kcal/روز)</div>
      </div>
      <div class="section-title-nut" style="margin-top:14px">📊 درشت‌مغذی‌ها</div>
      <div class="macro-bars">
        <div class="macro-bar-row"><span class="macro-bar-label">پروتئین</span>
          <div class="macro-bar-track"><div class="macro-bar-fill prot" style="width:${Math.min(100,(t.protein*4/t.calories)*100)}%"></div></div>
          <span class="macro-bar-val">${formatNum(t.protein)}g</span></div>
        <div class="macro-bar-row"><span class="macro-bar-label">کربوهیدرات</span>
          <div class="macro-bar-track"><div class="macro-bar-fill carb" style="width:${Math.min(100,(t.carbs*4/t.calories)*100)}%"></div></div>
          <span class="macro-bar-val">${formatNum(t.carbs)}g</span></div>
        <div class="macro-bar-row"><span class="macro-bar-label">چربی</span>
          <div class="macro-bar-track"><div class="macro-bar-fill fat" style="width:${Math.min(100,(t.fat*9/t.calories)*100)}%"></div></div>
          <span class="macro-bar-val">${formatNum(t.fat)}g</span></div>
      </div>
      <div class="manual-edit-box">
        <div class="me-title">✏️ ویرایش دستی مقادیر</div>
        <div class="manual-edit-grid">
          <div class="manual-input-group"><label>BMR (kcal)</label><input type="number" id="editBmr" value="${t.bmr||0}" min="0"></div>
          <div class="manual-input-group"><label>TDEE (kcal)</label><input type="number" id="editTdee" value="${t.tdee||0}" min="0"></div>
          <div class="manual-input-group"><label>کالری هدف</label><input type="number" id="editCalories" value="${t.calories}" min="0"></div>
          <div class="manual-input-group"><label>پروتئین (g)</label><input type="number" id="editProtein" value="${t.protein}" min="0"></div>
          <div class="manual-input-group"><label>کربوهیدرات (g)</label><input type="number" id="editCarbs" value="${t.carbs}" min="0"></div>
          <div class="manual-input-group"><label>چربی (g)</label><input type="number" id="editFat" value="${t.fat}" min="0"></div>
        </div>
        <div class="manual-edit-actions">
          <button class="mini-btn" onclick="applyManualEdit()">💾 اعمال تغییرات</button>
          <button class="mini-btn" onclick="resetToCalculated()">↺ بازگشت به فرمول</button>
        </div>
      </div>
    </div>`;
}
function applyManualEdit(){
  const t = nutritionData.targets; if(!t) return;
  t.bmr = parseInt(document.getElementById('editBmr').value) || 0;
  t.tdee = parseInt(document.getElementById('editTdee').value) || 0;
  t.calories = parseInt(document.getElementById('editCalories').value) || 2000;
  t.protein = parseInt(document.getElementById('editProtein').value) || 0;
  t.carbs = parseInt(document.getElementById('editCarbs').value) || 0;
  t.fat = parseInt(document.getElementById('editFat').value) || 0;
  t.manual = true;
  saveNutritionData(); renderCalcResults(); renderPlanTab();
  showToast('مقادیر ویرایش شد ✓', 'success');
}
function resetToCalculated(){
  const p = nutritionData.profile;
  if(p.formula === 'manual'){ showToast('ابتدا یک فرمول انتخاب کنید', 'warn'); return; }
  const bmr = Math.round(calcBMR(p));
  const tdee = Math.round(calcTDEE(p));
  const target = goalAdjust(tdee, p.goal);
  const macros = calcMacros(target, p.goal);
  nutritionData.targets = { bmr, tdee, calories: target, ...macros, manual: false, formula: p.formula };
  saveNutritionData(); renderCalcResults(); renderPlanTab();
  showToast('بازگشت به فرمول ✓', 'info');
}

/* --- Food helpers --- */
function getFoodById(id){ return FOOD_DB.find(f=>f.id===id) || null; }
function getFoodUnit(food, unitIdx){
  if(!food.units || food.units.length === 0) return { n:'گرم', g:1 };
  const idx = (unitIdx != null && unitIdx >= 0 && unitIdx < food.units.length) ? unitIdx : 0;
  return food.units[idx];
}
function getItemGrams(it){ const f = getFoodById(it.foodId); if(!f) return 0; const u = getFoodUnit(f, it.unitIdx || 0); return it.qty * u.g; }
function getItemMacros(it){
  const f = getFoodById(it.foodId); if(!f) return { cal:0, prot:0, carb:0, fat:0, grams:0 };
  const grams = getItemGrams(it);
  const k = grams / 100;
  return { cal: f.cal*k, prot: f.prot*k, carb: f.carb*k, fat: f.fat*k, grams };
}
function calcMealTotals(mealKey){
  const items = nutritionData.meals[mealKey] || [];
  let cal=0, prot=0, carb=0, fat=0;
  items.forEach(it=>{ const m = getItemMacros(it); cal += m.cal; prot += m.prot; carb += m.carb; fat += m.fat; });
  return { cal:Math.round(cal), prot:Math.round(prot*10)/10, carb:Math.round(carb*10)/10, fat:Math.round(fat*10)/10 };
}
function renderPlanTab(){
  if(!nutritionData) return;
  const summaryEl = document.getElementById('planSummaryWrap');
  const listEl = document.getElementById('mealsListWrap');
  if(!listEl) return;
  const t = nutritionData.targets;
  if(!t){
    summaryEl.innerHTML = '<div class="empty-state" style="padding:20px"><div class="icon">🧮</div><div>ابتدا در تب «کالری» هدف خود را محاسبه کنید</div></div>';
    listEl.innerHTML = ''; return;
  }
  const dayTotals = MEAL_CONFIG.reduce((acc,m)=>{
    const tt = calcMealTotals(m.key);
    acc.cal += tt.cal; acc.prot += tt.prot; acc.carb += tt.carb; acc.fat += tt.fat;
    return acc;
  }, {cal:0, prot:0, carb:0, fat:0});
  const calDiff = dayTotals.cal - t.calories;
  summaryEl.innerHTML = `
    <div class="nutrition-summary">
      <div class="ns-item"><div class="ns-val">${formatNum(dayTotals.cal)}</div><div class="ns-lbl">جمع کالری</div></div>
      <div class="ns-item"><div class="ns-val">${formatNum(Math.round(dayTotals.prot))}g</div><div class="ns-lbl">پروتئین</div></div>
      <div class="ns-item"><div class="ns-val">${formatNum(Math.round(dayTotals.carb))}g</div><div class="ns-lbl">کرب</div></div>
      <div class="ns-item"><div class="ns-val">${formatNum(Math.round(dayTotals.fat))}g</div><div class="ns-lbl">چربی</div></div>
    </div>
    <div style="font-size:.76rem;font-weight:700;text-align:center;margin-bottom:12px;color:${Math.abs(calDiff)<50?'var(--accent-green)':(calDiff>0?'var(--accent-rose)':'var(--accent-amber)')}">
      هدف: ${formatNum(t.calories)} kcal — اختلاف: ${formatNum(Math.abs(calDiff))} kcal ${calDiff>=0?'بیشتر':'کمتر'}
    </div>`;
  listEl.innerHTML = MEAL_CONFIG.map(meal=>{
    const items = nutritionData.meals[meal.key] || [];
    const mealTarget = Math.round(t.calories * meal.pct);
    const totals = calcMealTotals(meal.key);
    const diff = totals.cal - mealTarget;
    const state = items.length === 0 ? 'under' : (Math.abs(diff) < mealTarget*0.1 ? 'ok' : (diff > 0 ? 'over' : 'under'));
    const itemsHtml = items.length === 0
      ? `<div class="meal-empty">هنوز غذایی اضافه نشده</div>`
      : items.map((it, idx)=>{
          const f = getFoodById(it.foodId); if(!f) return '';
          const m = getItemMacros(it);
          const uIdx = it.unitIdx || 0;
          const unitOptions = (f.units || [{n:'گرم',g:1}]).map((u,i)=>`<option value="${i}" ${i===uIdx?'selected':''}>${u.n}</option>`).join('');
          return `<div class="meal-item">
            <div class="mi-emoji">${f.emoji}</div>
            <div class="mi-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
            <div class="mi-unit-wrap">
              <input type="number" class="mi-qty" value="${it.qty}" min="0.1" max="2000" step="0.5" onchange="updateFoodQty('${meal.key}',${idx},this.value)">
              <select class="mi-unit" onchange="updateFoodUnit('${meal.key}',${idx},this.value)">${unitOptions}</select>
            </div>
            <div class="mi-cal">${formatNum(Math.round(m.cal))}<small>kcal</small></div>
            <div class="mi-cal" style="color:var(--accent-blue)">${formatNum(Math.round(m.grams))}<small>گرم</small></div>
            <button class="mi-del" onclick="removeFoodFromMeal('${meal.key}',${idx})">✕</button>
          </div>`;
        }).join('');
    return `<div class="meal-section">
      <div class="meal-header">
        <div class="mh-left"><span class="mh-icon">${meal.emoji}</span>
          <div><div class="mh-name">${meal.name}</div>
          <div class="mh-target">هدف: ${formatNum(mealTarget)} kcal — مجموع: ${formatNum(totals.cal)}</div></div>
        </div>
        <span class="mh-total ${state}">${formatNum(totals.cal)} kcal</span>
      </div>
      <div class="meal-body">${itemsHtml}</div>
      <div class="meal-actions">
        <button class="mini-btn" onclick="openFoodPicker('${meal.key}')">➕ افزودن غذا</button>
        ${items.length>0?`<button class="mini-btn" onclick="clearMeal('${meal.key}')">🗑️ پاک کردن وعده</button>`:''}
      </div>
    </div>`;
  }).join('');
}
function updateFoodQty(mealKey, idx, val){
  const q = Math.max(0.1, Math.min(2000, parseFloat(val) || 100));
  if(!nutritionData.meals[mealKey] || !nutritionData.meals[mealKey][idx]) return;
  nutritionData.meals[mealKey][idx].qty = q;
  saveNutritionData(); renderPlanTab();
}
function updateFoodUnit(mealKey, idx, val){
  const uIdx = parseInt(val) || 0;
  if(!nutritionData.meals[mealKey] || !nutritionData.meals[mealKey][idx]) return;
  nutritionData.meals[mealKey][idx].unitIdx = uIdx;
  saveNutritionData(); renderPlanTab();
}
function removeFoodFromMeal(mealKey, idx){
  if(!nutritionData.meals[mealKey]) return;
  nutritionData.meals[mealKey].splice(idx, 1);
  saveNutritionData(); renderPlanTab();
}
function clearMeal(mealKey){
  if(!confirm('این وعده پاک شود؟')) return;
  nutritionData.meals[mealKey] = [];
  saveNutritionData(); renderPlanTab();
}
function clearMealPlan(){
  if(!confirm('کل برنامه غذایی پاک شود؟')) return;
  nutritionData.meals = { breakfast:[], snack1:[], lunch:[], snack2:[], dinner:[] };
  saveNutritionData(); renderPlanTab();
  showToast('برنامه پاک شد', 'info');
}
function generateSamplePlan(){
  const t = nutritionData.targets;
  if(!t){ showToast('ابتدا کالری را محاسبه کنید', 'warn'); return; }
  const templates = {
    breakfast: { p:'egg_whole', c:'oat', f:'almond', fr:'banana' },
    snack1:    { f:'almond', fr:'apple' },
    lunch:     { p:'chicken_breast', c:'rice_white', f:'olive_oil', v:'broccoli' },
    snack2:    { p:'yogurt_low', f:'walnut' },
    dinner:    { p:'salmon', c:'sweet_potato', f:'olive_oil', v:'spinach' }
  };
  const newMeals = {};
  MEAL_CONFIG.forEach(meal=>{
    const tpl = templates[meal.key];
    const mealCalories = t.calories * meal.pct;
    const mealProt = t.protein * meal.pct;
    const mealCarb = t.carbs * meal.pct;
    const mealFat  = t.fat * meal.pct;
    const arr = [];
    if(tpl.p){
      const f = getFoodById(tpl.p);
      if(f && f.prot > 0){
        const grams = Math.max(30, Math.min(350, Math.round(mealProt * 0.8 * 100 / f.prot)));
        const entry = { foodId:f.id, qty: grams, unitIdx: 0 };
        if(f.id === 'egg_whole'){ entry.qty = Math.max(1, Math.round(grams/50)); entry.unitIdx = 2; }
        arr.push(entry);
      }
    }
    if(tpl.c){
      const f = getFoodById(tpl.c);
      if(f && f.carb > 0){
        const grams = Math.max(20, Math.min(400, Math.round(mealCarb * 0.8 * 100 / f.carb)));
        arr.push({ foodId:f.id, qty: grams, unitIdx: 0 });
      }
    }
    if(tpl.f){
      const f = getFoodById(tpl.f);
      if(f && f.fat > 0){
        const grams = Math.max(4, Math.min(80, Math.round(mealFat * 0.6 * 100 / f.fat)));
        arr.push({ foodId:f.id, qty: grams, unitIdx: 0 });
      }
    }
    if(tpl.v) arr.push({ foodId:tpl.v, qty:120, unitIdx:0 });
    if(tpl.fr) arr.push({ foodId:tpl.fr, qty:100, unitIdx:0 });
    let actualCal = 0;
    arr.forEach(it=>{ const f = getFoodById(it.foodId); if(f) actualCal += f.cal * getItemGrams(it) / 100; });
    if(actualCal > 0 && Math.abs(actualCal - mealCalories) > mealCalories * 0.03){
      const ratio = mealCalories / actualCal;
      arr.forEach((it, i)=>{
        const f = getFoodById(it.foodId); if(!f) return;
        if(f.cat === 'veg') return;
        const u = getFoodUnit(f, it.unitIdx);
        let newQty = it.qty * ratio;
        let minQ = 3;
        if(f.cat === 'protein') minQ = 30;
        else if(f.cat === 'carb') minQ = 15;
        else if(f.cat === 'fat') minQ = 3;
        else if(f.cat === 'fruit') minQ = 40;
        else if(f.cat === 'dairy') minQ = 40;
        else if(f.cat === 'nut') minQ = 5;
        newQty = Math.max(minQ, Math.min(600, newQty));
        if(u.n.includes('عدد')) arr[i].qty = Math.max(1, Math.round(newQty));
        else arr[i].qty = Math.round(newQty);
      });
    }
    newMeals[meal.key] = arr;
  });
  nutritionData.meals = newMeals;
  saveNutritionData(); renderPlanTab();
  showToast('برنامه نمونه تولید شد ✓', 'success');
}

/* --- Food picker --- */
function openFoodPicker(mealKey){
  currentFoodMeal = mealKey;
  currentFoodCat = 'all';
  const meal = MEAL_CONFIG.find(m=>m.key===mealKey);
  document.getElementById('foodPickerTitle').textContent = `🍎 افزودن به ${meal ? meal.name : ''}`;
  document.getElementById('foodSearchInput').value = '';
  renderFoodCatTabs();
  renderFoodPickerList();
  document.getElementById('foodPickerBackdrop').classList.add('open');
  document.getElementById('foodPickerDrawer').classList.add('open');
}
function closeFoodPicker(){
  document.getElementById('foodPickerBackdrop').classList.remove('open');
  document.getElementById('foodPickerDrawer').classList.remove('open');
  currentFoodMeal = null;
}
function renderFoodCatTabs(){
  const c = document.getElementById('foodCatTabs'); if(!c) return;
  let h = `<button class="food-cat-tab active" onclick="setFoodCat('all',this)">🌐 همه</button>`;
  Object.keys(FOOD_CATS).forEach(k=>{
    const count = FOOD_DB.filter(f=>f.cat===k).length;
    h += `<button class="food-cat-tab" onclick="setFoodCat('${k}',this)">${FOOD_CATS[k].emoji} ${FOOD_CATS[k].name} (${count})</button>`;
  });
  c.innerHTML = h;
}
function setFoodCat(cat, btn){
  currentFoodCat = cat;
  document.querySelectorAll('#foodCatTabs .food-cat-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderFoodPickerList();
}
function renderFoodPickerList(){
  const list = document.getElementById('foodPickerList'); if(!list) return;
  const term = (document.getElementById('foodSearchInput').value || '').trim().toLowerCase();
  let foods = FOOD_DB.slice();
  if(currentFoodCat !== 'all') foods = foods.filter(f=>f.cat === currentFoodCat);
  if(term) foods = foods.filter(f=>f.name.toLowerCase().includes(term) || f.id.includes(term));
  if(foods.length === 0){ list.innerHTML = '<div class="empty-state" style="padding:20px"><div class="icon">🔍</div><div>غذایی یافت نشد</div></div>'; return; }
  list.innerHTML = foods.map(f=>{
    const mainUnit = f.units && f.units[0] ? f.units[0].n : 'گرم';
    return `<div class="food-item" onclick="addFoodToMeal('${f.id}')">
      <div class="fi-emoji">${f.emoji}</div>
      <div class="fi-info">
        <div class="fi-name">${escapeHtml(f.name)}</div>
        <div class="fi-macros">P:${f.prot} C:${f.carb} F:${f.fat} (per 100g) · ${mainUnit}</div>
      </div>
      <div class="fi-cal">${f.cal} kcal<small>در ۱۰۰ گرم</small></div>
    </div>`;
  }).join('');
}
function pickDefaultFoodEntry(food){
  const units = food.units || [{n:'گرم',g:1}];
  if(units.length <= 1) return { qty: defaultGramsForCat(food.cat), unitIdx: 0 };
  const pri1 = ['عدد متوسط'];
  const pri2 = ['عدد', 'برش', 'پرس', 'سیخ', 'کاسه', 'لیوان', 'قوطی', 'فنجان', 'استکان', 'فیله'];
  const pri3 = ['اسکوپ', 'حبه', 'مربع', 'دسته', 'ساقه', 'بلال', 'مکعب'];
  const pri4 = ['قاشق غذاخوری', 'قاشق چای‌خوری'];
  const pri5 = ['مشت', 'پیمانه', 'کفگیر'];
  for(const list of [pri1, pri2, pri3, pri4, pri5]){
    for(let i=0; i<units.length; i++){
      if(list.some(kw => units[i].n.includes(kw))){
        let qty = 1;
        if(units[i].n.includes('حبه')) qty = 1;
        else if(units[i].n.includes('مکعب')) qty = 2;
        return { qty, unitIdx: i };
      }
    }
  }
  return { qty: defaultGramsForCat(food.cat), unitIdx: 0 };
}
function defaultGramsForCat(cat){
  switch(cat){
    case 'protein': return 150; case 'carb': return 100; case 'fat': return 15;
    case 'nut': return 15; case 'dairy': return 200; case 'fruit': return 120;
    case 'veg': return 100; case 'iranian': return 200; case 'drink': return 240;
    case 'sweet': return 30; default: return 100;
  }
}
function addFoodToMeal(foodId){
  if(!currentFoodMeal) return;
  const f = getFoodById(foodId); if(!f) return;
  const def = pickDefaultFoodEntry(f);
  nutritionData.meals[currentFoodMeal].push({ foodId, qty: def.qty, unitIdx: def.unitIdx });
  saveNutritionData();
  const unitName = getFoodUnit(f, def.unitIdx).n;
  showToast(`✓ ${f.name} — ${formatNum(def.qty)} ${unitName}`, 'success', 1800);
  closeFoodPicker();
  renderPlanTab();
}

/* --- Supplements --- */
function renderSupplements(){
  if(!nutritionData) return;
  const wrap = document.getElementById('suppListWrap'); if(!wrap) return;
  const goal = nutritionData.profile.goal || 'maintain';
  const goalKey = (goal === 'cut') ? 'cut' : (goal === 'lose') ? 'lose' : (goal === 'gain') ? 'gain' : (goal === 'bulk') ? 'bulk' : 'maintain';
  if(nutritionData.supplements.length === 0 || nutritionData.suppGoalUsed !== goalKey){
    const recs = SUPPLEMENT_DB[goalKey] || SUPPLEMENT_DB.maintain;
    nutritionData.supplements = recs.map((s,i)=>({ id: 'sup_' + Date.now() + '_' + i, name: s.name, dose: s.dose, timing: s.timing, note: s.note, enabled: true, custom: false }));
    nutritionData.suppGoalUsed = goalKey;
    saveNutritionData();
  }
  const goalLabels = { lose:'کاهش وزن', cut:'خشک کردن', maintain:'حفظ وزن', gain:'عضله‌سازی', bulk:'افزایش حجم' };
  wrap.innerHTML = `
    <div style="font-size:.78rem;color:var(--text-muted);font-weight:700;margin-bottom:10px;text-align:center">هدف فعلی: <strong style="color:var(--accent-green)">${goalLabels[goal]}</strong></div>
    <div class="quick-actions-row" style="margin-bottom:10px"><button class="btn" onclick="regenerateSupplements()">🔄 بازتولید پیشنهادها</button></div>
    ${nutritionData.supplements.map((s,i)=>`
      <div class="supp-card ${s.enabled?'on':''}">
        <button class="supp-toggle ${s.enabled?'on':''}" onclick="toggleSupp(${i})">${s.enabled?'✓':''}</button>
        <div class="supp-info">
          <div class="supp-name">${escapeHtml(s.name)}${s.custom?'<span class="supp-badge">سفارشی</span>':''}</div>
          <div class="supp-row">📏 دوز: <strong>${escapeHtml(s.dose||'—')}</strong></div>
          <div class="supp-row">🕐 زمان: <strong>${escapeHtml(s.timing||'—')}</strong></div>
          ${s.note?`<div class="supp-row">💡 ${escapeHtml(s.note)}</div>`:''}
        </div>
        <div class="supp-actions">
          <button class="supp-action-btn edit" onclick="showSuppForm(${i})" title="ویرایش">✏️</button>
          <button class="supp-action-btn del" onclick="removeSupp(${i})" title="حذف">🗑️</button>
        </div>
      </div>
    `).join('')}`;
}
function toggleSupp(idx){ const s = nutritionData.supplements[idx]; if(!s) return; s.enabled = !s.enabled; saveNutritionData(); renderSupplements(); }
function removeSupp(idx){ const s = nutritionData.supplements[idx]; if(!s) return; if(!confirm(`مکمل «${s.name}» حذف شود؟`)) return; nutritionData.supplements.splice(idx, 1); saveNutritionData(); renderSupplements(); }
function regenerateSupplements(){
  if(!confirm('پیشنهادها بر اساس هدف فعلی بازتولید شوند؟ (مکمل‌های سفارشی باقی می‌مانند)')) return;
  const customs = nutritionData.supplements.filter(s=>s.custom);
  const goal = nutritionData.profile.goal;
  const goalKey = (goal === 'cut') ? 'cut' : (goal === 'lose') ? 'lose' : (goal === 'gain') ? 'gain' : (goal === 'bulk') ? 'bulk' : 'maintain';
  const recs = SUPPLEMENT_DB[goalKey] || SUPPLEMENT_DB.maintain;
  nutritionData.supplements = [
    ...recs.map((s,i)=>({ id: 'sup_' + Date.now() + '_' + i, name: s.name, dose: s.dose, timing: s.timing, note: s.note, enabled: true, custom: false })),
    ...customs
  ];
  nutritionData.suppGoalUsed = goalKey;
  saveNutritionData(); renderSupplements();
  showToast('پیشنهادها بازتولید شد', 'success');
}
function showSuppForm(idx){
  editingSuppIdx = (idx != null) ? idx : null;
  const titleEl = document.getElementById('suppFormTitle');
  if(editingSuppIdx != null){
    const s = nutritionData.supplements[editingSuppIdx]; if(!s) return;
    titleEl.textContent = '✏️ ویرایش مکمل';
    document.getElementById('suppFormName').value = s.name;
    document.getElementById('suppFormDose').value = s.dose || '';
    document.getElementById('suppFormTiming').value = s.timing || '';
    document.getElementById('suppFormNote').value = s.note || '';
  } else {
    titleEl.textContent = '💊 افزودن مکمل سفارشی';
    document.getElementById('suppFormName').value = '';
    document.getElementById('suppFormDose').value = '';
    document.getElementById('suppFormTiming').value = '';
    document.getElementById('suppFormNote').value = '';
  }
  document.getElementById('suppFormBackdrop').classList.add('open');
  document.getElementById('suppFormDrawer').classList.add('open');
  setTimeout(()=>document.getElementById('suppFormName').focus(), 100);
}
function closeSuppForm(){
  editingSuppIdx = null;
  document.getElementById('suppFormBackdrop').classList.remove('open');
  document.getElementById('suppFormDrawer').classList.remove('open');
}
function saveSuppForm(){
  const name = document.getElementById('suppFormName').value.trim();
  if(!name){ showToast('نام مکمل را وارد کنید', 'warn'); return; }
  const dose = document.getElementById('suppFormDose').value.trim();
  const timing = document.getElementById('suppFormTiming').value.trim();
  const note = document.getElementById('suppFormNote').value.trim();
  if(editingSuppIdx != null){
    const s = nutritionData.supplements[editingSuppIdx];
    if(s){ s.name = name; s.dose = dose; s.timing = timing; s.note = note; }
    showToast('مکمل ویرایش شد ✓', 'success');
  } else {
    nutritionData.supplements.push({ id: 'sup_custom_' + Date.now(), name, dose, timing, note, enabled: true, custom: true });
    showToast('مکمل اضافه شد ✓', 'success');
  }
  saveNutritionData(); closeSuppForm(); renderSupplements();
}

/* --- Body measurements --- */
let bodyData = [];
let bodyChartInstance = null;
function getBodyKey(){ return BODY_KEY_PREFIX + currentUserId; }
function loadBodyData(){
  try{ const raw = localStorage.getItem(getBodyKey()); bodyData = raw ? JSON.parse(raw) : []; }
  catch(e){ bodyData = []; }
  if(!Array.isArray(bodyData)) bodyData = [];
}
function saveBodyData(){ try{ localStorage.setItem(getBodyKey(), JSON.stringify(bodyData)); }catch(e){} }
function initBmYearOptions(){
  const yearEl = document.getElementById('bmYear'); if(!yearEl) return;
  const todayJ = toJalali(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate());
  const curYear = todayJ[0];
  let html = '';
  for(let y = curYear - 10; y <= curYear + 1; y++){ html += `<option value="${y}">${y}</option>`; }
  yearEl.innerHTML = html;
  const monthEl = document.getElementById('bmMonth');
  if(monthEl){ monthEl.innerHTML = JALALI_MONTHS.map((m, i)=>`<option value="${i+1}">${m}</option>`).join(''); }
  const sel = document.getElementById('bmMetricSelect');
  if(sel) sel.innerHTML = BODY_METRICS.map(m=>`<option value="${m.key}">${m.emoji} ${m.name}</option>`).join('');
}
function updateBmDays(){
  const yearEl = document.getElementById('bmYear'); const monthEl = document.getElementById('bmMonth'); const dayEl = document.getElementById('bmDay');
  if(!yearEl || !monthEl || !dayEl) return;
  const jy = parseInt(yearEl.value); const jm = parseInt(monthEl.value);
  const days = jalaliMonthDays(jy, jm);
  const curVal = parseInt(dayEl.value) || 1;
  let html = '';
  for(let d = 1; d <= days; d++){ html += `<option value="${d}" ${d===curVal?'selected':''}>${d}</option>`; }
  dayEl.innerHTML = html;
}
function setBmDateToToday(){
  const todayJ = toJalali(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate());
  const yEl = document.getElementById('bmYear'); const mEl = document.getElementById('bmMonth'); const dEl = document.getElementById('bmDay');
  if(!yEl || !mEl || !dEl) return;
  yEl.value = String(todayJ[0]); mEl.value = String(todayJ[1]);
  updateBmDays();
  dEl.value = String(todayJ[2]);
}
function openBodyDrawer(){
  if(!bodyData) loadBodyData();
  initBmYearOptions(); clearBodyForm(); renderBodyEntries(); updateBodyChart();
  document.getElementById('bodyBackdrop').classList.add('open');
  document.getElementById('bodyDrawer').classList.add('open');
}
function closeBodyDrawer(){
  document.getElementById('bodyBackdrop').classList.remove('open');
  document.getElementById('bodyDrawer').classList.remove('open');
}
function clearBodyForm(){
  setBmDateToToday();
  ['bmWeight','bmBodyfat','bmNeck','bmChest','bmWaist','bmHip','bmArm','bmForearm','bmThigh','bmCalf'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value = '';
  });
}
function saveBodyEntry(){
  const jy = parseInt(document.getElementById('bmYear').value) || 1400;
  const jm = parseInt(document.getElementById('bmMonth').value) || 1;
  const jd = parseInt(document.getElementById('bmDay').value) || 1;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const date = `${gy}-${String(gm).padStart(2,'0')}-${String(gd).padStart(2,'0')}`;
  const entry = { date };
  BODY_METRICS.forEach(m=>{
    const el = document.getElementById('bm' + m.key.charAt(0).toUpperCase() + m.key.slice(1));
    if(el){ const v = el.value.trim(); entry[m.key] = v === '' ? null : (parseFloat(v) || null); }
  });
  const hasValue = BODY_METRICS.some(m => entry[m.key] != null);
  if(!hasValue){ showToast('حداقل یک مقدار را وارد کنید', 'warn'); return; }
  const existingIdx = bodyData.findIndex(e => e.date === date);
  if(existingIdx !== -1){ bodyData[existingIdx] = entry; showToast('ثبت همان تاریخ بروزرسانی شد ✓', 'success'); }
  else { bodyData.push(entry); showToast('ثبت شد ✓', 'success'); }
  bodyData.sort((a,b)=> a.date.localeCompare(b.date));
  saveBodyData(); clearBodyForm(); renderBodyEntries(); updateBodyChart();
}
function removeBodyEntry(idx){
  if(!confirm('این ثبت حذف شود؟')) return;
  bodyData.splice(idx, 1);
  saveBodyData(); renderBodyEntries(); updateBodyChart();
}
function renderBodyEntries(){
  const list = document.getElementById('bodyEntriesList'); if(!list) return;
  if(bodyData.length === 0){
    list.innerHTML = '<div class="empty-state" style="padding:20px"><div class="icon">📏</div><div>هنوز اندازه‌ای ثبت نکرده‌اید</div></div>';
    return;
  }
  const sorted = [...bodyData].sort((a,b)=>b.date.localeCompare(a.date));
  list.innerHTML = sorted.map(e => {
    const realIdx = bodyData.findIndex(x=>x.date === e.date);
    const parts = BODY_METRICS.filter(m => e[m.key] != null).map(m =>
      `<span class="bm-chip">${m.emoji} ${m.name}: <strong>${formatNum(e[m.key])}${m.unit}</strong></span>`
    ).join('');
    const d = new Date(e.date);
    const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
    const dateStr = `${jd} ${JALALI_MONTHS[jm-1]} ${jy}`;
    return `<div class="bm-entry">
      <div class="bm-entry-header">
        <div class="bm-entry-date">📅 ${dateStr}</div>
        <button class="bm-entry-del" onclick="removeBodyEntry(${realIdx})">🗑️</button>
      </div>
      <div class="bm-entry-body">${parts}</div>
    </div>`;
  }).join('');
}
function updateBodyChart(){
  const metricKey = document.getElementById('bmMetricSelect').value;
  const metric = BODY_METRICS.find(m => m.key === metricKey);
  const canvas = document.getElementById('bodyChart'); if(!canvas || !metric) return;
  const ctx = canvas.getContext('2d');
  if(bodyChartInstance) bodyChartInstance.destroy();
  const sorted = bodyData.filter(e => e[metricKey] != null).sort((a,b) => a.date.localeCompare(b.date));
  const statsEl = document.getElementById('bodyStats');
  if(sorted.length === 0){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(statsEl) statsEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);grid-column:1/-1">هنوز داده‌ای برای این متریک ثبت نشده</div>';
    return;
  }
  const labels = sorted.map(e => {
    const d = new Date(e.date);
    const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
    return `${jd} ${JALALI_MONTHS[jm-1]}`;
  });
  const data = sorted.map(e => e[metricKey]);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(16,185,129,.35)');
  gradient.addColorStop(1, 'rgba(16,185,129,0)');
  bodyChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{
      label: `${metric.name} (${metric.unit})`,
      data, borderColor: '#10b981', backgroundColor: gradient,
      borderWidth: 2.5, tension: 0.35, fill: true,
      pointRadius: 5, pointHoverRadius: 7,
      pointBackgroundColor: '#10b981', pointBorderColor: '#fff', pointBorderWidth: 2
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        rtl: true, textDirection: 'rtl',
        backgroundColor: isDark ? '#1e293b' : '#fff',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        padding: 12, cornerRadius: 10,
        callbacks: { label: (ctx) => `${ctx.parsed.y} ${metric.unit}` }
      } },
      scales: {
        y: { grid: { color: isDark ? 'rgba(148,163,184,.08)' : 'rgba(148,163,184,.15)' },
          ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { family: 'Vazirmatn', size: 11 } } },
        x: { grid: { display: false },
          ticks: { color: isDark ? '#94a3b8' : '#475569', font: { family: 'Vazirmatn', size: 10 } } }
      }
    }
  });
  const first = data[0], last = data[data.length-1];
  const diff = last - first;
  const min = Math.min(...data);
  const max = Math.max(...data);
  if(statsEl){
    const diffColor = diff > 0 ? 'var(--accent-rose)' : (diff < 0 ? 'var(--accent-green)' : 'var(--text-muted)');
    const diffSign = diff > 0 ? '+' : '';
    statsEl.innerHTML = `
      <div class="bm-stat"><div class="val" style="color:${diffColor}">${diffSign}${formatNum(Math.round(diff*10)/10)}${metric.unit}</div><div class="lbl">تغییر کل</div></div>
      <div class="bm-stat"><div class="val">${formatNum(min)}${metric.unit}</div><div class="lbl">کمترین</div></div>
      <div class="bm-stat"><div class="val">${formatNum(max)}${metric.unit}</div><div class="lbl">بیشترین</div></div>
      <div class="bm-stat"><div class="val">${formatNum(data.length)}</div><div class="lbl">تعداد ثبت</div></div>
    `;
  }
}

/* ============ INIT ============ */
(function init(){
  // Populate category selects
  const catSelect = document.getElementById('exFormCat');
  if(catSelect){
    catSelect.innerHTML = Object.keys(CATEGORIES).map(k=>`<option value="${k}">${CATEGORIES[k].emoji} ${CATEGORIES[k].name}</option>`).join('');
  }
  const animSelect = document.getElementById('exFormAnim');
  if(animSelect){
    animSelect.innerHTML = Object.keys(A).map(k=>`<option value="${k}">${k}</option>`).join('');
  }
  
  loadUsers(); loadSettings(); loadExerciseBank(); loadUserProgram(); loadHistory();
  initNutrition(); loadBodyData();
  rebuildWorkoutData();
  applyScrollSnapSetting();
  renderGuide();
  const weekResetInfo = checkWeekReset();
  const result = restoreAppState();
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').innerHTML = `<span class="btn-icon">${theme==='light'?'☀️':'🌙'}</span><span class="btn-label">تم</span>`;
  const mIcon = document.getElementById('mobileThemeIcon');
  if(mIcon) mIcon.textContent = theme==='light'?'☀️':'🌙';
  updateUserButton();
  const todayKey = markTodayButton();
  const todayStr = new Date().toDateString();
  const lastOpen = localStorage.getItem(LAST_OPEN_KEY);
  const isNewDay = lastOpen !== todayStr;
  if(userSettings.autoOpenToday && todayKey){ if(isNewDay || !result.restored) currentDay = todayKey; }
  else if(!result.restored){ currentDay = todayKey || 'all'; }
  try{ localStorage.setItem(LAST_OPEN_KEY, todayStr); }catch(e){}
  if(currentDay !== 'all' && !workoutData[currentDay]) currentDay = todayKey || 'all';
  renderDayNav(); renderDays(); updateChart(); restartAutosaveTimer(); renderUserList();
  if(weekResetInfo) setTimeout(()=>showWeekResetBanner(weekResetInfo), 800);
  if(result.finishedCardio && result.finishedCardio.length > 0){
    result.finishedCardio.forEach(k=>{ setTimeout(()=>showToast('کاردیو در غیاب شما تمام شد! 🎉', 'success', 6000), 600); });
  }
  
  // Global events
  const volEl = document.getElementById('setVolume');
  if(volEl) volEl.addEventListener('input', ()=>{ document.getElementById('volumeValue').textContent = Math.round(volEl.value*100)+'%'; });
  const soundEl = document.getElementById('setSound');
  if(soundEl) soundEl.addEventListener('change', ()=>{
    const g = document.getElementById('volumeGroup');
    g.style.opacity = soundEl.checked ? '1' : '.4';
    g.style.pointerEvents = soundEl.checked ? 'auto' : 'none';
  });
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape'){
      closeSettings(); closeUserDrawer(); closeProgramDrawer(); closeExercisePicker(); closeExerciseForm(); closeExConfig();
      closeNutritionDrawer(); closeFoodPicker(); closeSuppForm(); closeBodyDrawer(); closePwdGate();
    }
    if(e.key === 'Enter' && pendingPwdUserId && document.getElementById('pwdDrawer').classList.contains('open')){ submitPwdGate(); }
  });
  window.addEventListener('resize', ()=>{ setTimeout(setupExerciseObserver, 200); });
  window.addEventListener('beforeunload', ()=>{ saveAppState(); persistSettings(); });
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden'){ saveAppState(); persistSettings(); } });
  window.addEventListener('pagehide', ()=>{ saveAppState(); persistSettings(); });
})();