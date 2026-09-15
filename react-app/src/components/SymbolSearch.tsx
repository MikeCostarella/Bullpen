import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSymbolIndex } from "../app/SymbolIndexContext";

interface Props {
  value: string;
  onChange: (raw: string) => void;
  /** Fired with a validated, upper-cased symbol (Enter, tap on a suggestion, or the action button). */
  onPick: (symbol: string) => void;
  placeholder?: string;
  /** Renders a trailing button (e.g. "Add") that behaves like pressing Enter. */
  actionLabel?: string;
  id?: string;
  autoFocus?: boolean;
}

const LIMIT = 8;

/**
 * Ticker/company type-ahead over the cached symbol index. Type "app" and
 * get APP, AAPL, Apple Hospitality…; pick with tap, ↑/↓ + Enter, or the
 * action button. Enter with nothing highlighted takes the typed text as a
 * ticker — after checking it exists, so typos never reach the watchlist.
 * Until the index has loaded (first run, slow network) it degrades to the
 * old behaviour: any text is accepted as-is.
 */
export function SymbolSearch({ value, onChange, onPick, placeholder = "Symbol or company", actionLabel, id, autoFocus }: Props) {
  const index = useSymbolIndex();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [problem, setProblem] = useState<string>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const matches = useMemo(() => index.search(value, LIMIT), [index, value]);
  const showList = open && value.trim().length > 0 && matches.length > 0;

  useEffect(() => setCursor(0), [value]);
  useEffect(() => setProblem(undefined), [value]);

  // Close when tapping anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (symbol: string) => {
    setOpen(false);
    setProblem(undefined);
    onPick(symbol.toUpperCase());
  };

  /** Enter / action button: highlighted suggestion wins, else validate the typed text. */
  const commit = () => {
    const typed = value.trim().toUpperCase();
    if (!typed) return;
    if (showList && matches[cursor]) return pick(matches[cursor].symbol);
    if (index.status === "ready" && index.isUnknown(typed)) {
      setProblem(`${typed} isn't a tradable US symbol. Try searching by company name.`);
      setOpen(true);
      return;
    }
    pick(typed);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        if (matches.length) {
          e.preventDefault();
          setOpen(true);
          setCursor((c) => (c + 1) % matches.length);
        }
        break;
      case "ArrowUp":
        if (matches.length) {
          e.preventDefault();
          setOpen(true);
          setCursor((c) => (c - 1 + matches.length) % matches.length);
        }
        break;
      case "Enter":
        e.preventDefault(); // never submit an enclosing form (the order ticket!)
        commit();
        break;
      case "Escape":
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className="symsearch" ref={wrapRef}>
      <div className="symsearch__row">
        <input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
        />
        {actionLabel && (
          <button className="btn btn--ghost" type="button" onClick={commit} disabled={!value.trim()}>
            {actionLabel}
          </button>
        )}
      </div>

      {showList && (
        <ul className="symsearch__list" id={listId} role="listbox">
          {matches.map((m, i) => (
            <li
              key={m.symbol}
              role="option"
              aria-selected={i === cursor}
              className={`symsearch__item ${i === cursor ? "symsearch__item--active" : ""}`}
              onPointerDown={(e) => e.preventDefault() /* keep focus on the input */}
              onClick={() => pick(m.symbol)}
              onMouseEnter={() => setCursor(i)}
            >
              <span className="symsearch__sym">{m.symbol}</span>
              <span className="symsearch__name">{m.name}</span>
              <span className="symsearch__exch">{m.exchange}</span>
            </li>
          ))}
        </ul>
      )}

      {problem && <div className="symsearch__problem">{problem}</div>}
      {open && value.trim() && !showList && !problem && index.status === "loading" && (
        <div className="symsearch__hint">Loading symbol list…</div>
      )}
      {open && value.trim() && !showList && !problem && index.status === "ready" && (
        <div className="symsearch__hint">No matches for “{value.trim()}”.</div>
      )}
    </div>
  );
}
