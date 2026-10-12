/**
 * Calendar quarters (Batch 8). The starting position (engine quarter 0) is Q4 2022; simulation Q1–Q8 run from
 * Q1 2023 to Q4 2024. Used everywhere a quarter is shown so dashboards, charts, briefings, reports and the
 * facilitator all speak the same language.
 */
export const START_YEAR = 2023;

/** "Q1 2023" (q = 1..8) or "Q4 2022" for the starting position (q = 0). */
export function calendarLabel(q: number): string {
  if (q <= 0) return 'Q4 2022';
  const year = START_YEAR + Math.floor((q - 1) / 4);
  return `Q${((q - 1) % 4) + 1} ${year}`;
}

/** Compact axis label: "Q1 ’23". */
export function calendarShort(q: number): string {
  if (q <= 0) return 'Q4 ’22';
  const year = START_YEAR + Math.floor((q - 1) / 4);
  return `Q${((q - 1) % 4) + 1} ’${String(year).slice(2)}`;
}

/** "Quarter 3 of 8 · Q3 2023". */
export function quarterOfGame(q: number): string {
  return `Quarter ${q} of 8 · ${calendarLabel(q)}`;
}

/** The comparison point for a quarter's results: the previous calendar quarter. */
export function previousLabel(q: number): string {
  return calendarLabel(q - 1);
}
