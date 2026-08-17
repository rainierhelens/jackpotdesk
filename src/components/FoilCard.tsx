import { useRef, type ReactNode } from "react";
import { DiffractionLayer } from "./DiffractionLayer";
import { usePrefersReducedMotion } from "../lib/motion";
import type { GameId } from "../types";

type Props = {
  children: ReactNode;
  shader?: boolean;
  className?: string;
  game?: GameId;
};

export function FoilCard({
  children,
  shader = false,
  className = "",
  game,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  return (
    <div className={`foil-stage ${className}`.trim()}>
      <div
        ref={cardRef}
        className={`foil-card is-ticket is-still${game ? ` is-${game}` : ""}`}
      >
        {shader && !reduced ? <DiffractionLayer hostRef={cardRef} /> : null}
        <span className="foil-css" aria-hidden="true" />
        <span className="foil-glare" aria-hidden="true" />
        <div className="foil-body">{children}</div>
      </div>
    </div>
  );
}
