/** USPS codes → names, as the SEC reports them in stprba. DC and PR included because filers use them. */
export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/**
 * Regions by 3-digit ZIP prefix (USPS sectional centers), which is far more
 * reliable than city-name matching. Add your own.
 */
export interface Region {
  id: string;
  title: string;
  zip3: string[];
}
export const REGIONS: Region[] = [
  { id: "mahoning", title: "Mahoning Valley", zip3: ["444", "445"] },
  { id: "neo", title: "Northeast Ohio", zip3: ["440", "441", "442", "443", "444", "445", "446", "447"] },
  { id: "pgh", title: "Pittsburgh", zip3: ["150", "151", "152", "153"] },
  { id: "cbus", title: "Columbus", zip3: ["430", "431", "432"] },
  { id: "cincy", title: "Cincinnati", zip3: ["450", "451", "452"] },
];
