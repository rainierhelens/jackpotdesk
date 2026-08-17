type Props = {
  whites: number[];
  whiteMax: number;
};

export function Playslip({ whites, whiteMax }: Props) {
  const selected = new Set(whites);
  const cells = Array.from({ length: whiteMax }, (_, i) => i + 1);
  return (
    <div className="playslip" aria-hidden="true">
      {cells.map((n) => (
        <span key={n} className={selected.has(n) ? "cell on" : "cell"}>
          {n}
        </span>
      ))}
    </div>
  );
}
