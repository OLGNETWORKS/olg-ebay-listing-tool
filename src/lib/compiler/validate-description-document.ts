import type {
  CompilerIssue,
  DescriptionDocument,
  DescriptionDocumentValidationResult,
} from "../contracts";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const FONT_FAMILIES = new Set([
  "Arial, sans-serif",
  "Georgia, serif",
  "Helvetica, Arial, sans-serif",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateDescriptionDocument(
  input: unknown,
): DescriptionDocumentValidationResult {
  const errors: CompilerIssue[] = [];
  const warnings: CompilerIssue[] = [];

  if (!isRecord(input)) {
    return {
      document: null,
      errors: [
        {
          code: "invalid-document",
          message: "Description document must be an object.",
          path: "$",
        },
      ],
      valid: false,
      warnings: [],
    };
  }

  if (input.schemaVersion !== 1) {
    errors.push({
      code: "unsupported-schema-version",
      message: "Only description schema version 1 is supported.",
      path: "schemaVersion",
    });
  }

  const theme = input.theme;
  if (!isRecord(theme)) {
    errors.push({
      code: "invalid-document",
      message: "Document theme must be an object.",
      path: "theme",
    });
  } else {
    const colors = [
      ["backgroundColor", theme.backgroundColor],
      ["primaryColor", theme.primaryColor],
      ["textColor", theme.textColor],
    ] as const;

    for (const [name, value] of colors) {
      if (typeof value !== "string" || !HEX_COLOR.test(value)) {
        errors.push({
          code: "invalid-color",
          message: "Theme colors must use six-digit hexadecimal notation.",
          path: `theme.${name}`,
        });
      }
    }

    if (typeof theme.fontFamily !== "string" ||
        !FONT_FAMILIES.has(theme.fontFamily)) {
      errors.push({
        code: "invalid-font-family",
        message: "Theme font family must use an approved static font stack.",
        path: "theme.fontFamily",
      });
    }
  }

  if (!Array.isArray(input.blocks)) {
    errors.push({
      code: "invalid-document",
      message: "Document blocks must be an array.",
      path: "blocks",
    });
  } else {
    const blockIds = new Set<string>();

    for (const [index, block] of input.blocks.entries()) {
      const path = `blocks[${index}]`;

      if (!isRecord(block) || typeof block.id !== "string" ||
          block.id.trim() === "" || typeof block.type !== "string") {
        errors.push({
          code: "invalid-block",
          message: "Every block needs a non-empty id and a supported type.",
          path,
        });
        continue;
      }

      if (blockIds.has(block.id)) {
        errors.push({
          code: "duplicate-block-id",
          message: "Block ids must be unique within a document.",
          path: `${path}.id`,
        });
      } else {
        blockIds.add(block.id);
      }

      let validBlock = true;
      switch (block.type) {
        case "heading":
          validBlock = (block.level === 2 || block.level === 3 ||
            block.level === 4) && typeof block.text === "string";
          break;
        case "paragraph":
          validBlock = typeof block.text === "string";
          break;
        case "bullet-list": {
          const items = block.items;
          validBlock = Array.isArray(items) &&
            items.every((item) => typeof item === "string");
          if (validBlock && Array.isArray(items) && items.length === 0) {
            warnings.push({
              code: "empty-list",
              message: "Bullet lists should include at least one item.",
              path: `${path}.items`,
            });
          }
          break;
        }
        case "image":
          validBlock = typeof block.src === "string" &&
            typeof block.alt === "string" &&
            (block.caption === undefined || typeof block.caption === "string");
          if (validBlock && !isHttpsUrl(block.src as string)) {
            errors.push({
              code: "insecure-image-url",
              message: "Image URLs must use HTTPS.",
              path: `${path}.src`,
            });
          }
          if (validBlock && (block.alt as string).trim() === "") {
            warnings.push({
              code: "empty-image-alt",
              message: "Product images should include alternative text.",
              path: `${path}.alt`,
            });
          }
          break;
        case "specifications": {
          const items = block.items;
          validBlock = (block.heading === undefined ||
            typeof block.heading === "string") &&
            Array.isArray(items) && items.every(
              (item) => isRecord(item) && typeof item.label === "string" &&
                typeof item.value === "string",
            );
          if (validBlock && Array.isArray(items) && items.length === 0) {
            warnings.push({
              code: "empty-specifications",
              message: "Specification tables should include at least one row.",
              path: `${path}.items`,
            });
          }
          break;
        }
        default:
          validBlock = false;
      }

      if (!validBlock) {
        errors.push({
          code: "invalid-block",
          message: "Block fields do not match its declared type.",
          path,
        });
      }
    }
  }

  const document = errors.length === 0
    ? input as unknown as DescriptionDocument
    : null;

  return {
    document,
    errors,
    valid: errors.length === 0,
    warnings,
  };
}
