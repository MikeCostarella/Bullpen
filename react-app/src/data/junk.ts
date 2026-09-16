/**
 * Listings that clutter any broad list without teaching a beginner anything:
 * warrants, units, rights, preferreds, depositary shares, and the SPAC /
 * blank-check shells that issue most of them. Matched on the asset-master
 * name (and the symbol for the ".WS"/".U" suffix forms).
 */
export const JUNK_SYMBOL = /[.\/]/; // e.g. SLND.WS, ABC.U
export const JUNK_NAME = /\b(warrants?|rights?|units?|preferred|depositary)\b/i;
export const SPAC_NAME = /\b(SPAC|acquisition (corp|co|company|corporation)|blank check|capital corp(oration)? [IVX]+)\b/i;

/** true when the listing is a derivative security or a SPAC shell. */
export function isJunk(symbol: string, name: string | undefined): boolean {
  return JUNK_SYMBOL.test(symbol) || (!!name && (JUNK_NAME.test(name) || SPAC_NAME.test(name)));
}
