import { nationalPool, waPool } from "./comboPool";
import type { Filters, GameSpec, WaFilters } from "../types";
import type { WaGameSpec } from "./waGames";

export type PoolRequest =
  | {
      kind: "national";
      spec: GameSpec;
      filters: Filters;
      past: Set<string>;
      avoid: Set<number>;
    }
  | {
      kind: "wa";
      spec: WaGameSpec;
      whiteCount: number;
      filters: WaFilters;
      past: Set<string>;
      avoid: Set<number>;
    };

type Envelope = PoolRequest & { id: number };

self.onmessage = (event: MessageEvent<Envelope>) => {
  const msg = event.data;
  const report =
    msg.kind === "national"
      ? nationalPool(msg.spec, msg.filters, msg.past, msg.avoid)
      : waPool(msg.spec, msg.whiteCount, msg.filters, msg.past, msg.avoid);
  self.postMessage({ id: msg.id, report });
};
