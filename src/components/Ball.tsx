import { pad2 } from "../lib/picks";

type Props = {
  value: number;
  extra?: boolean;
  hit?: boolean;
};

export function Ball({ value, extra = false, hit = false }: Props) {
  const cls = [
    "ball",
    extra ? "ball-extra" : "",
    hit ? "ball-hit" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={cls}>{pad2(value)}</span>;
}
