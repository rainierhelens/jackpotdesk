declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const TAB_PATH: Record<string, { title: string; path: string }> = {
  tickets: { title: "Build the slip", path: "/tickets" },
  week: { title: "This week", path: "/week" },
  map: { title: "Map", path: "/map" },
  pool: { title: "Pool", path: "/pool" },
  why: { title: "Why this", path: "/why" },
};

export function trackTab(tab: string) {
  const page = TAB_PATH[tab] ?? { title: tab, path: `/${tab}` };
  window.gtag?.("event", "page_view", {
    page_title: page.title,
    page_path: page.path,
    page_location: `${window.location.origin}${page.path}`,
  });
}
