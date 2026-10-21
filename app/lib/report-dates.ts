// Report date filters take date-only strings (YYYY-MM-DD). `.lte(col, "2026-10-31")`
// compares against midnight and drops rows later that day, so the end bound is
// made exclusive at the start of the following day.
export function exclusiveEndDate(endDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const next = new Date(`${endDate}T00:00:00.000Z`);
    if (!Number.isNaN(next.getTime())) {
      next.setUTCDate(next.getUTCDate() + 1);
      return next.toISOString().slice(0, 10);
    }
  }
  return endDate;
}
