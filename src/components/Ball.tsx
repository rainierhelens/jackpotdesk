import { pad2 } from "../lib/picks";

type Props = {
  value: number;
  extra?: boolean;
};

export function Ball({ value, extra = false }: Props) {
  return (
    <span className={extra ? "ball ball-extra" : "ball"}>{pad2(value)}</span>
  );
}
