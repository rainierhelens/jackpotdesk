/** Public recap lives at /recap, not ?tab=recap. Dated copies keep /recap/YYYY-MM-DD. */

const DATED = /^\/recap\/(\d{4}-\d{2}-\d{2})\/?$/;

export function isRecapPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? "";
  return path === "/recap" || path === "/recap/" || DATED.test(path);
}

export function recapPath(pathname = "/recap"): string {
  const dated = pathname.match(DATED);
  return dated ? `/recap/${dated[1]}` : "/recap";
}

export function recapDayIso(pathname = "/recap"): string | null {
  return pathname.match(DATED)?.[1] ?? null;
}

export function recapJsonSrc(pathname = "/recap"): string {
  const dated = pathname.match(DATED);
  return dated ? `/recap/${dated[1]}.json` : "/recap/latest.json";
}

export function recapLogSrc(): string {
  return "/recap/log.json";
}

/** America/Los_Angeles calendar heading for a recap asOf date. */
export function formatRecapHeading(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(Date.UTC(year, month - 1, day, 20));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(date);
}
