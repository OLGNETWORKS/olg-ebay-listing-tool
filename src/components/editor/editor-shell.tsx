"use client";

import { useMemo, useState } from "react";
import type {
  DescriptionBlock,
  DescriptionDocument,
  ListingProfile,
} from "../../lib/contracts";
import {
  BLOCK_LIBRARY,
  addBlock,
  buildEditorPreview,
  replaceBlock,
} from "./editor-model";

interface EditorShellProps {
  readonly initialProfile: ListingProfile;
}

const BLOCK_ICONS: Record<DescriptionBlock["type"], string> = {
  "bullet-list": "≡",
  heading: "H",
  image: "▧",
  paragraph: "¶",
  specifications: "⌗",
};

function blockLabel(block: DescriptionBlock): string {
  return BLOCK_LIBRARY.find((item) => item.type === block.type)?.label ??
    block.type;
}

interface BlockInspectorProps {
  readonly block: DescriptionBlock;
  readonly onChange: (block: DescriptionBlock) => void;
}

function BlockInspector({ block, onChange }: BlockInspectorProps) {
  switch (block.type) {
    case "heading":
      return (
        <div className="inspector-fields">
          <label>
            Texto del encabezado
            <input
              value={block.text}
              onChange={(event) => onChange({ ...block, text: event.target.value })}
            />
          </label>
          <label>
            Nivel
            <select
              value={block.level}
              onChange={(event) => onChange({
                ...block,
                level: Number(event.target.value) as 2 | 3 | 4,
              })}
            >
              <option value="2">H2</option>
              <option value="3">H3</option>
              <option value="4">H4</option>
            </select>
          </label>
        </div>
      );
    case "paragraph":
      return (
        <label>
          Contenido del párrafo
          <textarea
            rows={5}
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
        </label>
      );
    case "bullet-list":
      return (
        <label>
          Elementos, uno por línea
          <textarea
            rows={5}
            value={block.items.join("\n")}
            onChange={(event) => onChange({
              ...block,
              items: event.target.value === "" ? [] : event.target.value.split("\n"),
            })}
          />
        </label>
      );
    case "image":
      return (
        <div className="inspector-fields">
          <label>
            URL HTTPS de imagen
            <input
              inputMode="url"
              value={block.src}
              onChange={(event) => onChange({ ...block, src: event.target.value })}
            />
          </label>
          <label>
            Texto alternativo
            <input
              value={block.alt}
              onChange={(event) => onChange({ ...block, alt: event.target.value })}
            />
          </label>
          <label>
            Pie de imagen
            <input
              value={block.caption ?? ""}
              onChange={(event) => {
                const caption = event.target.value;
                if (caption === "") {
                  const { caption: _caption, ...imageWithoutCaption } = block;
                  onChange(imageWithoutCaption);
                  return;
                }
                onChange({ ...block, caption });
              }}
            />
          </label>
        </div>
      );
    case "specifications":
      return (
        <div className="inspector-fields">
          <label>
            Título de especificaciones
            <input
              value={block.heading ?? ""}
              onChange={(event) => onChange({ ...block, heading: event.target.value })}
            />
          </label>
          <label>
            Filas, una por línea como etiqueta: valor
            <textarea
              rows={5}
              value={block.items.map((item) => `${item.label}: ${item.value}`).join("\n")}
              onChange={(event) => onChange({
                ...block,
                items: event.target.value === "" ? [] : event.target.value
                  .split("\n")
                  .map((line) => {
                    const separator = line.indexOf(":");
                    return separator < 0
                      ? { label: line.trim(), value: "" }
                      : {
                          label: line.slice(0, separator).trim(),
                          value: line.slice(separator + 1).trim(),
                        };
                  }),
              })}
            />
          </label>
        </div>
      );
  }
}

export function EditorShell({ initialProfile }: EditorShellProps) {
  const [profile, setProfile] = useState(() => structuredClone(initialProfile));
  const [selectedBlockId, setSelectedBlockId] = useState(
    initialProfile.descriptionDocument.blocks[0]?.id ?? null,
  );
  const preview = useMemo(
    () => buildEditorPreview(profile.descriptionDocument),
    [profile.descriptionDocument],
  );
  const selectedBlock = profile.descriptionDocument.blocks.find(
    (block) => block.id === selectedBlockId,
  );

  function setDocument(document: DescriptionDocument) {
    setProfile((current) => ({ ...current, descriptionDocument: document }));
  }

  function handleAddBlock(type: DescriptionBlock["type"]) {
    const document = addBlock(profile.descriptionDocument, type);
    setDocument(document);
    setSelectedBlockId(document.blocks.at(-1)?.id ?? null);
  }

  function handleReplaceBlock(block: DescriptionBlock) {
    setDocument(replaceBlock(profile.descriptionDocument, block));
  }

  return (
    <main className="editor-shell" id="editor">
      <header className="app-header">
        <a className="brand" href="#editor" aria-label="OLG Listing Tool, inicio">
          <span aria-hidden="true" className="brand-mark">OLG</span>
          <span><strong>Listing Tool</strong><small>Workspace interno</small></span>
        </a>
        <nav aria-label="Navegación principal">
          <a aria-current="page" href="#editor">Editor</a>
          <a href="#preview">Preview</a>
        </nav>
        <span className="environment-badge">Modo local</span>
      </header>

      <section className="editor-intro" aria-labelledby="editor-title">
        <div>
          <p className="eyebrow">Perfil interno · revisión {profile.revision}</p>
          <h1 id="editor-title">Construye una publicación clara, bloque a bloque.</h1>
          <p>El JSON editable recompila una vista estática. No hay conexión con eBay.</p>
        </div>
        <div className="save-state" aria-live="polite">
          <span aria-hidden="true" /> Cambios locales
        </div>
      </section>

      <div className="editor-grid">
        <aside className="product-panel panel" aria-labelledby="product-title">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div><p>Contenido base</p><h2 id="product-title">Datos del producto</h2></div>
          </div>
          <div className="form-stack">
            <label>
              Título
              <input
                aria-label="Título del producto"
                value={profile.identity.title}
                onChange={(event) => setProfile((current) => ({
                  ...current,
                  identity: { ...current.identity, title: event.target.value },
                }))}
              />
            </label>
            <label>
              SKU
              <input aria-label="SKU" readOnly value={profile.identity.sku} />
            </label>
            <label>
              Precio
              <span className="input-affix">
                <span>$</span>
                <input
                  aria-label="Precio"
                  inputMode="decimal"
                  value={profile.commercial.price.amount}
                  onChange={(event) => setProfile((current) => ({
                    ...current,
                    commercial: {
                      ...current.commercial,
                      price: { ...current.commercial.price, amount: event.target.value },
                    },
                  }))}
                />
                <span>{profile.commercial.price.currency}</span>
              </span>
            </label>
          </div>

          <div className="library-heading">
            <p className="eyebrow">Biblioteca de bloques</p>
            <span>{BLOCK_LIBRARY.length} tipos</span>
          </div>
          <div className="block-library">
            {BLOCK_LIBRARY.map((item) => (
              <button
                aria-label={`Agregar bloque ${item.label}`}
                className="library-card"
                key={item.type}
                onClick={() => handleAddBlock(item.type)}
                type="button"
              >
                <span className="block-icon" aria-hidden="true">
                  {BLOCK_ICONS[item.type]}
                </span>
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                <span aria-hidden="true" className="add-icon">+</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="structure-panel panel" aria-labelledby="structure-title">
          <div className="panel-heading">
            <span className="step-number">02</span>
            <div><p>Documento JSON</p><h2 id="structure-title">Estructura del anuncio</h2></div>
          </div>
          <ol className="block-structure">
            {profile.descriptionDocument.blocks.map((block, index) => (
              <li key={block.id}>
                <button
                  aria-pressed={block.id === selectedBlockId}
                  className="structure-card"
                  onClick={() => setSelectedBlockId(block.id)}
                  type="button"
                >
                  <span className="drag-handle" aria-hidden="true">⋮⋮</span>
                  <span className="block-icon" aria-hidden="true">
                    {BLOCK_ICONS[block.type]}
                  </span>
                  <span><strong>{blockLabel(block)}</strong><small>Bloque {index + 1}</small></span>
                </button>
              </li>
            ))}
          </ol>
          <div className="block-inspector" aria-live="polite">
            <p className="eyebrow">Editar bloque seleccionado</p>
            {selectedBlock
              ? <BlockInspector block={selectedBlock} onChange={handleReplaceBlock} />
              : <p>Selecciona o agrega un bloque para editarlo.</p>}
          </div>
        </section>

        <section className="preview-panel panel" id="preview" aria-labelledby="preview-title">
          <div className="panel-heading preview-heading">
            <span className="step-number">03</span>
            <div><p>HTML/CSS estático</p><h2 id="preview-title">Vista previa del anuncio</h2></div>
            <span className={preview.errors.length === 0 ? "valid-badge" : "error-badge"}>
              {preview.errors.length === 0 ? "Compilación válida" : "Revisar errores"}
            </span>
          </div>

          <div className="compiler-feedback" aria-live="polite">
            {preview.errors.length > 0 && (
              <div className="feedback-card feedback-error" role="alert">
                <strong>Errores ({preview.errors.length})</strong>
                <ul>{preview.errors.map((issue) => (
                  <li key={`${issue.code}-${issue.path}`}>{issue.message}</li>
                ))}</ul>
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="feedback-card feedback-warning">
                <strong>Advertencias ({preview.warnings.length})</strong>
                <ul>{preview.warnings.map((issue) => (
                  <li key={`${issue.code}-${issue.path}`}>{issue.message}</li>
                ))}</ul>
              </div>
            )}
          </div>

          <div className="preview-stage">
            <div className="browser-bar" aria-hidden="true">
              <span /><span /><span /><div>preview.local</div>
            </div>
            {preview.srcDoc === null
              ? (
                <div className="preview-empty" role="status">
                  Corrige los errores del documento para habilitar el preview.
                </div>
              )
              : (
                <iframe
                  sandbox=""
                  srcDoc={preview.srcDoc}
                  title="Preview estático del anuncio"
                />
              )}
          </div>
        </section>
      </div>
    </main>
  );
}
