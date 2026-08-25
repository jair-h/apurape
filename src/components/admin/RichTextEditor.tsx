"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Quote, Minus, Link2, Image as ImageIcon, Video as YoutubeIcon, Table as TableIcon,
  Undo, Redo, Heading1, Heading2, Heading3, Loader2, X, Blocks, ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* --- Reusable content blocks ------------------------------- */
const REUSABLE_BLOCKS: { label: string; html: string }[] = [
  {
    label: "Llamado a la acción (CTA)",
    html: `<blockquote><p><strong>¿Listo para exportar con MARKARU?</strong> Crea tu cuenta gratis y conecta con compradores internacionales verificados.</p></blockquote>`,
  },
  {
    label: "Nota destacada",
    html: `<blockquote><p>💡 <strong>Dato clave:</strong> Escribe aquí la idea que quieres resaltar para el lector.</p></blockquote>`,
  },
  {
    label: "Tabla de datos (2 columnas)",
    html: `<table><tbody><tr><th>Concepto</th><th>Detalle</th></tr><tr><td>Ejemplo</td><td>Valor</td></tr></tbody></table><p></p>`,
  },
];

/* --- Toolbar button ---------------------------------------- */
function TB({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={title}
      className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
        active ? "bg-[#085041] text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="w-px h-6 bg-gray-200 mx-0.5" />;

interface Props {
  value: string;
  onChange: (html: string) => void;
  folder?: string;
}

export function RichTextEditor({ value, onChange, folder = "blog" }: Props) {
  const [, force] = useReducer((x) => x + 1, 0);
  const [imgDialog, setImgDialog] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: "rounded-xl" } }),
      Youtube.configure({ width: 640, height: 360, nocookie: true }),
      TableKit.configure({ table: { resizable: true } }),
      Placeholder.configure({ placeholder: "Escribe aquí el contenido del artículo… Usa la barra para dar formato, insertar imágenes, tablas o videos." }),
    ],
    content: value || "",
    editorProps: { attributes: { class: "rich-content focus:outline-none px-4 py-4" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  /* keep toolbar active-states in sync */
  useEffect(() => {
    if (!editor) return;
    const update = () => force();
    editor.on("transaction", update);
    editor.on("selectionUpdate", update);
    return () => { editor.off("transaction", update); editor.off("selectionUpdate", update); };
  }, [editor]);

  /* sync external value (e.g. loading a post to edit) when it truly differs */
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="border border-gray-200 rounded-xl h-80 flex items-center justify-center bg-gray-50">
        <Loader2 className="h-5 w-5 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace:", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = window.prompt("URL del video de YouTube:");
    if (url) editor.commands.setYoutubeVideo({ src: url });
  };

  const insertBlock = (html: string) => {
    editor.chain().focus().insertContent(html).run();
    setBlocksOpen(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1.5 bg-gray-50 sticky top-0 z-10">
        <TB title="Título H1" active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></TB>
        <TB title="Título H2" active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></TB>
        <TB title="Título H3" active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></TB>
        <Divider />
        <TB title="Negrita" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></TB>
        <TB title="Cursiva" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></TB>
        <TB title="Subrayado" active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></TB>
        <TB title="Tachado" active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></TB>
        <Divider />
        <TB title="Lista" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></TB>
        <TB title="Lista numerada" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></TB>
        <TB title="Cita" active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></TB>
        <TB title="Separador"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></TB>
        <Divider />
        <TB title="Enlace" active={editor.isActive("link")} onClick={setLink}><Link2 className="h-4 w-4" /></TB>
        <TB title="Imagen" onClick={() => setImgDialog(true)}><ImageIcon className="h-4 w-4" /></TB>
        <TB title="Video de YouTube" onClick={addYoutube}><YoutubeIcon className="h-4 w-4" /></TB>
        <TB title="Insertar tabla"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></TB>
        <div className="relative">
          <TB title="Bloques reutilizables" active={blocksOpen} onClick={() => setBlocksOpen((o) => !o)}>
            <span className="flex items-center gap-0.5"><Blocks className="h-4 w-4" /><ChevronDown className="h-3 w-3" /></span>
          </TB>
          {blocksOpen && (
            <div className="absolute z-20 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1">
              {REUSABLE_BLOCKS.map((b) => (
                <button key={b.label} type="button" onClick={() => insertBlock(b.html)}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#E1F5EE] hover:text-[#085041] transition-colors">
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Divider />
        <TB title="Deshacer" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></TB>
        <TB title="Rehacer" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></TB>
      </div>

      {/* Editable area */}
      <EditorContent editor={editor} />

      {imgDialog && (
        <ImageDialog editor={editor} folder={folder} onClose={() => setImgDialog(false)} />
      )}
    </div>
  );
}

/* --- Image dialog: upload + ALT + description --------------- */
function ImageDialog({ editor, folder, onClose }: { editor: Editor; folder: string; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl]           = useState("");
  const [alt, setAlt]           = useState("");
  const [desc, setDesc]         = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition";

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) { setError("La imagen no puede superar 10 MB."); return; }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("operation-docs").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setError(`Error al subir: ${upErr.message}`); setUploading(false); return; }
    const { data } = supabase.storage.from("operation-docs").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  };

  const insert = () => {
    if (!url) return;
    editor.chain().focus().setImage({ src: url, alt: alt || undefined, title: desc || undefined }).run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-extrabold text-[#085041]">Insertar imagen</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... o sube un archivo" className={inputCls} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:border-[#1D9E75] hover:text-[#1D9E75] disabled:opacity-50 transition-all whitespace-nowrap">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Subir"}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </div>
          {url && <img src={url} alt="" className="w-full h-32 object-cover rounded-xl" />}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Texto ALT (accesibilidad y SEO)</label>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe la imagen" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descripción (opcional)</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Pie de foto o contexto" className={inputCls} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280]">Cancelar</button>
          <button type="button" onClick={insert} disabled={!url}
            className="flex-1 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] disabled:opacity-50">Insertar imagen</button>
        </div>
      </div>
    </div>
  );
}
