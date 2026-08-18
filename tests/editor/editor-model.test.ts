import { describe, expect, it } from "vitest";

import {
  BLOCK_LIBRARY,
  addBlock,
  buildEditorPreview,
  listingProfileFixture,
  replaceBlock,
} from "../../src/components/editor/editor-model";

describe("editor model", () => {
  it("parte de un ListingProfile local y produce un preview estático válido", () => {
    const preview = buildEditorPreview(
      listingProfileFixture.descriptionDocument,
    );

    expect(listingProfileFixture.identity.sku).toBe("OLG-DEMO-001");
    expect(preview.errors).toEqual([]);
    expect(preview.srcDoc).toContain("Garmin DriveSmart 76");
    expect(preview.srcDoc).not.toMatch(/<script\b/i);
    expect(preview.srcDoc).toContain('http-equiv="Content-Security-Policy"');
    expect(preview.srcDoc).toContain("default-src 'none'");
    expect(preview.srcDoc).toContain("img-src data:");
    expect(preview.srcDoc).toContain('name="referrer" content="no-referrer"');
  });

  it("ofrece los cinco bloques congelados por el contrato", () => {
    expect(BLOCK_LIBRARY.map((item) => item.type)).toEqual([
      "heading",
      "paragraph",
      "bullet-list",
      "image",
      "specifications",
    ]);

    let document = listingProfileFixture.descriptionDocument;
    for (const item of BLOCK_LIBRARY) document = addBlock(document, item.type);

    expect(document.blocks.slice(-5).map((block) => block.type)).toEqual(
      BLOCK_LIBRARY.map((item) => item.type),
    );
  });

  it("actualiza el JSON por bloques de forma inmutable y recompila el cambio", () => {
    const original = addBlock(
      listingProfileFixture.descriptionDocument,
      "paragraph",
    );
    const paragraph = original.blocks.at(-1);
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("Expected a paragraph fixture.");
    }

    const updated = replaceBlock(original, {
      ...paragraph,
      text: "Navegación clara para cada ruta.",
    });

    expect(original.blocks.at(-1)).not.toEqual(updated.blocks.at(-1));
    expect(buildEditorPreview(updated).srcDoc).toContain(
      "Navegación clara para cada ruta.",
    );
  });

  it("no construye srcDoc cuando el compilador devuelve errores", () => {
    const withImage = addBlock(
      listingProfileFixture.descriptionDocument,
      "image",
    );
    const image = withImage.blocks.at(-1);
    if (!image || image.type !== "image") throw new Error("Expected image.");
    const invalid = replaceBlock(withImage, {
      ...image,
      src: "http://insecure.example.test/product.jpg",
    });

    const preview = buildEditorPreview(invalid);

    expect(preview.errors.map((issue) => issue.code)).toContain(
      "insecure-image-url",
    );
    expect(preview.srcDoc).toBeNull();
  });

  it("conserva advertencias visibles sin bloquear un preview válido", () => {
    const withImage = addBlock(
      listingProfileFixture.descriptionDocument,
      "image",
    );
    const image = withImage.blocks.at(-1);
    if (!image || image.type !== "image") throw new Error("Expected image.");
    const warning = replaceBlock(withImage, { ...image, alt: "" });

    const preview = buildEditorPreview(warning);

    expect(preview.warnings.map((issue) => issue.code)).toContain(
      "empty-image-alt",
    );
    expect(preview.srcDoc).not.toBeNull();
  });
});
