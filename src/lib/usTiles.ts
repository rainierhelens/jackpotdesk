export type UsTile = {
  id: string;
  name: string;
  col: number;
  row: number;
};

/** Equal-area US tile cartogram so Texas/Alaska do not dominate the heat. */
export const US_TILES: UsTile[] = [
  { id: "AK", name: "Alaska", col: 0, row: 0 },
  { id: "ME", name: "Maine", col: 11, row: 0 },
  { id: "WI", name: "Wisconsin", col: 6, row: 1 },
  { id: "VT", name: "Vermont", col: 10, row: 1 },
  { id: "NH", name: "New Hampshire", col: 11, row: 1 },
  { id: "WA", name: "Washington", col: 1, row: 2 },
  { id: "ID", name: "Idaho", col: 2, row: 2 },
  { id: "MT", name: "Montana", col: 3, row: 2 },
  { id: "ND", name: "North Dakota", col: 4, row: 2 },
  { id: "MN", name: "Minnesota", col: 5, row: 2 },
  { id: "IL", name: "Illinois", col: 6, row: 2 },
  { id: "MI", name: "Michigan", col: 7, row: 2 },
  { id: "NY", name: "New York", col: 9, row: 2 },
  { id: "MA", name: "Massachusetts", col: 10, row: 2 },
  { id: "RI", name: "Rhode Island", col: 11, row: 2 },
  { id: "OR", name: "Oregon", col: 1, row: 3 },
  { id: "NV", name: "Nevada", col: 2, row: 3 },
  { id: "WY", name: "Wyoming", col: 3, row: 3 },
  { id: "SD", name: "South Dakota", col: 4, row: 3 },
  { id: "IA", name: "Iowa", col: 5, row: 3 },
  { id: "IN", name: "Indiana", col: 6, row: 3 },
  { id: "OH", name: "Ohio", col: 7, row: 3 },
  { id: "PA", name: "Pennsylvania", col: 8, row: 3 },
  { id: "NJ", name: "New Jersey", col: 9, row: 3 },
  { id: "CT", name: "Connecticut", col: 10, row: 3 },
  { id: "CA", name: "California", col: 1, row: 4 },
  { id: "UT", name: "Utah", col: 2, row: 4 },
  { id: "CO", name: "Colorado", col: 3, row: 4 },
  { id: "NE", name: "Nebraska", col: 4, row: 4 },
  { id: "MO", name: "Missouri", col: 5, row: 4 },
  { id: "KY", name: "Kentucky", col: 6, row: 4 },
  { id: "WV", name: "West Virginia", col: 7, row: 4 },
  { id: "VA", name: "Virginia", col: 8, row: 4 },
  { id: "MD", name: "Maryland", col: 9, row: 4 },
  { id: "DE", name: "Delaware", col: 10, row: 4 },
  { id: "AZ", name: "Arizona", col: 2, row: 5 },
  { id: "NM", name: "New Mexico", col: 3, row: 5 },
  { id: "KS", name: "Kansas", col: 4, row: 5 },
  { id: "AR", name: "Arkansas", col: 5, row: 5 },
  { id: "TN", name: "Tennessee", col: 6, row: 5 },
  { id: "NC", name: "North Carolina", col: 7, row: 5 },
  { id: "SC", name: "South Carolina", col: 8, row: 5 },
  { id: "DC", name: "Washington, D.C.", col: 9, row: 5 },
  { id: "OK", name: "Oklahoma", col: 4, row: 6 },
  { id: "LA", name: "Louisiana", col: 5, row: 6 },
  { id: "MS", name: "Mississippi", col: 6, row: 6 },
  { id: "AL", name: "Alabama", col: 7, row: 6 },
  { id: "GA", name: "Georgia", col: 8, row: 6 },
  { id: "HI", name: "Hawaii", col: 0, row: 7 },
  { id: "TX", name: "Texas", col: 4, row: 7 },
  { id: "FL", name: "Florida", col: 8, row: 7 },
  { id: "PR", name: "Puerto Rico", col: 9, row: 7 },
];

export const STATE_NAME = Object.fromEntries(
  US_TILES.map((t) => [t.id, t.name]),
) as Record<string, string>;
