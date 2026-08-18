import type {
  CompilerIssue,
  DescriptionBlock,
  DescriptionDocument,
  ListingProfile,
} from "../../lib/contracts";
import { compileDescription } from "../../lib/compiler";

export interface EditorPreview {
  readonly errors: readonly CompilerIssue[];
  readonly srcDoc: string | null;
  readonly warnings: readonly CompilerIssue[];
}

export interface BlockLibraryItem {
  readonly description: string;
  readonly label: string;
  readonly type: DescriptionBlock["type"];
}

export const BLOCK_LIBRARY: readonly BlockLibraryItem[] = [
  {
    description: "Organiza secciones y jerarquía visual.",
    label: "Encabezado",
    type: "heading",
  },
  {
    description: "Explica beneficios y detalles del producto.",
    label: "Párrafo",
    type: "paragraph",
  },
  {
    description: "Resume características fáciles de escanear.",
    label: "Lista",
    type: "bullet-list",
  },
  {
    description: "Añade una imagen alojada por HTTPS.",
    label: "Imagen",
    type: "image",
  },
  {
    description: "Presenta atributos en una tabla clara.",
    label: "Especificaciones",
    type: "specifications",
  },
];

function nextBlockId(
  document: DescriptionDocument,
  type: DescriptionBlock["type"],
): string {
  const ids = new Set(document.blocks.map((block) => block.id));
  let sequence = document.blocks.length + 1;
  while (ids.has(`${type}-${sequence}`)) sequence += 1;
  return `${type}-${sequence}`;
}

function createBlock(
  type: DescriptionBlock["type"],
  id: string,
): DescriptionBlock {
  switch (type) {
    case "heading":
      return { id, level: 3, text: "Nuevo encabezado", type };
    case "paragraph":
      return { id, text: "Describe aquí el producto.", type };
    case "bullet-list":
      return { id, items: ["Nueva característica"], type };
    case "image":
      return {
        alt: "Vista del producto",
        id,
        src: "https://images.example.test/producto.jpg",
        type,
      };
    case "specifications":
      return {
        heading: "Detalles técnicos",
        id,
        items: [{ label: "Detalle", value: "Valor" }],
        type,
      };
  }
}

export function addBlock(
  document: DescriptionDocument,
  type: DescriptionBlock["type"],
): DescriptionDocument {
  const block = createBlock(type, nextBlockId(document, type));
  return { ...document, blocks: [...document.blocks, block] };
}

export function replaceBlock(
  document: DescriptionDocument,
  replacement: DescriptionBlock,
): DescriptionDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) =>
      block.id === replacement.id ? replacement : block
    ),
  };
}

export const listingProfileFixture: ListingProfile = {
  commercial: {
    condition: "new",
    price: { amount: "349.99", currency: "USD" },
    quantity: 4,
  },
  descriptionDocument: {
    blocks: [
      {
        id: "hero-heading",
        level: 2,
        text: "Garmin DriveSmart 76",
        type: "heading",
      },
    ],
    schemaVersion: 1,
    theme: {
      backgroundColor: "#ffffff",
      fontFamily: "Arial, sans-serif",
      primaryColor: "#174ea6",
      textColor: "#172033",
    },
  },
  identity: {
    profileId: "profile-demo-001",
    sku: "OLG-DEMO-001",
    title: "Garmin DriveSmart 76",
  },
  logistics: {
    dispatchTimeMaxDays: 2,
    packageWeightGrams: 850,
    returnsAccepted: true,
  },
  media: {
    images: [],
  },
  revision: 1,
};

export function buildEditorPreview(
  document: DescriptionDocument,
): EditorPreview {
  const compiled = compileDescription(document);
  const srcDoc = compiled.errors.length > 0
    ? null
    : [
        "<!doctype html>",
        '<html lang="es"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<meta name="referrer" content="no-referrer">',
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">',
        `<style>${compiled.css}</style></head>`,
        `<body>${compiled.html}</body></html>`,
      ].join("");

  return {
    errors: compiled.errors,
    srcDoc,
    warnings: compiled.warnings,
  };
}
