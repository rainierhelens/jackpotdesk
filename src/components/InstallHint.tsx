import { useEffect, useState } from "react";

const DISMISS_KEY = "jackpotdesk.installHint.v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function standalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function iosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && safari;
}

export function InstallHint() {
  const [mode, setMode] = useState<"hidden" | "ios" | "prompt">("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (standalone() || localStorage.getItem(DISMISS_KEY) === "1") return;

    if (iosSafari()) {
      setMode("ios");
      return;
    }

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("prompt");
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (mode === "hidden") return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
    setDeferred(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") dismiss();
  }

  return (
    <div className="install-hint">
      <p>
        {mode === "ios" ? (
          <>
            Add to Home Screen: tap Share, then{" "}
            <strong>Add to Home Screen</strong>. Opens like an app. Same pool
            on this phone.
          </>
        ) : (
          <>
            Install JackpotDesk on this device. Same desk, no App Store, pool
            stays in this browser.
          </>
        )}
      </p>
      <div className="install-hint-actions">
        {mode === "prompt" ? (
          <button type="button" className="primary" onClick={() => void install()}>
            Install
          </button>
        ) : null}
        <button type="button" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
