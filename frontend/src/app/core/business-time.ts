export const DEFAULT_BUSINESS_TIME_ZONE = 'Europe/Lisbon';

export function businessDateTime(timeZone = DEFAULT_BUSINESS_TIME_ZONE): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(Date.now())).replace(' ', 'T');
}

export function addCalendarDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}
