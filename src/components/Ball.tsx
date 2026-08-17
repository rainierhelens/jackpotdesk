import { pad2 } from "../lib/picks";
import type { CSSProperties } from "react";

type Tone = "hot" | "cold" | "overdue";

type Props = {
  value: number;
  extra?: boolean;
  hit?: boolean;
  tone?: Tone;
  drop?: boolean;
  delay?: string;
};

export function Ball({
  value,
  extra = false,
  hit = false,
  tone,
  drop = false,
  delay,
}: Props) {
  const cls = [
    "ball",
    extra ? "ball-extra" : "",
    hit ? "ball-hit" : "",
    tone ? `ball-${tone}` : "",
    drop ? "ball-drop" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties | undefined = delay
    ? { animationDelay: delay }
    : undefined;
  return (
    <span className={cls} style={style}>
      {pad2(value)}
    </span>
  );
}
