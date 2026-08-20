import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Serve the static recap at /recap instead of the SPA shell. */
function recapPrettyUrl(): Plugin {
  const rewrite = (
    req: IncomingMessage,
    _res: ServerResponse,
    next: Connect.NextFunction,
  ) => {
    const url = req.url?.split("?")[0] ?? "";
    if (url === "/recap" || url === "/recap/") {
      req.url = "/recap/index.html";
    } else {
      const dated = url.match(/^\/recap\/(\d{4}-\d{2}-\d{2})\/?$/);
      if (dated) req.url = `/recap/${dated[1]}/index.html`;
    }
    next();
  };
  return {
    name: "recap-pretty-url",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [react(), recapPrettyUrl()],
});
