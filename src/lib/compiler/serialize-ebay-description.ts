import type { CompilerResult } from "../contracts";

export const EBAY_DESCRIPTION_MAX_CHARACTERS = 500_000;

type CompiledDescription = Pick<CompilerResult, "css" | "html">;

export function serializeEbayDescription(
  description: CompiledDescription,
): string {
  return `<style>\n${description.css}\n</style>\n${description.html}`;
}

export function countDescriptionCharacters(
  description: CompiledDescription,
): number {
  return Array.from(serializeEbayDescription(description)).length;
}
