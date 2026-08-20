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

export function recapJsonSrc(pathname = "/recap"): string {
  const dated = pathname.match(DATED);
  return dated ? `/recap/${dated[1]}.json` : "/recap/latest.json";
}
