import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ListingProfile } from "../../src/lib/contracts";
import { EditorShell } from "../../src/components/editor/editor-shell";
import {
  BLOCK_LIBRARY,
  listingProfileFixture,
} from "../../src/components/editor/editor-model";

describe("EditorShell", () => {
  it("separa producto, bloques y preview con controles etiquetados", () => {
    const markup = renderToStaticMarkup(createElement(EditorShell, {
      initialProfile: listingProfileFixture,
    }));

    expect(markup).toContain("Datos del producto");
    expect(markup).toContain("Biblioteca de bloques");
    expect(markup).toContain("Estructura del anuncio");
    expect(markup).toContain("Vista previa del anuncio");
    expect(markup).toContain('aria-label="Título del producto"');
    expect(markup).toContain('title="Preview estático del anuncio"');
    expect(markup).toContain('sandbox=""');
    for (const item of BLOCK_LIBRARY) {
      expect(markup).toContain(`Agregar bloque ${item.label}`);
    }
    expect(markup).not.toMatch(/>Publicar</i);
  });

  it("expone el error y retira el iframe cuando el documento es inválido", () => {
    const invalidProfile: ListingProfile = {
      ...structuredClone(listingProfileFixture),
      descriptionDocument: {
        ...structuredClone(listingProfileFixture.descriptionDocument),
        blocks: [
          {
            alt: "Producto",
            id: "invalid-image",
            src: "http://insecure.example.test/product.jpg",
            type: "image",
          },
        ],
      },
    };

    const markup = renderToStaticMarkup(createElement(EditorShell, {
      initialProfile: invalidProfile,
    }));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Image URLs must use HTTPS");
    expect(markup).toContain("Pie de imagen");
    expect(markup).not.toContain("<iframe");
  });
});
