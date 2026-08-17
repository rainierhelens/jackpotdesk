import type { GameId, Member, Pool, Ticket } from "../types";
import { newId } from "./picks";
import { emptyPool } from "./storage";

const HASH_PREFIX = "#p=";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string): Uint8Array {
  const pad = "=".repeat((4 - (raw.length % 4)) % 4);
  const b64 = raw.replaceAll("-", "+").replaceAll("_", "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function parsePoolJson(raw: unknown): Pool | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const game = data.game;
  if (game !== "powerball" && game !== "megamillions") return null;
  if (!Array.isArray(data.members) || !Array.isArray(data.tickets)) return null;
  const members: Member[] = [];
  for (const row of data.members) {
    if (!row || typeof row !== "object") return null;
    const m = row as Record<string, unknown>;
    const shares = Number(m.shares);
    members.push({
      id: typeof m.id === "string" && m.id ? m.id : newId(),
      name: typeof m.name === "string" ? m.name : "",
      shares: Number.isFinite(shares) ? Math.max(0, shares) : 1,
      paid: Boolean(m.paid),
    });
  }
  const tickets: Ticket[] = [];
  for (const row of data.tickets) {
    if (!row || typeof row !== "object") return null;
    const t = row as Record<string, unknown>;
    if (!Array.isArray(t.whites)) return null;
    const whites = t.whites.map((n) => Number(n)).filter((n) => Number.isFinite(n));
    const extra = Number(t.extra);
    if (whites.length !== 5 || !Number.isFinite(extra)) return null;
    tickets.push({
      id: typeof t.id === "string" && t.id ? t.id : newId(),
      whites,
      extra,
    });
  }
  return {
    name: typeof data.name === "string" ? data.name : emptyPool(game as GameId).name,
    game: game as GameId,
    members,
    tickets,
  };
}

export function encodePool(pool: Pool): string {
  const json = JSON.stringify({
    name: pool.name,
    game: pool.game,
    members: pool.members,
    tickets: pool.tickets,
  });
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodePool(token: string): Pool | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(token));
    return parsePoolJson(JSON.parse(json));
  } catch {
    return null;
  }
}

export function poolShareUrl(pool: Pool): { url: string; tooLong: boolean } {
  const token = encodePool(pool);
  const url = `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${token}`;
  return { url, tooLong: url.length > 7000 };
}

export function readPoolFromLocation(): Pool | null {
  const hash = window.location.hash;
  if (hash.startsWith(HASH_PREFIX)) {
    return decodePool(hash.slice(HASH_PREFIX.length));
  }
  return null;
}

export function clearPoolHash(): void {
  if (!window.location.hash.startsWith(HASH_PREFIX)) return;
  const url = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", url);
}

export function downloadPoolJson(pool: Pool): void {
  const blob = new Blob([JSON.stringify(pool, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(pool.name || "jackpotdesk-pool").replace(/[^\w.-]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
