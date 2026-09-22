/* ============================================================
   data-config.js — تنظیمات، دسته‌بندی‌ها، فرمول‌ها
   ============================================================ */

const CATEGORIES = {
  chest:     { name: 'سینه',       emoji: '🏋️' },
  back:      { name: 'پشت',        emoji: '🔙' },
  shoulders: { name: 'شانه',       emoji: '🎯' },
  arms:      { name: 'بازو',       emoji: '💪' },
  legs:      { name: 'پا',         emoji: '🦵' },
  core:      { name: 'شکم',        emoji: '🧘' },
  cardio:    { name: 'کاردیو',     emoji: '🏃' },
  // دسته‌های اضافی
  traps:     { name: 'تراپز',      emoji: '🔺' },
  glutes:    { name: 'باسن',       emoji: '🍑' },
  forearm:   { name: 'ساعد',       emoji: '🦾' },
  neck:      { name: 'گردن',       emoji: '🗣️' },
  mobility:  { name: 'موبیلیتی',   emoji: '🤸' }
};

const CARDIO_PRESETS = [
  { id:'treadmill_incline', name:'تردمیل پیاده‌روی شیب‌دار', icon:'🚶', desc:'۲۰ دقیقه پیاده‌روی شیب‌دار (شیب ۱۰، سرعت ۵)' },
  { id:'treadmill_run',     name:'تردمیل دویدن',            icon:'🏃', desc:'۲۰ دقیقه دویدن با شدت متوسط' },
  { id:'bike',              name:'دوچرخه ثابت',             icon:'🚴', desc:'۲۰ دقیقه دوچرخه ثابت' },
  { id:'elliptical',        name:'الپتیکال',                icon:'🏃‍♂️', desc:'۲۰ دقیقه الپتیکال' },
  { id:'rowing',            name:'دستگاه روئینگ',           icon:'🚣', desc:'۱۵-۲۰ دقیقه روئینگ' },
  { id:'stair',             name:'پله نوردی (استپر)',       icon:'🪜', desc:'۱۵ دقیقه پله نوردی' },
  { id:'jumprope',          name:'طناب زدن',                icon:'🪢', desc:'۱۰-۱۵ دقیقه طناب زدن' },
  { id:'swim',              name:'شنا',                     icon:'🏊', desc:'۲۰-۳۰ دقیقه شنا' },
  { id:'walking',           name:'پیاده‌روی',               icon:'🚶‍♂️', desc:'۳۰ دقیقه پیاده‌روی' },
  { id:'hiit',              name:'HIIT',                    icon:'⚡', desc:'۱۵-۲۰ دقیقه HIIT' }
];

const WEEKDAYS = [
  { key:'sat', jsDay: 6, name:'شنبه',     icon:'💪', defaultName:'روز شنبه',     defaultFocus:'بالاتنه قدرتی' },
  { key:'sun', jsDay: 0, name:'یکشنبه',   icon:'🦵', defaultName:'روز یکشنبه',   defaultFocus:'پایین‌تنه قدرتی' },
  { key:'mon', jsDay: 1, name:'دوشنبه',   icon:'🧘', defaultName:'روز دوشنبه',   defaultFocus:'تمرین اختیاری' },
  { key:'tue', jsDay: 2, name:'سه‌شنبه', icon:'🔥', defaultName:'روز سه‌شنبه',  defaultFocus:'بالاتنه حجمی' },
  { key:'wed', jsDay: 3, name:'چهارشنبه', icon:'🦿', defaultName:'روز چهارشنبه', defaultFocus:'پایین‌تنه حجمی' },
  { key:'thu', jsDay: 4, name:'پنجشنبه',  icon:'⚡', defaultName:'روز پنجشنبه',  defaultFocus:'تمرین اختیاری' },
  { key:'fri', jsDay: 5, name:'جمعه',     icon:'🌟', defaultName:'روز جمعه',     defaultFocus:'استراحت فعال' }
];

const EMOJI_OPTIONS = ['💪','🏋️','🤸','🏃','🥇','⚡','🔥','⭐','🎯','🚀','🦁','🐯','🌟','👑','💎','🎽','🏆','🥊','🧗','🤾'];

const COLOR_OPTIONS = ['#3b82f6','#a855f7','#10b981','#f43f5e','#f59e0b','#06b6d4','#ec4899','#6366f1','#14b8a6','#f97316'];

const DEFAULT_SETTINGS = {
  autosaveInterval: 15, soundEnabled: true, soundVolume: 0.7, vibrationEnabled: true,
  alarmWave: 'square', alarmRepeat: 3, toastsEnabled: true, numberFormat: 'fa',
  defaultCardioMinutes: 20, confirmBeforeReset: true, autoAnimPlay: true,
  autoCollapseDone: true, autoOpenToday: true, scrollSnapEnabled: true, autoOpenLogger: true
};

const MEAL_CONFIG = [
  { key:'breakfast', name:'صبحانه',         emoji:'🌅', pct:0.25 },
  { key:'snack1',    name:'میان وعده صبح', emoji:'🍎', pct:0.10 },
  { key:'lunch',     name:'ناهار',          emoji:'🍽️', pct:0.30 },
  { key:'snack2',    name:'میان وعده عصر', emoji:'🥜', pct:0.10 },
  { key:'dinner',    name:'شام',            emoji:'🌙', pct:0.25 }
];

const FOOD_CATS = {
  protein:{name:'پروتئین',    emoji:'🍗'},
  carb:{name:'کربوهیدرات',   emoji:'🍚'},
  fat:{name:'چربی سالم',     emoji:'🥑'},
  veg:{name:'سبزیجات',       emoji:'🥦'},
  fruit:{name:'میوه',         emoji:'🍎'},
  dairy:{name:'لبنیات',      emoji:'🥛'},
  nut:{name:'مغز و دانه',    emoji:'🥜'},
  iranian:{name:'غذای ایرانی',emoji:'🍛'},
  drink:{name:'نوشیدنی',     emoji:'🥤'},
  sweet:{name:'شیرینی و دسر', emoji:'🍫'},
  fastfood:{name:'فست‌فود',  emoji:'🍔'},
  snack:{name:'خوراکی',      emoji:'🍿'}
};

const BMR_FORMULAS = {
  mifflin:    { name:'Mifflin-St Jeor', desc:'دقیق‌ترین فرمول عمومی برای جمعیت عادی.', male:'10×W + 6.25×H − 5×A + 5', female:'10×W + 6.25×H − 5×A − 161', needsBodyfat:false },
  harris:     { name:'Harris-Benedict (Revised 1984)', desc:'فرمول کلاسیک که در ۱۹۸۴ بازنگری شد.', male:'88.362 + 13.397×W + 4.799×H − 5.677×A', female:'447.593 + 9.247×W + 3.098×H − 4.330×A', needsBodyfat:false },
  katch:      { name:'Katch-McArdle', desc:'بر اساس توده بدون چربی بدن (LBM).', male:'370 + 21.6 × LBM', female:'370 + 21.6 × LBM', needsBodyfat:true },
  cunningham: { name:'Cunningham', desc:'مشابه Katch-McArdle با ضریب بالاتر.', male:'500 + 22 × LBM', female:'500 + 22 × LBM', needsBodyfat:true },
  manual:     { name:'ورود دستی', desc:'همه مقادیر را خودتان وارد کنید.', male:'—', female:'—', needsBodyfat:false, isManual:true }
};

const BODY_METRICS = [
  { key:'weight',  name:'وزن',   unit:'kg', emoji:'⚖️' },
  { key:'bodyfat', name:'چربی',  unit:'%',  emoji:'🔥' },
  { key:'neck',    name:'گردن',  unit:'cm', emoji:'👤' },
  { key:'chest',   name:'سینه',  unit:'cm', emoji:'💪' },
  { key:'waist',   name:'کمر',   unit:'cm', emoji:'👖' },
  { key:'hip',     name:'باسن',  unit:'cm', emoji:'🍑' },
  { key:'arm',     name:'بازو',  unit:'cm', emoji:'💪' },
  { key:'forearm', name:'ساعد',  unit:'cm', emoji:'🦾' },
  { key:'thigh',   name:'ران',   unit:'cm', emoji:'🦵' },
  { key:'calf',    name:'ساق',   unit:'cm', emoji:'🦿' }
];

const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

/* ---------- Storage keys ---------- */
const USERS_KEY           = 'profit-users-v3';
const CURRENT_USER_KEY    = 'profit-current-user-v3';
const STATE_KEY_PREFIX    = 'profit-state-v13-';
const SETTINGS_KEY_PREFIX = 'profit-settings-v13-';
const BANK_KEY_PREFIX     = 'profit-bank-v9-';
const PROGRAM_KEY_PREFIX  = 'profit-program-v9-';
const HISTORY_KEY_PREFIX  = 'profit-history-v2-';
const WEEK_START_KEY_PREFIX = 'profit-week-start-';
const NUTRITION_KEY_PREFIX  = 'profit-nutrition-v3-';
const BODY_KEY_PREFIX       = 'profit-body-v2-';
const LAST_OPEN_KEY         = 'profit-last-opened-date';

/* ---------- Smart program templates ---------- */
const SPLIT_TEMPLATES = {
  full:  { name:'تمام بدن',   focus:'تمرین کل بدن', icon:'💪',
    exs:['leg_squat_bb','chest_bench_barbell','back_row_barbell','sh_press_db_seated','arm_curl_db','arm_triceps_pushdown','core_plank'] },
  upper: { name:'بالاتنه',    focus:'سینه، پشت، شانه، بازو', icon:'💪',
    exs:['chest_bench_barbell','chest_inc_db','back_pulldown_wide','back_row_v','sh_press_db_seated','sh_lateral','arm_curl_db','arm_triceps_pushdown'] },
  lower: { name:'پایین‌تنه',   focus:'پا، باسن، ساق', icon:'🦵',
    exs:['leg_squat_bb','leg_hipthrust','leg_rdl','leg_leg_extension','leg_curl','leg_calf_stand','core_plank'] },
  push:  { name:'فشاری',      focus:'سینه، شانه، پشت بازو', icon:'🔥',
    exs:['chest_bench_barbell','chest_inc_db','chest_fly','sh_press_db_seated','sh_lateral','arm_triceps_pushdown','arm_triceps_oh'] },
  pull:  { name:'کششی',       focus:'پشت، جلو بازو', icon:'🔙',
    exs:['back_pullup','back_row_barbell','back_pulldown_wide','back_row_v','back_face_pull','arm_curl_db','arm_curl_hammer'] },
  legs:  { name:'پا',         focus:'چهارسر، همسترینگ، ساق', icon:'🦿',
    exs:['leg_squat_bb','leg_press','leg_leg_extension','leg_rdl','leg_curl','leg_calf_stand','leg_calf_seat'] },
  cardio:{ name:'کاردیو',     focus:'سیستم قلبی-عروقی', icon:'🏃',
    exs:['cardio_treadmill_walk','cardio_bike','core_plank'] },
  rest:  { name:'استراحت',    focus:'ریکاوری', icon:'😴', exs:[] }
};

/* ---------- Splits based on days/week ---------- */
const SPLITS_BY_DAYS = {
  2: ['full','full'],
  3: ['push','pull','legs'],
  4: ['upper','lower','upper','lower'],
  5: ['push','pull','legs','upper','lower'],
  6: ['push','pull','legs','push','pull','legs']
};

/* ---------- Exercise volume by level ---------- */
const VOLUME_BY_LEVEL = {
  beginner:     { sets: 3, repsCompound: '۱۰-۱۲', repsIsolation: '۱۲-۱۵', exsPerDay: 5, rest: 90 },
  intermediate: { sets: 4, repsCompound: '۸-۱۰',  repsIsolation: '۱۰-۱۲', exsPerDay: 6, rest: 90 },
  advanced:     { sets: 4, repsCompound: '۶-۸',   repsIsolation: '۱۰-۱۲', exsPerDay: 7, rest: 120 }
};