import { useState, type FormEvent } from "react";
import { WRITE_DESK_URL } from "../config";
import { trackEvent } from "../lib/analytics";

export function WriteView() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [honey, setHoney] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const note = message.trim();
    const email = reply.trim();
    if (honey.trim()) {
      setStatus({
        ok: true,
        text: "Sent. The desk reads these when it can.",
      });
      setMessage("");
      setReply("");
      return;
    }
    if (note.length < 20) {
      setStatus({
        ok: false,
        text: "Give the desk a bit more (at least 20 characters).",
      });
      return;
    }
    if (!WRITE_DESK_URL) {
      setStatus({ ok: false, text: "The desk is not taking mail yet." });
      return;
    }
    setBusy(true);
    setStatus({ ok: true, text: "Sending…" });
    try {
      const res = await fetch(WRITE_DESK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: note, reply: email || undefined }),
      });
      let body: { error?: string } = {};
      try {
        body = (await res.json()) as { error?: string };
      } catch {
        body = {};
      }
      if (res.ok) {
        trackEvent("write_desk_send", { page_path: "/write" });
        setStatus({
          ok: true,
          text: "Sent. The desk reads these when it can. We do not send winning numbers.",
        });
        setMessage("");
        setReply("");
        return;
      }
      const err = body.error;
      setStatus({
        ok: false,
        text:
          err === "desk closed"
            ? "The desk is not taking mail yet."
            : err === "rate"
              ? "Wait a minute, then send again."
              : err === "message"
                ? "Give the desk a bit more, or shorten it under 4,000 characters."
                : "The desk could not take that note. Try again later.",
      });
    } catch {
      setStatus({
        ok: false,
        text: "The desk could not take that note. Try again later.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel desk-page" aria-label="Write the desk">
      <header className="panel-head">
        <div>
          <p className="kicker">Desk</p>
          <h2>Write the desk</h2>
        </div>
      </header>
      <p>
        Bugs, a question about The Ladder, or inbound about more ranks. No name
        required. We do not sell tickets. We do not send winning numbers. Same
        hit odds as Quick Pick.
      </p>
      <form className="desk-form" onSubmit={onSubmit} noValidate>
        <label className="desk-honey" aria-hidden="true">
          Company
          <input
            type="text"
            value={honey}
            onChange={(e) => setHoney(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        <label>
          Message
          <textarea
            required
            minLength={20}
            maxLength={4000}
            rows={8}
            placeholder="What should the desk know?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label>
          Reply email (optional)
          <input
            type="email"
            autoComplete="email"
            placeholder="Only if you want a reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
        </label>
        <button className="primary" type="submit" disabled={busy}>
          Send to the desk
        </button>
        {status ? (
          <p
            className={`desk-status${status.ok ? " is-ok" : " is-err"}`}
            role="status"
          >
            {status.text}
          </p>
        ) : null}
      </form>
      <p className="fine">
        Messages are support mail. See the{" "}
        <a href="/privacy.html">privacy policy</a>.
      </p>
    </section>
  );
}
