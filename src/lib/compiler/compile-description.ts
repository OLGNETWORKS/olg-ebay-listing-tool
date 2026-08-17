import type {
  CompilerResult,
  DescriptionBlock,
  DescriptionDocument,
} from "../contracts";
import { validateDescriptionDocument } from "./validate-description-document";
import {
  countDescriptionCharacters,
  EBAY_DESCRIPTION_MAX_CHARACTERS,
} from "./serialize-ebay-description";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderBlock(block: DescriptionBlock): string {
  const attributes = `class="olg-block olg-${block.type}" data-block-id="${escapeHtml(block.id)}"`;

  switch (block.type) {
    case "bullet-list":
      return `<section ${attributes}><ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
    case "heading":
      return `<section ${attributes}><h${block.level}>${escapeHtml(block.text)}</h${block.level}></section>`;
    case "image": {
      const caption = block.caption
        ? `<figcaption>${escapeHtml(block.caption)}</figcaption>`
        : "";
      return `<figure ${attributes}><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}">${caption}</figure>`;
    }
    case "paragraph":
      return `<section ${attributes}><p>${escapeHtml(block.text)}</p></section>`;
    case "specifications": {
      const caption = block.heading
        ? `<caption>${escapeHtml(block.heading)}</caption>`
        : "";
      const rows = block.items
        .map(
          (item) =>
            `<tr><th scope="row">${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`,
        )
        .join("");
      return `<section ${attributes}><table>${caption}<tbody>${rows}</tbody></table></section>`;
    }
  }
}

function renderCss(document: DescriptionDocument): string {
  return [
    ".olg-listing {",
    "  box-sizing: border-box;",
    "  max-width: 100%;",
    `  color: ${document.theme.textColor};`,
    `  background: ${document.theme.backgroundColor};`,
    `  font-family: ${document.theme.fontFamily};`,
    "  line-height: 1.5;",
    "}",
    ".olg-listing *, .olg-listing *::before, .olg-listing *::after {",
    "  box-sizing: inherit;",
    "}",
    ".olg-block {",
    "  max-width: 100%;",
    "  margin: 0 0 1rem;",
    "}",
    ".olg-heading h2, .olg-heading h3, .olg-heading h4 {",
    `  color: ${document.theme.primaryColor};`,
    "  margin: 0;",
    "}",
    ".olg-paragraph p {",
    "  margin: 0;",
    "}",
    ".olg-image img {",
    "  display: block;",
    "  height: auto;",
    "  max-width: 100%;",
    "}",
    ".olg-specifications table {",
    "  border-collapse: collapse;",
    "  table-layout: fixed;",
    "  width: 100%;",
    "}",
    ".olg-specifications th, .olg-specifications td {",
    "  overflow-wrap: anywhere;",
    "}",
  ].join("\n");
}

export function compileDescription(
  document: DescriptionDocument,
): CompilerResult {
  const validation = validateDescriptionDocument(document);

  if (!validation.valid) {
    return {
      css: "",
      errors: validation.errors,
      html: "",
      warnings: validation.warnings,
    };
  }

  const renderedBlocks = document.blocks.map(renderBlock);

  const css = renderCss(document);
  const html = [
    `<div class="olg-listing" data-schema-version="${document.schemaVersion}">`,
    ...renderedBlocks.map((block) => `  ${block}`),
    "</div>",
  ].join("\n");

  if (countDescriptionCharacters({ css, html }) >
      EBAY_DESCRIPTION_MAX_CHARACTERS) {
    return {
      css: "",
      errors: [
        {
          code: "description-too-long",
          message: "Compiled descriptions cannot exceed 500,000 characters.",
          path: "$",
        },
      ],
      html: "",
      warnings: validation.warnings,
    };
  }

  return {
    css,
    errors: [],
    html,
    warnings: validation.warnings,
  };
}
