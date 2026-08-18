import type { ReactNode } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: Props) {
  const span = max - min;
  const pct = span <= 0 ? 100 : Math.min(100, Math.max(0, ((value - min) / span) * 100));

  return (
    <label className="slide-row">
      <span>
        {label}
        <b>{display}</b>
      </span>
      <span className="slider">
        <span className="slider-rail" aria-hidden="true">
          <i className="slider-fill" style={{ width: `${pct}%` }} />
          <i className="slider-knob" style={{ left: `${pct}%` }} />
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled || span <= 0}
          aria-label={label}
          aria-valuetext={display}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
    </label>
  );
}

export function MapFilters({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `map-filters ${className}` : "map-filters"}>
      {children}
    </div>
  );
}
