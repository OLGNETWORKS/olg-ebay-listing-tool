export const DESCRIPTION_SCHEMA_VERSION = 1 as const;

export type ThemeFontFamily =
  | "Arial, sans-serif"
  | "Georgia, serif"
  | "Helvetica, Arial, sans-serif";

export type HexColor = `#${string}`;

export interface DescriptionTheme {
  readonly backgroundColor: HexColor;
  readonly fontFamily: ThemeFontFamily;
  readonly primaryColor: HexColor;
  readonly textColor: HexColor;
}

interface DescriptionBlockBase {
  readonly id: string;
  readonly type: string;
}

export interface HeadingBlock extends DescriptionBlockBase {
  readonly level: 2 | 3 | 4;
  readonly text: string;
  readonly type: "heading";
}

export interface ParagraphBlock extends DescriptionBlockBase {
  readonly text: string;
  readonly type: "paragraph";
}

export interface BulletListBlock extends DescriptionBlockBase {
  readonly items: readonly string[];
  readonly type: "bullet-list";
}

export interface ImageBlock extends DescriptionBlockBase {
  readonly alt: string;
  readonly caption?: string;
  readonly src: string;
  readonly type: "image";
}

export interface SpecificationItem {
  readonly label: string;
  readonly value: string;
}

export interface SpecificationsBlock extends DescriptionBlockBase {
  readonly heading?: string;
  readonly items: readonly SpecificationItem[];
  readonly type: "specifications";
}

export type DescriptionBlock =
  | BulletListBlock
  | HeadingBlock
  | ImageBlock
  | ParagraphBlock
  | SpecificationsBlock;

export interface DescriptionDocument {
  readonly blocks: readonly DescriptionBlock[];
  readonly schemaVersion: typeof DESCRIPTION_SCHEMA_VERSION;
  readonly theme: DescriptionTheme;
}
