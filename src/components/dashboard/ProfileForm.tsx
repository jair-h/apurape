"use client";

/* Formulario de perfil, compartido por Proveedor y Cliente.
 *
 * Escribe en dos tablas: los datos públicos van a `profiles` y los de
 * contacto/identidad a `profile_private`, que solo lee su dueño (en Apurape
 * el teléfono estaba en profiles con SELECT abierto a cualquiera).
 *
 * Las columnas sensibles (rol, plan, verificado, contadores) no se mandan:
 * el trigger guard_profile_columns las revertiría igual. */

import { useState, useEffect } from "react";
import { Loader2, Save, Check, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Props { accent: string; accentHover: string; }

interface PublicFields {
  name: string; business_name: string; bio: string;
  account_type: string; region: string; province: string; district: string;
}
interface PrivateFields {
  phone: string; whatsapp: string; doc_type: string; doc_number: string;
}

const DOC_TYPES = [
  { value: "",          label: "—" },
  { value: "dni",       label: "DNI" },
  { value: "ruc",       label: "RUC" },
  { value: "ce",        label: "Carné de extranjería" },
  { value: "pasaporte", label: "Pasaporte" },
];

export default function ProfileForm({ accent, accentHover }: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [role, setRole]       = useState("cliente");

  const [pub, setPub] = useState<PublicFields>({
    name: "", business_name: "", bio: "", account_type: "persona",
    region: "", province: "", district: "",
  });
  const [priv, setPriv] = useState<PrivateFields>({
    phone: "", whatsapp: "", doc_type: "", doc_number: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: p }, { data: pp }] = await Promise.all([
        supabase.from("profiles")
          .select("name, business_name, bio, account_type, region, province, district, role")
          .eq("id", user.id).maybeSingle(),
        supabase.from("profile_private")
          .select("phone, whatsapp, doc_type, doc_number")
          .eq("id", user.id).maybeSingle(),
      ]);

      if (p) {
        setRole(p.role ?? "cliente");
        setPub({
          name: p.name ?? "", business_name: p.business_name ?? "", bio: p.bio ?? "",
          account_type: p.account_type ?? "persona",
          region: p.region ?? "", province: p.province ?? "", district: p.district ?? "",
        });
      }
      if (pp) {
        setPriv({
          phone: pp.phone ?? "", whatsapp: pp.whatsapp ?? "",
          doc_type: pp.doc_type ?? "", doc_number: pp.doc_number ?? "",
        });
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error: e1 } = await supabase.from("profiles").update({
      name:         pub.name.trim() || null,
      business_name: pub.business_name.trim() || null,
      bio:          pub.bio.trim() || null,
      account_type: pub.account_type,
      region:       pub.region.trim() || null,
      province:     pub.province.trim() || null,
      district:     pub.district.trim() || null,
    }).eq("id", user.id);

    // upsert: la fila puede no existir si el usuario es anterior al trigger.
    const { error: e2 } = await supabase.from("profile_private").upsert({
      id:         user.id,
      phone:      priv.phone.trim() || null,
      whatsapp:   priv.whatsapp.trim() || null,
      doc_type:   priv.doc_type || null,
      doc_number: priv.doc_number.trim() || null,
    });

    if (e1 || e2) setError((e1 ?? e2)!.message);
    else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    setSaving(false);
  };

  const labelClass = "block text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-1";
  const inputClass = `w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent`;
  const ring = { boxShadow: undefined } as React.CSSProperties;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900">Mi perfil</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {role === "proveedor"
              ? "Así te ven los clientes cuando te encuentran."
              : "Tus datos para que los proveedores sepan a quién le cotizan."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
        )}

        {/* Público */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4 space-y-4">
          <p className="text-xs font-bold text-gray-900">Datos públicos</p>

          <div>
            <label className={labelClass}>Tipo de cuenta</label>
            <div className="flex gap-2">
              {["persona", "negocio"].map(t => (
                <button key={t} type="button" onClick={() => setPub(p => ({ ...p, account_type: t }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors capitalize ${pub.account_type === t ? "text-white" : "bg-white text-[#6B7280] border-gray-200"}`}
                  style={pub.account_type === t ? { background: accent, borderColor: accent } : ring}>
                  {t}
                </button>
              ))}
            </div>
            {role === "proveedor" && (
              <p className="text-[10px] text-gray-400 mt-1">
                Define el precio del plan Pro: S/120 al año persona, S/330 negocio.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Nombre completo</label>
            <input type="text" value={pub.name} onChange={e => setPub(p => ({ ...p, name: e.target.value }))}
              placeholder="Tu nombre y apellidos" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>
              {pub.account_type === "negocio" ? "Nombre del negocio" : "Nombre comercial (opcional)"}
            </label>
            <input type="text" value={pub.business_name}
              onChange={e => setPub(p => ({ ...p, business_name: e.target.value }))}
              placeholder="Ej. Gasfitería Ramírez" className={inputClass} />
            <p className="text-[10px] text-gray-400 mt-1">Si lo llenas, es el nombre que se muestra.</p>
          </div>

          <div>
            <label className={labelClass}>Sobre ti</label>
            <textarea rows={3} value={pub.bio} onChange={e => setPub(p => ({ ...p, bio: e.target.value }))}
              placeholder="Cuéntale a tus clientes quién eres y qué haces."
              className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Región</label>
              <input type="text" value={pub.region} onChange={e => setPub(p => ({ ...p, region: e.target.value }))}
                placeholder="Lima" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Provincia</label>
              <input type="text" value={pub.province} onChange={e => setPub(p => ({ ...p, province: e.target.value }))}
                placeholder="Lima" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Distrito</label>
              <input type="text" value={pub.district} onChange={e => setPub(p => ({ ...p, district: e.target.value }))}
                placeholder="Miraflores" className={inputClass} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            Sin distrito no apareces en las búsquedas por zona.
          </p>
        </div>

        {/* Privado */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-[#6B7280]" />
            <p className="text-xs font-bold text-gray-900">Datos privados</p>
          </div>
          <p className="text-[11px] text-[#6B7280] leading-relaxed -mt-2">
            Solo los ves tú y el equipo de Apurape. El contacto con la otra
            persona ocurre por el chat, no por teléfono.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input type="tel" value={priv.phone} onChange={e => setPriv(p => ({ ...p, phone: e.target.value }))}
                placeholder="+51 999 888 777" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input type="tel" value={priv.whatsapp} onChange={e => setPriv(p => ({ ...p, whatsapp: e.target.value }))}
                placeholder="+51 999 888 777" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo de documento</label>
              <select value={priv.doc_type} onChange={e => setPriv(p => ({ ...p, doc_type: e.target.value }))}
                className={inputClass}>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Número</label>
              <input type="text" value={priv.doc_number} onChange={e => setPriv(p => ({ ...p, doc_number: e.target.value }))}
                placeholder="12345678" className={inputClass} />
            </div>
          </div>
        </div>

        <button type="button" onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50"
          style={{ background: saved ? "#0E9384" : accent }}
          onMouseOver={e => { if (!saved) e.currentTarget.style.background = accentHover; }}
          onMouseOut={e => { if (!saved) e.currentTarget.style.background = accent; }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Guardado" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
