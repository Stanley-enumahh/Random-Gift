// Helpers for <input type="datetime-local">, which works in the viewer's local
// time with no timezone ("2026-11-27T18:00"). We send ISO (UTC) to the API.

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localInputToIso(value: string) {
  return new Date(value).toISOString();
}

// Default joining deadline: one week from now, at 6pm local time.
export function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  return toLocalInputValue(d);
}

// Earliest pickable deadline: an hour from now (the API needs at least 5 minutes).
export function minDeadline() {
  return toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000));
}
