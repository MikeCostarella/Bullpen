/**
 * Any component can ask the app to open Help at a section without threading
 * a callback through every prop list (the error banner lives everywhere).
 */
export const HELP_EVENT = "bullpen:help";

export type HelpSection =
  | "start"
  | "alpaca"
  | "screens"
  | "discover"
  | "orders"
  | "fundamentals"
  | "phone"
  | "data"
  | "glossary"
  | "feedback";

export function openHelp(section?: HelpSection): void {
  window.dispatchEvent(new CustomEvent<HelpSection | undefined>(HELP_EVENT, { detail: section }));
}
