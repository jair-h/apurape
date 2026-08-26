"use client";

import { useState, useEffect, useRef } from "react";
import { COUNTRIES_ES } from "@/lib/countries";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

// Strip accents so "Mexico" finds "México", "Espana" finds "España"
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function CountryCombobox({
  value,
  onChange,
  placeholder = "Escribe para buscar país...",
  required,
  className,
  id,
}: Props) {
  const [query,       setQuery]       = useState(value);
  const [open,        setOpen]        = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  // Fixed-position coords to escape parent overflow:hidden
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.length >= 1
    ? COUNTRIES_ES.filter(c => norm(c).includes(norm(query)))
    : COUNTRIES_ES;

  useEffect(() => { setQuery(value); }, [value]);

  // Recalculate dropdown position when open
  const updatePos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    // Only listen to resize, not scroll — scroll fires on keyboard open/close
    // on mobile and causes the whole screen to jump
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const select = (country: string) => {
    onChange(country);
    setQuery(country);
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
      // Accept if normalized text matches a country (e.g. "Mexico" → "México")
      const exact = COUNTRIES_ES.find(c => norm(c) === norm(query.trim()));
      if (exact) {
        select(exact);
      } else {
        setQuery(value); // revert to last valid
      }
    }, 150);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
    if (e.key === "Escape")    { setOpen(false); setQuery(value); }
  };

  const isValid = value !== "" && COUNTRIES_ES.includes(value);
  const showError = query.trim() !== "" && !open && !isValid;

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
        className={`${className ?? ""} ${showError ? "border-red-400 focus:ring-red-300" : ""}`}
      />
      {showError && (
        <p className="text-[10px] text-red-500 mt-1">Selecciona un país de la lista</p>
      )}
      {open && filtered.length > 0 && dropPos && (
        <ul
          style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto"
        >
          {filtered.map((c, i) => (
            <li
              key={c}
              onMouseDown={() => select(c)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlighted
                  ? "bg-[#FEF3F2] text-[#B42318] font-semibold"
                  : "text-[#1E293B] hover:bg-gray-50"
              }`}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
