/// <reference types="vite/client" />

declare module "*?raw" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_WA_DRAWS_URL?: string;
  readonly VITE_JACKPOT_WINS_URL?: string;
  readonly VITE_MARKET_QUOTES_URL?: string;
  readonly VITE_WRITE_DESK_URL?: string;
  readonly VITE_TIP_JAR_URL?: string;
}
