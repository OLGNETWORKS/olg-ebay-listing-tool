import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("editor responsive layout", () => {
  it("adapta las tres zonas y conserva foco visible en móvil", async () => {
    const css = await readFile(
      new URL("../../src/app/globals.css", import.meta.url),
      "utf8",
    );

    expect(css).toMatch(/\.editor-grid\s*\{[^}]*grid-template-columns:/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*1180px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)/);
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/min-height:\s*44px/);
  });
});
