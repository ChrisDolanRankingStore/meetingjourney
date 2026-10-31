// Calendar dates use the device's local day, never UTC midnight.
export const defaultMeetingDays = { midweek: 3, weekend: 0 };

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) throw new RangeError('Use a date in YYYY-MM-DD format.');
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || localDateKey(date) !== value) throw new RangeError('Invalid calendar date.');
  return date;
}

export function weekOfDate(value) {
  const date = parseCalendarDate(value);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return localDateKey(date);
}

// Include boundary weeks: a Sunday at the start of a month belongs to last month's Monday.
export function monthWeeks(value) {
  const date = parseCalendarDate(value);
  const month = date.getMonth();
  date.setDate(1);
  const weeks = new Set();
  while (date.getMonth() === month) {
    weeks.add(weekOfDate(localDateKey(date)));
    date.setDate(date.getDate() + 1);
  }
  return [...weeks];
}

export function normaliseMeetingDays(days) {
  const valid = value => Number.isInteger(value) && value >= 0 && value <= 6;
  return {
    midweek: valid(days?.midweek) ? days.midweek : defaultMeetingDays.midweek,
    weekend: valid(days?.weekend) ? days.weekend : defaultMeetingDays.weekend
  };
}

export function suggestedMeeting(today = localDateKey(), days = defaultMeetingDays) {
  const date = parseCalendarDate(today);
  const schedule = normaliseMeetingDays(days);
  const next = type => {
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + (schedule[type] - date.getDay() + 7) % 7);
    return { type, date: localDateKey(nextDate) };
  };
  const midweek = next('midweek');
  const weekend = next('weekend');
  // On a meeting day keep that meeting available all day.
  return midweek.date <= weekend.date ? midweek : weekend;
}

export function resolveMeetingSelection(today, days, override) {
  // Manual choices last for the day. Tomorrow returns to the schedule.
  if (override?.chosenOn === today && ['midweek', 'weekend'].includes(override.type)) {
    try { parseCalendarDate(override.date); return { type: override.type, date: override.date }; } catch { /* Invalid saved choice. */ }
  }
  return suggestedMeeting(today, days);
}
