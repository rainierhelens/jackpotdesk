import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Props = {
  game: string;
  burst: number;
};

const COUNT = 42;

export function PackFx({ game, burst }: Props) {
  const [on, setOn] = useState(false);
  const bits = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / COUNT + (burst % 7) * 0.15;
      const dist = 42 + ((i * 17 + burst * 13) % 58);
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.72,
        rot: (i * 47 + burst * 11) % 360,
        delay: `${(i % 8) * 0.02}s`,
        kind: i % 5 === 0 ? "star" : i % 3 === 0 ? "bar" : "dot",
      };
    });
  }, [burst]);

  useEffect(() => {
    if (burst < 1) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), 1450);
    return () => window.clearTimeout(t);
  }, [burst]);

  if (!on) return null;

  return (
    <div className={`pack-fx is-${game}`} aria-hidden="true">
      <span className="pack-flash" />
      <span className="pack-rays" />
      {bits.map((bit, i) => (
        <span
          key={`${burst}-${i}`}
          className={`pack-bit pack-bit-${bit.kind}`}
          style={
            {
              "--dx": `${bit.x}vmin`,
              "--dy": `${bit.y}vmin`,
              "--rot": `${bit.rot}deg`,
              animationDelay: bit.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

type ShellProps = {
  game: string;
  label?: string;
  opening?: boolean;
  onOpen?: () => void;
};

export function PackShell({
  game,
  label,
  opening = false,
  onOpen,
}: ShellProps) {
  const title =
    label ??
    (game === "megamillions"
      ? "Mega Millions"
      : game === "powerball"
        ? "Powerball"
        : "Washington");
  const inner = (
    <div className="pack-face">
      <p className="pack-kicker">JackpotDesk</p>
      <p className="pack-title">{title}</p>
      <p className="pack-hint">{opening ? "Opening…" : "Generate"}</p>
    </div>
  );
  const cls = `pack-shell is-${game}${opening ? " is-opening" : ""}`;
  if (opening || !onOpen) {
    return (
      <div className={cls} aria-hidden="true">
        {inner}
      </div>
    );
  }
  return (
    <button type="button" className={cls} onClick={onOpen}>
      {inner}
    </button>
  );
}
