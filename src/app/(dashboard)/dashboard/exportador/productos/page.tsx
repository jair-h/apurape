"use client";

import { useState, useEffect, useRef } from "react";
import {
  Package, Plus, Pencil, Trash2, Loader2, Save, X,
  ImagePlus, DollarSign, Globe, AlertCircle, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ImageHint } from "@/components/ImageHint";

/* ─── Types ───────────────────────────────────────────────── */

interface ExporterProduct {
  id: string;
  exporter_id: string;
  product_name: string;
  variety: string | null;
  scientific_name: string | null;
  hs_code: string | null;
  category: string;
  description: string | null;
  presentation: string | null;
  markets: string[];
  annual_volume_tm: number | null;
  ref_price_fob_usd: number | null;
  price_unit: string;
  available_months: string[];
  certifications: string[];
  photos: string[];
  status: "active" | "paused" | "sold_out";
  brand_name: string | null;
  is_branded: boolean;
  brand_story: string | null;
  created_at: string;
  updated_at: string | null;
}

type FormData = Omit<ExporterProduct, "id" | "exporter_id" | "created_at" | "updated_at">;

/* ─── Constants ───────────────────────────────────────────── */

const CATEGORIES = [
  { key: "fruta",     label: "Fruta" },
  { key: "verdura",   label: "Verdura" },
  { key: "grano",     label: "Grano" },
  { key: "procesado", label: "Procesado" },
  { key: "insumo",    label: "Insumo" },
  { key: "ganaderia", label: "Ganadería" },
  { key: "otro",      label: "Otro" },
];

const CERT_OPTIONS = [
  "GlobalGAP", "Orgánico USDA", "Fairtrade", "HACCP",
  "ISO 22000", "BRC", "Orgánico EU", "FSSC 22000",
];

const MONTH_NAMES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];
const MONTH_LABELS = [
  "Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic",
];

const MARKET_OPTIONS = [
  "Estados Unidos", "Países Bajos", "España", "Alemania", "Reino Unido",
  "Japón", "China", "Canadá", "Francia", "Italia", "Corea del Sur",
  "Australia", "Chile", "Colombia", "Brasil", "México", "Ecuador",
];

const PRESENTATION_OPTIONS = [
  "Caja 4 kg", "Caja 5 kg", "Caja 10 kg", "Caja 20 kg",
  "Granel", "Pallets", "Bolsa 1 kg", "Bolsa 500 g",
  "IQF", "Congelado", "Fresco refrigerado", "Deshidratado",
];

const STATUS_OPTIONS = [
  { key: "active",   label: "Activo",  cls: "bg-[#085041] text-white border-[#085041]" },
  { key: "paused",   label: "Pausado", cls: "bg-amber-500 text-white border-amber-500" },
  { key: "sold_out", label: "Agotado", cls: "bg-red-500 text-white border-red-500"     },
];

const PRODUCT_SUGGESTIONS = [
  "Palta Hass", "Arándano", "Uva de mesa", "Mango Kent", "Espárrago verde",
  "Quinua blanca", "Cacao fino de aroma", "Café especial", "Maíz morado",
  "Kiwicha", "Sacha inchi", "Maca", "Lúcuma", "Jengibre", "Cúrcuma",
  "Papa nativa", "Ají amarillo", "Pimiento piquillo", "Alcachofa", "Granada",
];

const lbl = "block text-xs font-bold text-[#085041] uppercase tracking-wider mb-1.5";
const inp = "w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-[#1E293B] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition";

/* ─── Helpers ─────────────────────────────────────────────── */

function isInSeason(months: string[]): boolean {
  return months.includes(MONTH_NAMES[new Date().getMonth()]);
}

function catLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/* ─── Month selector (text[]) ─────────────────────────────── */

function MonthSelector({ selected, onChange }: { selected: string[]; onChange: (m: string[]) => void }) {
  const toggle = (name: string) =>
    onChange(selected.includes(name) ? selected.filter((m) => m !== name) : [...selected, name]);
  return (
    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
      {MONTH_NAMES.map((name, i) => {
        const on = selected.includes(name);
        return (
          <button key={name} type="button" onClick={() => toggle(name)}
            className={`flex flex-col items-center py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
              on ? "bg-[#1D9E75] border-[#1D9E75] text-white" : "bg-white border-gray-200 text-[#6B7280] hover:border-[#1D9E75]"
            }`}>
            <span className="opacity-50 text-[8px]">{i + 1}</span>
            {MONTH_LABELS[i]}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Product card ────────────────────────────────────────── */

function ProductCard({
  product, onEdit, onDeleteRequest,
}: {
  product: ExporterProduct;
  onEdit: (p: ExporterProduct) => void;
  onDeleteRequest: (id: string) => void;
}) {
  const inSeason = isInSeason(product.available_months);
  const photo = product.photos?.[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative h-32 sm:h-44 bg-gray-100">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={product.product_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-10 w-10 text-gray-200" />
          </div>
        )}
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full ${
          inSeason ? "bg-[#1D9E75] text-white" : "bg-gray-200 text-gray-500"
        }`}>
          {inSeason ? "En temporada" : "Fuera de temporada"}
        </span>
        {product.status === "paused" && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">Pausado</span>
        )}
        {product.status === "sold_out" && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">Agotado</span>
        )}
        {product.photos.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            +{product.photos.length - 1}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mb-1.5 self-start">
          {catLabel(product.category)}
        </span>
        <h3 className="text-sm font-bold text-[#085041] mb-0.5 leading-snug">
          {product.product_name}
          {product.is_branded && product.brand_name && (
            <span className="ml-1.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full align-middle">
              {product.brand_name}
            </span>
          )}
        </h3>
        {product.variety && (
          <p className="text-[11px] text-[#6B7280] mb-1">Variedad: {product.variety}</p>
        )}
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{product.description}</p>
        )}

        <div className="space-y-1 mt-auto mb-3">
          {product.annual_volume_tm != null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Package className="h-3 w-3 text-gray-400 flex-shrink-0" />
              {product.annual_volume_tm} TM / año
            </div>
          )}
          {product.ref_price_fob_usd != null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
              USD {product.ref_price_fob_usd} / {product.price_unit}
            </div>
          )}
          {product.markets.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Globe className="h-3 w-3 text-gray-400 flex-shrink-0" />
              {product.markets.slice(0, 2).join(", ")}{product.markets.length > 2 ? ` +${product.markets.length - 2}` : ""}
            </div>
          )}
        </div>

        {product.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.certifications.slice(0, 3).map((c) => (
              <span key={c} className="text-[9px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
            ))}
            {product.certifications.length > 3 && (
              <span className="text-[9px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                +{product.certifications.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button onClick={() => onEdit(product)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-[#085041] hover:bg-[#E1F5EE] rounded-lg py-2 transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button onClick={() => onDeleteRequest(product.id)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg py-2 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Product form (slide-over) ───────────────────────────── */

function ProductForm({
  initial, userId, onSave, onClose,
}: {
  initial: ExporterProduct | null;
  userId: string;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [productName,  setProductName]  = useState(initial?.product_name ?? "");
  const [variety,      setVariety]      = useState(initial?.variety ?? "");
  const [scientName,   setScientName]   = useState(initial?.scientific_name ?? "");
  const [hsCode,       setHsCode]       = useState(initial?.hs_code ?? "");
  const [category,     setCategory]     = useState(initial?.category ?? "fruta");
  const [description,  setDescription]  = useState(initial?.description ?? "");
  const [presentation, setPresentation] = useState(initial?.presentation ?? "");
  const [markets,      setMarkets]      = useState<string[]>(initial?.markets ?? []);
  const [volume,       setVolume]       = useState(initial?.annual_volume_tm?.toString() ?? "");
  const [price,        setPrice]        = useState(initial?.ref_price_fob_usd?.toString() ?? "");
  const [priceUnit,    setPriceUnit]    = useState(initial?.price_unit ?? "kg");
  const [months,       setMonths]       = useState<string[]>(initial?.available_months ?? []);
  const [certs,        setCerts]        = useState<string[]>(initial?.certifications ?? []);
  const [status,       setStatus]       = useState<"active"|"paused"|"sold_out">(initial?.status ?? "active");
  const [isBranded,    setIsBranded]    = useState(initial?.is_branded ?? false);
  const [brandName,    setBrandName]    = useState(initial?.brand_name ?? "");
  const [brandStory,   setBrandStory]   = useState(initial?.brand_story ?? "");
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initial?.photos ?? []);
  const [newFiles,     setNewFiles]     = useState<File[]>([]);
  const [previews,     setPreviews]     = useState<string[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const totalPhotos = existingPhotos.length + newFiles.length;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.size <= 5 * 1024 * 1024);
    const allowed = Math.max(0, 5 - existingPhotos.length - newFiles.length);
    const adding = arr.slice(0, allowed);
    const merged = [...newFiles, ...adding];
    setNewFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
    if (arr.length > allowed) setError("Máximo 5 fotos en total");
    else setError("");
  };

  const removeNew = (i: number) => {
    const merged = newFiles.filter((_, idx) => idx !== i);
    setNewFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
  };

  const toggleMarket = (m: string) =>
    setMarkets((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  const handleSave = async () => {
    if (!productName.trim()) { setError("El nombre del producto es obligatorio."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();

    const uploadedUrls: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from("product-photos").upload(path, file, { upsert: false });
      if (upErr || !up) {
        setError("Error subiendo foto: " + (upErr?.message ?? "desconocido"));
        setSaving(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("product-photos").getPublicUrl(up.path);
      uploadedUrls.push(publicUrl);
    }

    await onSave({
      product_name:      productName.trim(),
      variety:           variety.trim() || null,
      scientific_name:   scientName.trim() || null,
      hs_code:           hsCode.trim() || null,
      category,
      description:       description.trim() || null,
      presentation:      presentation || null,
      markets,
      annual_volume_tm:  volume ? parseFloat(volume) : null,
      ref_price_fob_usd: price  ? parseFloat(price)  : null,
      price_unit:        priceUnit,
      available_months:  months,
      certifications:    certs,
      photos:            [...existingPhotos, ...uploadedUrls],
      status,
      is_branded:        isBranded,
      brand_name:        isBranded ? (brandName.trim() || null) : null,
      brand_story:       isBranded ? (brandStory.trim() || null) : null,
    });

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-[#085041]">
            {initial ? "Editar producto" : "Agregar producto"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className={lbl}>Nombre del producto *</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)}
              list="product-suggestions-exp" placeholder="Ej: Palta Hass" className={inp} />
            <datalist id="product-suggestions-exp">
              {PRODUCT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Variety + Scientific name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Variedad</label>
              <input value={variety} onChange={(e) => setVariety(e.target.value)}
                placeholder="Ej: Hass, Kent..." className={inp} />
            </div>
            <div>
              <label className={lbl}>Nombre científico</label>
              <input value={scientName} onChange={(e) => setScientName(e.target.value)}
                placeholder="Ej: Persea americana" className={`${inp} italic`} />
            </div>
          </div>

          {/* Category + HS Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Categoría *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Partida arancelaria</label>
              <input value={hsCode} onChange={(e) => setHsCode(e.target.value)}
                placeholder="Ej: 0804.40.00" className={inp} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="Calibre, condición, manejo de frío, empaque..." className={`${inp} resize-none`} />
          </div>

          {/* Brand */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setIsBranded(b => !b)}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${isBranded ? "bg-[#1D9E75]" : "bg-gray-200"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isBranded ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#085041]">Producto de marca propia</p>
                <p className="text-[10px] text-gray-400">Activa si exportas bajo tu propia marca</p>
              </div>
            </label>
            {isBranded && (
              <>
                <div>
                  <label className={lbl}>Nombre de la marca</label>
                  <input value={brandName} onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ej: AgroNative, FreshAndes..." className={inp} />
                </div>
                <div>
                  <label className={lbl}>Historia de la marca</label>
                  <textarea value={brandStory} onChange={(e) => setBrandStory(e.target.value)}
                    rows={3} maxLength={400}
                    placeholder="Qué hace especial a tu marca, tu historia, valores..."
                    className={`${inp} resize-none`} />
                  <p className="text-[10px] text-gray-400 mt-1">{brandStory.length}/400</p>
                </div>
              </>
            )}
          </div>

          {/* Presentation */}
          <div>
            <label className={lbl}>Presentación</label>
            <select value={presentation} onChange={(e) => setPresentation(e.target.value)} className={inp}>
              <option value="">Seleccionar presentación</option>
              {PRESENTATION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Volume + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Volumen anual</label>
              <div className="relative">
                <input type="number" min={0} step={1} placeholder="0"
                  value={volume} onChange={(e) => setVolume(e.target.value)} className={`${inp} pr-9`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">TM</span>
              </div>
            </div>
            <div>
              <label className={lbl}>Precio FOB ref.</label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <input type="number" min={0} step={0.01} placeholder="0.00"
                    value={price} onChange={(e) => setPrice(e.target.value)} className={`${inp} pr-1`} />
                </div>
                <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)}
                  className="px-2 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]">
                  <option value="kg">/ kg</option>
                  <option value="TM">/ TM</option>
                  <option value="caja">/ caja</option>
                  <option value="unidad">/ unidad</option>
                </select>
              </div>
            </div>
          </div>

          {/* Markets */}
          <div>
            <label className={lbl}>Mercados destino</label>
            <div className="flex flex-wrap gap-2">
              {MARKET_OPTIONS.map((m) => (
                <button key={m} type="button" onClick={() => toggleMarket(m)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    markets.includes(m)
                      ? "bg-blue-50 text-blue-700 border-blue-400"
                      : "bg-white text-gray-500 border-gray-200 hover:border-blue-400"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Available months */}
          <div>
            <label className={lbl}>Meses de disponibilidad</label>
            <MonthSelector selected={months} onChange={setMonths} />
            <p className="text-[10px] text-gray-400 mt-1.5">
              {months.length === 0
                ? "Sin meses seleccionados"
                : `Disponible en: ${MONTH_NAMES.filter((m) => months.includes(m)).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")}`}
            </p>
          </div>

          {/* Certifications */}
          <div>
            <label className={lbl}>Certificaciones</label>
            <div className="flex flex-wrap gap-2">
              {CERT_OPTIONS.map((c) => (
                <button key={c} type="button"
                  onClick={() => setCerts((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    certs.includes(c)
                      ? "bg-[#E1F5EE] text-[#085041] border-[#1D9E75]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-[#1D9E75]"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>Estado del producto</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button key={s.key} type="button"
                  onClick={() => setStatus(s.key as "active"|"paused"|"sold_out")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    status === s.key ? s.cls : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className={lbl}>Fotos del producto ({totalPhotos}/5)</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {existingPhotos.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => setExistingPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {previews.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#1D9E75]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNew(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {totalPhotos < 5 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1D9E75] flex items-center justify-center text-gray-400 hover:text-[#1D9E75] transition-colors">
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
              className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <ImageHint />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
              : <><Save className="h-4 w-4" /> {initial ? "Actualizar" : "Publicar"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete confirmation ─────────────────────────────────── */

function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-[#085041] text-center mb-1">¿Eliminar producto?</h3>
        <p className="text-sm text-gray-500 text-center mb-5">Esta acción no se puede deshacer. El producto dejará de ser visible.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ExportadorProductosPage() {
  const [products,  setProducts]  = useState<ExporterProduct[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<ExporterProduct | null>(null);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [userId,    setUserId]    = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("exporter_products")
        .select("*")
        .eq("exporter_id", user.id)
        .order("created_at", { ascending: false });
      setProducts(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const openAdd  = () => { setEditing(null);    setShowForm(true); };
  const openEdit = (p: ExporterProduct) => { setEditing(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async (formData: FormData) => {
    if (!userId) return;
    const supabase = createClient();
    if (editing) {
      const { data: updated } = await supabase
        .from("exporter_products")
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq("id", editing.id)
        .select()
        .single();
      if (updated) setProducts((p) => p.map((x) => x.id === editing.id ? updated : x));
    } else {
      const { data: inserted } = await supabase
        .from("exporter_products")
        .insert({ ...formData, exporter_id: userId })
        .select()
        .single();
      if (inserted) setProducts((p) => [inserted, ...p]);
    }
    closeForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const supabase = createClient();
    await supabase.from("exporter_products").delete().eq("id", deleteId);
    setProducts((p) => p.filter((x) => x.id !== deleteId));
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Productos que exporto</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {products.length === 0
              ? "Sin productos publicados"
              : `${products.length} producto${products.length !== 1 ? "s" : ""} publicado${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Agregar producto
        </button>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-5">
            <Globe className="h-10 w-10 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-[#085041] mb-2">Aún no has publicado productos</h2>
          <p className="text-sm text-gray-500 max-w-xs mb-8 leading-relaxed">
            Publica los productos que exportas para que los compradores internacionales te encuentren.
          </p>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Agregar primer producto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onEdit={openEdit} onDeleteRequest={setDeleteId} />
          ))}
        </div>
      )}

      {showForm && userId && (
        <ProductForm initial={editing} userId={userId} onSave={handleSave} onClose={closeForm} />
      )}
      {deleteId && (
        <DeleteModal onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}
    </div>
  );
}

