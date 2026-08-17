type Props = {
  whites: number[];
  whiteMax: number;
  extra?: number;
  extraMax?: number;
};

export function Playslip({ whites, whiteMax, extra, extraMax }: Props) {
  const selected = new Set(whites);
  const cells = Array.from({ length: whiteMax }, (_, i) => i + 1);
  const extras = extraMax
    ? Array.from({ length: extraMax }, (_, i) => i + 1)
    : [];
  return (
    <div className="playslip-wrap" aria-hidden="true">
      <div className="playslip">
        {cells.map((n) => (
          <span key={n} className={selected.has(n) ? "cell on" : "cell"}>
            {n}
          </span>
        ))}
      </div>
      {extras.length > 0 ? (
        <div className="playslip playslip-extra">
          {extras.map((n) => (
            <span
              key={`x-${n}`}
              className={extra === n ? "cell on extra" : "cell"}
            >
              {n}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
