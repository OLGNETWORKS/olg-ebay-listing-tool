import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

const root = resolve(import.meta.dirname, "../..");
const buildConfigPath = resolve(root, "tsconfig.build.json");

describe("Next.js TypeScript configuration", () => {
  it("keeps Next dev from rewriting agent rules and uses an isolated build config", () => {
    expect(nextConfig.agentRules).toBe(false);
    expect(nextConfig.typescript?.tsconfigPath).toBe("tsconfig.build.json");

    const ignored = readFileSync(resolve(root, ".gitignore"), "utf8");
    expect(ignored.split(/\r?\n/)).toContain("next-env.d.ts");
  });

  it("preserves strict no-emit checking while excluding generated dev types", () => {
    const rootConfig = JSON.parse(
      readFileSync(resolve(root, "tsconfig.json"), "utf8"),
    ) as { compilerOptions: Record<string, unknown> };
    const buildConfig = JSON.parse(
      readFileSync(buildConfigPath, "utf8"),
    ) as {
      compilerOptions: Record<string, unknown>;
      exclude: string[];
      extends: string;
    };
    const compilerOptions = {
      ...rootConfig.compilerOptions,
      ...buildConfig.compilerOptions,
    };

    expect(buildConfig.extends).toBe("./tsconfig.json");
    expect(compilerOptions.strict).toBe(true);
    expect(compilerOptions.noEmit).toBe(true);
    expect(compilerOptions.jsx).toBe("react-jsx");
    expect(buildConfig.exclude).toContain(".next/dev/**");
  });
});
