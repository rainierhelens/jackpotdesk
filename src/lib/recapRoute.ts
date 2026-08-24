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

/** Document title for /recap and /recap/YYYY-MM-DD. */
export function recapDocumentTitle(iso: string): string {
  return `Recap · ${formatRecapHeading(iso)} | JackpotDesk`;
}

/** Visible H1. Latest names the ritual; archives name the morning. */
export function recapPageHeading(
  kind: "latest" | "archive",
  iso: string,
): string {
  return kind === "archive"
    ? `Recap · ${formatRecapHeading(iso)}`
    : "Last night vs the Ladder";
}

export function recapGameLabels(payload: {
  national: { label: string }[];
  washington: { label: string }[];
}): string[] {
  return [...payload.national, ...payload.washington]
    .map((block) => block.label.trim())
    .filter(Boolean);
}

export function joinRecapGames(labels: string[]): string {
  const names = labels.map((label) => label.trim()).filter(Boolean);
  if (names.length === 0) return "official games";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** Day-specific crawl text. Names the games, not official boards. */
export function recapMetaDescription(iso: string, labels: string[]): string {
  const heading = formatRecapHeading(iso);
  const games = joinRecapGames(labels);
  return `${heading}: last night's ${games} versus last night's Ladder #1 to #3. Entertainment, not prediction. Same hit odds as Quick Pick.`;
}
