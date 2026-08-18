import { describe, expect, it } from "vitest";

import type { DescriptionDocument } from "../../src/lib/contracts/description-document";
import {
  compileDescription,
  EBAY_DESCRIPTION_MAX_CHARACTERS,
  serializeEbayDescription,
  staticDescriptionCompiler,
} from "../../src/lib/compiler";

describe("compileDescription", () => {
  it("compila el mismo documento mínimo al mismo HTML estático", () => {
    const document: DescriptionDocument = {
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        primaryColor: "#0b3d91",
        textColor: "#17202a",
      },
      blocks: [
        {
          id: "hero-title",
          type: "heading",
          level: 2,
          text: "Garmin <DriveSmart>",
        },
        {
          id: "intro",
          type: "paragraph",
          text: "Navigation & safety.",
        },
      ],
    };

    const first = compileDescription(document);
    const second = compileDescription(document);

    expect(first).toEqual(second);
    expect(first.errors).toEqual([]);
    expect(first.warnings).toEqual([]);
    expect(first.html).toBe(
      [
        '<div class="olg-listing" data-schema-version="1">',
        '  <section class="olg-block olg-heading" data-block-id="hero-title"><h2>Garmin &lt;DriveSmart&gt;</h2></section>',
        '  <section class="olg-block olg-paragraph" data-block-id="intro"><p>Navigation &amp; safety.</p></section>',
        "</div>",
      ].join("\n"),
    );
    expect(first.css).toContain("font-family: Arial, sans-serif;");
    expect(first.css).toContain("color: #17202a;");
    expect(first.css).toContain("background: #ffffff;");
  });

  it("renderiza todos los bloques admitidos sin contenido ejecutable", () => {
    const document: DescriptionDocument = {
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica, Arial, sans-serif",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [
        {
          id: "benefits",
          type: "bullet-list",
          items: ["Voice control", "No <script>alert('x')</script>"],
        },
        {
          id: "product-image",
          type: "image",
          src: "https://cdn.example.test/garmin.jpg?size=large&view=front",
          alt: 'Garmin "front" view',
          caption: "HTTPS product image",
        },
        {
          id: "specs",
          type: "specifications",
          heading: "Specifications",
          items: [
            { label: "Screen", value: '7"' },
            { label: "Connectivity", value: "Wi-Fi & Bluetooth" },
          ],
        },
      ],
    };

    const result = compileDescription(document);

    expect(result.errors).toEqual([]);
    expect(result.html).toContain(
      "<ul><li>Voice control</li><li>No &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</li></ul>",
    );
    expect(result.html).toContain(
      '<img src="https://cdn.example.test/garmin.jpg?size=large&amp;view=front" alt="Garmin &quot;front&quot; view">',
    );
    expect(result.html).toContain(
      "<figcaption>HTTPS product image</figcaption>",
    );
    expect(result.html).toContain(
      "<table><caption>Specifications</caption><tbody><tr><th scope=\"row\">Screen</th><td>7&quot;</td></tr><tr><th scope=\"row\">Connectivity</th><td>Wi-Fi &amp; Bluetooth</td></tr></tbody></table>",
    );
    expect(`${result.html}\n${result.css}`).not.toMatch(
      /<script|<form|<iframe|javascript:|position\s*:\s*sticky/i,
    );
    expect(result.css).toContain("table-layout: fixed;");
    expect(result.css).toContain("overflow-wrap: anywhere;");
  });

  it("falla de forma cerrada ante imágenes HTTP o inyección en colores", () => {
    const unsafeDocument = {
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff; position: sticky",
        fontFamily: "Arial, sans-serif",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [
        {
          id: "unsafe-image",
          type: "image",
          src: "http://cdn.example.test/product.jpg",
          alt: "Product",
        },
      ],
    } as unknown as DescriptionDocument;

    const result = compileDescription(unsafeDocument);

    expect(result.errors.map((issue) => issue.code)).toEqual([
      "invalid-color",
      "insecure-image-url",
    ]);
    expect(result.html).toBe("");
    expect(result.css).toBe("");
  });

  it("expone una implementación del contrato Compiler", () => {
    const document: DescriptionDocument = {
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [],
    };

    expect(staticDescriptionCompiler.compile(document)).toEqual(
      compileDescription(document),
    );
  });

  it("acepta el límite total de eBay y rechaza un carácter adicional", () => {
    const createDocument = (text: string): DescriptionDocument => ({
      schemaVersion: 1,
      theme: {
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        primaryColor: "#005ea8",
        textColor: "#111111",
      },
      blocks: [{ id: "body", type: "paragraph", text }],
    });
    const empty = compileDescription(createDocument(""));
    const fixedCharacters = serializeEbayDescription(empty).length;
    const availableCharacters =
      EBAY_DESCRIPTION_MAX_CHARACTERS - fixedCharacters;

    const atLimit = compileDescription(
      createDocument("a".repeat(availableCharacters)),
    );
    const overLimit = compileDescription(
      createDocument("a".repeat(availableCharacters + 1)),
    );

    expect(serializeEbayDescription(atLimit)).toHaveLength(
      EBAY_DESCRIPTION_MAX_CHARACTERS,
    );
    expect(atLimit.errors).toEqual([]);
    expect(overLimit.errors.map((issue) => issue.code)).toEqual([
      "description-too-long",
    ]);
    expect(overLimit.html).toBe("");
    expect(overLimit.css).toBe("");
  });
});
