export type TaxState = {
  id: string;
  label: string;
  rate: number;
  note?: string;
};

/** Typical state tax on a large lottery prize. Not withholding tables or advice. */
export const TAX_STATES: TaxState[] = [
  { id: "custom", label: "Custom", rate: 5 },
  { id: "none", label: "No state income tax", rate: 0, note: "FL, TX, WA, NV, TN, SD, WY, AK, NH" },
  { id: "AL", label: "Alabama", rate: 5 },
  { id: "AZ", label: "Arizona", rate: 2.5 },
  { id: "AR", label: "Arkansas", rate: 3.9 },
  { id: "CA", label: "California", rate: 13.3 },
  { id: "CO", label: "Colorado", rate: 4.4 },
  { id: "CT", label: "Connecticut", rate: 6.99 },
  { id: "DC", label: "Washington, D.C.", rate: 10.75 },
  { id: "DE", label: "Delaware", rate: 6.6 },
  { id: "GA", label: "Georgia", rate: 5.49 },
  { id: "ID", label: "Idaho", rate: 5.8 },
  { id: "IL", label: "Illinois", rate: 4.95 },
  { id: "IN", label: "Indiana", rate: 3.05 },
  { id: "IA", label: "Iowa", rate: 6 },
  { id: "KS", label: "Kansas", rate: 5.7 },
  { id: "KY", label: "Kentucky", rate: 4 },
  { id: "LA", label: "Louisiana", rate: 4.25 },
  { id: "ME", label: "Maine", rate: 7.15 },
  { id: "MD", label: "Maryland", rate: 8.95 },
  { id: "MA", label: "Massachusetts", rate: 5 },
  { id: "MI", label: "Michigan", rate: 4.25 },
  { id: "MN", label: "Minnesota", rate: 9.85 },
  { id: "MO", label: "Missouri", rate: 4.8 },
  { id: "MT", label: "Montana", rate: 5.9 },
  { id: "NE", label: "Nebraska", rate: 5.84 },
  { id: "NJ", label: "New Jersey", rate: 10.75 },
  { id: "NM", label: "New Mexico", rate: 5.9 },
  { id: "NY", label: "New York", rate: 10.9, note: "Top state + NYC" },
  { id: "NC", label: "North Carolina", rate: 4.5 },
  { id: "ND", label: "North Dakota", rate: 2.5 },
  { id: "OH", label: "Ohio", rate: 3.99 },
  { id: "OK", label: "Oklahoma", rate: 4.75 },
  { id: "OR", label: "Oregon", rate: 9.9 },
  { id: "PA", label: "Pennsylvania", rate: 3.07 },
  { id: "RI", label: "Rhode Island", rate: 5.99 },
  { id: "SC", label: "South Carolina", rate: 6.2 },
  { id: "VT", label: "Vermont", rate: 8.75 },
  { id: "VA", label: "Virginia", rate: 5.75 },
  { id: "WV", label: "West Virginia", rate: 6.5 },
  { id: "WI", label: "Wisconsin", rate: 7.65 },
];

export function taxStateById(id: string): TaxState | undefined {
  return TAX_STATES.find((s) => s.id === id);
}
