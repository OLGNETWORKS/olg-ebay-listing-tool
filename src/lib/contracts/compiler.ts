import type { DescriptionDocument } from "./description-document";

export type CompilerIssueCode =
  | "description-too-long"
  | "duplicate-block-id"
  | "empty-image-alt"
  | "empty-list"
  | "empty-specifications"
  | "invalid-block"
  | "invalid-color"
  | "invalid-document"
  | "invalid-font-family"
  | "insecure-image-url"
  | "unsupported-schema-version";

export interface CompilerIssue {
  readonly code: CompilerIssueCode;
  readonly message: string;
  readonly path: string;
}

export interface CompilerResult {
  readonly css: string;
  readonly errors: readonly CompilerIssue[];
  readonly html: string;
  readonly warnings: readonly CompilerIssue[];
}

export interface DescriptionDocumentValidationResult {
  readonly document: DescriptionDocument | null;
  readonly errors: readonly CompilerIssue[];
  readonly valid: boolean;
  readonly warnings: readonly CompilerIssue[];
}

export interface Compiler {
  compile(document: DescriptionDocument): CompilerResult;
}
