import type { Compiler } from "../contracts";
import { compileDescription } from "./compile-description";

export { compileDescription };
export {
  countDescriptionCharacters,
  EBAY_DESCRIPTION_MAX_CHARACTERS,
  serializeEbayDescription,
} from "./serialize-ebay-description";
export { validateDescriptionDocument } from "./validate-description-document";

export const staticDescriptionCompiler: Compiler = {
  compile: compileDescription,
};
