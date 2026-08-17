import { describe, expect, it } from "vitest";

import { validateDescriptionDocument } from "../../src/lib/compiler";

describe("validateDescriptionDocument", () => {
  it("rechaza entradas que no son documentos sin lanzar excepciones", () => {
    const result = validateDescriptionDocument(null);

    expect(result.valid).toBe(false);
    expect(result.document).toBeNull();
    expect(result.errors).toEqual([
      {
        code: "invalid-document",
        message: "Description document must be an object.",
        path: "$",
      },
    ]);
  });

  it("distingue una versión no soportada de una estructura inválida", () => {
    const unsupported = validateDescriptionDocument({
      schemaVersion: 2,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [],
    });
    const malformed = validateDescriptionDocument({
      schemaVersion: 1,
      theme: null,
      blocks: "not-an-array",
    });

    expect(unsupported.errors.map((issue) => issue.code)).toEqual([
      "unsupported-schema-version",
    ]);
    expect(malformed.errors.map((issue) => issue.path)).toEqual([
      "theme",
      "blocks",
    ]);
  });

  it("rechaza familias tipográficas inyectables y bloques mal formados", () => {
    const result = validateDescriptionDocument({
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Arial; position: sticky",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [
        { id: "bad-heading", type: "heading", level: 1, text: "Bad" },
        { id: "script", type: "script", source: "alert(1)" },
      ],
    });

    expect(result.errors.map((issue) => issue.code)).toEqual([
      "invalid-font-family",
      "invalid-block",
      "invalid-block",
    ]);
    expect(result.document).toBeNull();
  });

  it("reporta IDs duplicados y contenido incompleto en orden estable", () => {
    const result = validateDescriptionDocument({
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Georgia, serif",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [
        { id: "same", type: "heading", level: 2, text: "Title" },
        { id: "same", type: "paragraph", text: "Body" },
        { id: "empty-list", type: "bullet-list", items: [] },
        {
          id: "image",
          type: "image",
          src: "https://cdn.example.test/image.jpg",
          alt: "",
        },
        { id: "empty-specs", type: "specifications", items: [] },
      ],
    });

    expect(result.errors.map((issue) => issue.code)).toEqual([
      "duplicate-block-id",
    ]);
    expect(result.warnings.map((issue) => issue.code)).toEqual([
      "empty-list",
      "empty-image-alt",
      "empty-specifications",
    ]);
  });
});
