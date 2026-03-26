export function minutesSince(date: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
}

export function formatDurationRu(minutes: number): string {
  if (minutes < 1) return "меньше минуты";
  const m = Math.round(minutes);
  if (m % 10 === 1 && m % 100 !== 11) return `${m} минута`;
  if ([2, 3, 4].includes(m % 10) && ![12, 13, 14].includes(m % 100)) return `${m} минуты`;
  return `${m} минут`;
}
