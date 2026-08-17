import { useEffect } from "react";
import { ADSENSE_CLIENT, ADSENSE_SLOTS } from "../config";

type SlotName = keyof typeof ADSENSE_SLOTS;

type Props = {
  slot: SlotName;
  format?: "leaderboard" | "rectangle";
};

let scriptLoaded = false;

function loadAdSense(client: string) {
  if (scriptLoaded || document.querySelector(`script[data-ad-client="${client}"]`)) {
    scriptLoaded = true;
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = "anonymous";
  script.dataset.adClient = client;
  document.head.appendChild(script);
  scriptLoaded = true;
}

export function AdSlot({ slot, format = "leaderboard" }: Props) {
  const client = ADSENSE_CLIENT.trim();
  const unit = ADSENSE_SLOTS[slot].trim();

  useEffect(() => {
    if (!client) return;
    loadAdSense(client);
    if (!unit) return;
    try {
      const ads = window as unknown as { adsbygoogle?: unknown[] };
      ads.adsbygoogle = ads.adsbygoogle || [];
      ads.adsbygoogle.push({});
    } catch {
      /* AdSense may not be ready on the first paint. */
    }
  }, [client, unit]);

  const sizeClass = format === "rectangle" ? "ad-slot rectangle" : "ad-slot leaderboard";

  if (client && unit) {
    return (
      <aside className={sizeClass} aria-label="Advertisement">
        <p className="ad-label">Advertisement</p>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  return (
    <aside className={`${sizeClass} placeholder`} aria-label="Advertisement">
      <p className="ad-label">Advertisement</p>
      <p className="ad-placeholder">Your ad could run here.</p>
    </aside>
  );
}
