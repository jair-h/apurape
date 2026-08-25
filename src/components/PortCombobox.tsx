"use client";

import { useState, useRef, useEffect } from "react";
import { PORTS, PERU_PORTS, type Port } from "@/lib/ports";
import { Anchor, Plane, PenLine } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  /** Show this country's ports first in the list */
  priorityCountry?: string;
  /** @deprecated use priorityCountry="Perú" */
  onlyPeru?: boolean;
}

// Strip accents: "callao" → "callao", "Santos" → "santos"
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PortCombobox({
  value,
  onChange,
  placeholder = "Buscar puerto o aeropuerto...",
  required,
  className,
  id,
  priorityCountry,
  onlyPeru,
}: Props) {
  // Backward compat: onlyPeru=true → treat as priorityCountry="Perú" but show all
  const effectivePriority = priorityCountry ?? (onlyPeru ? "Perú" : undefined);
  const pool = PORTS; // always show all ports; priorityCountry just reorders

  const [query,       setQuery]       = useState(value);
  const [open,        setOpen]        = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Base pool sorted so priority-country ports come first
  const sorted: Port[] = effectivePriority
    ? [
        ...pool.filter(p => p.country === effectivePriority),
        ...pool.filter(p => p.country !== effectivePriority),
      ]
    : pool;

  // Filter by query, preserving priority order
  const matches: Port[] = query.length >= 1
    ? sorted.filter(p =>
        norm(p.name).includes(norm(query)) ||
        norm(p.country).includes(norm(query))
      )
    : sorted;

  // "Use custom text" option — shown when query doesn't exactly match any port
  const queryTrimmed = query.trim();
  const hasExactMatch = pool.some(p => norm(p.name) === norm(queryTrimmed));
  const showCustomOption = queryTrimmed.length >= 2 && !hasExactMatch;

  useEffect(() => { setQuery(value); }, [value]);

  const updatePos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    // Only resize, not scroll — scroll fires on mobile keyboard open/close
    // causing the whole screen to jump on re-render
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const select = (portName: string) => {
    onChange(portName);
    setQuery(portName);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHighlighted(0);
    setOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      // Ports allow free text — accept whatever the user typed
      if (queryTrimmed) {
        // If it matches a known port (normalized), use canonical name
        const exact = pool.find(p => norm(p.name) === norm(queryTrimmed));
        onChange(exact ? exact.name : queryTrimmed);
        if (exact) setQuery(exact.name);
      } else {
        onChange("");
        setQuery("");
      }
    }, 150);
  };

  const totalOptions = matches.length + (showCustomOption ? 1 : 0);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || totalOptions === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, totalOptions - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted < matches.length) {
        if (matches[highlighted]) select(matches[highlighted].name);
      } else {
        select(queryTrimmed); // custom option
      }
    }
    if (e.key === "Escape") { setOpen(false); }
  };

  const showDropdown = open && (matches.length > 0 || showCustomOption) && dropPos;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        required={required}
        value={query}
        onChange={handleChange}
        onFocus={() => { setOpen(true); updatePos(); }}
        onBlur={handleBlur}
        onKeyDown={handleKey}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {showDropdown && (
        <ul
          style={{ top: dropPos!.top, left: dropPos!.left, width: dropPos!.width }}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto"
        >
          {/* Priority country header label */}
          {effectivePriority && matches.length > 0 && matches[0]?.country === effectivePriority && (
            <li className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">
              {effectivePriority}
            </li>
          )}
          {matches.map((p, i) => {
            const isPriority = effectivePriority && p.country === effectivePriority;
            const prevIsPriority = i > 0 && effectivePriority && matches[i - 1].country === effectivePriority;
            const showSeparator = effectivePriority && i > 0 && !isPriority && prevIsPriority;
            return (
              <li key={`${p.name}-${p.country}`}>
                {showSeparator && (
                  <div className="mx-3 my-1 border-t border-gray-100" />
                )}
                <div
                  onMouseDown={() => select(p.name)}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                    i === highlighted
                      ? "bg-[#E1F5EE] text-[#085041]"
                      : "text-[#1E293B] hover:bg-gray-50"
                  }`}
                >
                  {p.type === "aereo"
                    ? <Plane className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                    : <Anchor className="h-3.5 w-3.5 flex-shrink-0 text-[#1D9E75]" />}
                  <span className="text-sm font-medium leading-tight">{p.name}</span>
                  <span className="text-xs text-gray-400 truncate">{p.country}</span>
                </div>
              </li>
            );
          })}
          {/* Free-text "custom port" option */}
          {showCustomOption && (
            <li
              onMouseDown={() => select(queryTrimmed)}
              className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 border-t border-dashed border-gray-200 ${
                highlighted === matches.length
                  ? "bg-amber-50 text-amber-800"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <PenLine className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
              <span className="text-sm">Usar <span className="font-semibold">"{queryTrimmed}"</span></span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
