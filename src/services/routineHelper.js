/**
 * Routine categorization, icons, title formatting, localization, and name cleaning helper.
 * ZERO HARDCODING: Dynamically honors whatever title and category the user sets,
 * and cleans phone numbers/numbers out of elder names.
 */

export function cleanElderName(name = '') {
  if (!name) return '';
  const cleaned = String(name)
    .replace(/\+?91/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[0-9+()[\]:;,_.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || String(name).replace(/\d+/g, '').trim() || 'Elder';
}

const CATEGORY_ICONS = {
  sleep: 'Moon',
  bedtime: 'Moon',
  wake: 'Sun',
  wake_up: 'Sun',
  walk: 'Footprints',
  exercise: 'Footprints',
  yoga: 'Footprints',
  medication: 'Pill',
  tablet: 'Pill',
  medicine: 'Pill',
  breakfast: 'Utensils',
  lunch: 'Utensils',
  dinner: 'Utensils',
  meal: 'Utensils',
  food: 'Utensils',
  doctor: 'Eye',
  appointment: 'Eye',
  wellness: 'Bot',
  custom: 'Clock'
};

export function inferRoutineDetails(title = '', fallbackCategory = '') {
  const raw = (title || '').trim();
  const lower = raw.toLowerCase();
  const fallback = (fallbackCategory || '').toLowerCase().trim();

  // If user explicitly provided a category, honor it directly!
  if (fallback && fallback !== 'custom') {
    const icon = CATEGORY_ICONS[fallback] || 'Clock';
    return {
      category: fallback,
      routineType: fallback.toUpperCase(),
      icon
    };
  }

  // Dynamic semantic categorization based on title content
  if (/bed|sleep|rest|night|தூங்க|படுக்கை|கிடக்குக|ഉറക്ക/i.test(lower)) {
    return { category: 'sleep', routineType: 'SLEEP', icon: 'Moon' };
  }
  if (/wake|morning|alarm|விழி|எழு|உண|ഉണരുക/i.test(lower)) {
    return { category: 'wake', routineType: 'WAKE_UP', icon: 'Sun' };
  }
  if (/walk|exercise|jog|yoga|stretch|நடை|உடற்பயிற்சி|നടത്ത/i.test(lower)) {
    return { category: 'walk', routineType: 'WALK', icon: 'Footprints' };
  }
  if (/breakfast|காலை உணவு|காலை சாப்பாடு|പ്രാതൽ/i.test(lower)) {
    return { category: 'breakfast', routineType: 'BREAKFAST', icon: 'Utensils' };
  }
  if (/lunch|மதிய உணவு|மதிய சாப்பாடு|ഉച്ചഭക്ഷണ/i.test(lower)) {
    return { category: 'lunch', routineType: 'LUNCH', icon: 'Utensils' };
  }
  if (/dinner|supper|இரவு உணவு|இரவு சாப்பாடு|അത്താഴ/i.test(lower)) {
    return { category: 'dinner', routineType: 'DINNER', icon: 'Utensils' };
  }
  if (/tablet|med|pill|dose|capsule|syrup|drop|மருந்து|மாத்திரை|ഗുളിക|മരുന്ന്/i.test(lower)) {
    return { category: 'medication', routineType: 'MEDICATION', icon: 'Pill' };
  }
  if (/food|meal|tea|coffee|water|drink|snack|உணவு|தண்ணீர்|ഭക്ഷണം|വെള്ളം/i.test(lower)) {
    return { category: 'meal', routineType: 'MEAL', icon: 'Utensils' };
  }

  // Dynamic custom routine
  const customRoutineType = raw ? raw.toUpperCase().replace(/\s+/g, '_') : 'CUSTOM';
  return {
    category: fallback || 'custom',
    routineType: customRoutineType,
    icon: CATEGORY_ICONS[fallback] || 'Clock'
  };
}

/**
 * Dynamically resolves the title to display for a schedule item,
 * preserving user-entered custom titles and translating system presets
 * into the active language (English, Tamil, Malayalam).
 */
export function getLocalizedScheduleTitle(item, t = {}, language = 'en') {
  if (!item) return '';
  const rawTitle = (item.title || '').trim();
  const category = (item.category || item.routineType || '').toLowerCase();

  const isSystemPresetEnum = [
    'WAKE_UP', 'WAKE', 'WALK', 'BREAKFAST', 'LUNCH', 'DINNER',
    'MEDICINE', 'MEDICATION', 'TABLET', 'SLEEP', 'BEDTIME', 'CUSTOM'
  ].includes(rawTitle.toUpperCase());

  // If user entered a unique custom routine title, always prioritize their exact wording!
  if (rawTitle && !isSystemPresetEnum) {
    return rawTitle;
  }

  // Otherwise, localize standard system categories
  if (category === 'medication' || rawTitle === 'MEDICATION' || rawTitle === 'MEDICINE' || rawTitle === 'TABLET') {
    return (language !== 'en' && t?.routineMedication) ? t.routineMedication : 'Medication';
  }
  if (category === 'sleep' || rawTitle === 'SLEEP' || rawTitle === 'BEDTIME') {
    return (language !== 'en' && t?.sleepTime) ? t.sleepTime : 'Bedtime';
  }
  if (category === 'wake' || rawTitle === 'WAKE_UP' || rawTitle === 'WAKE') {
    return (language !== 'en' && t?.wakeUpAlarm) ? t.wakeUpAlarm : 'Wake Up Alarm';
  }
  if (category === 'walk' || rawTitle === 'WALK') {
    return (language !== 'en' && t?.morningWalk) ? t.morningWalk : 'Morning Walk';
  }
  if (category === 'breakfast' || rawTitle === 'BREAKFAST') {
    return (language !== 'en' && t?.breakfastTime) ? t.breakfastTime : 'Breakfast Time';
  }
  if (category === 'lunch' || rawTitle === 'LUNCH') {
    return (language !== 'en' && t?.lunchTime) ? t.lunchTime : 'Lunch Time';
  }
  if (category === 'dinner' || rawTitle === 'DINNER') {
    return (language !== 'en' && t?.dinnerTime) ? t.dinnerTime : 'Dinner Time';
  }

  return rawTitle || (t?.customRoutine || 'Scheduled Routine');
}
