import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const micromatchDirectory = require.resolve("micromatch", {
  paths: [resolve("node_modules/.pnpm/node_modules")],
});
const braces = createRequire(micromatchDirectory)("braces");
describe("GHSA-vfj7-8cjw-p6xm: limite antes dos walkers recursivos", () => {
  it.each(["parse", "compile", "expand", "stringify"])(
    "%s rejeita padrão profundo com erro controlado",
    (method) => {
      expect(() => braces[method]("{".repeat(2000) + "a,b" + "}".repeat(2000))).toThrow(
        SyntaxError,
      );
      expect(() => braces[method]("(".repeat(2000) + "a" + ")".repeat(2000))).toThrow(SyntaxError);
    },
  );
  it.each(["compile", "expand", "stringify"])(
    "%s também verifica AST fornecida diretamente",
    (method) => {
      let node: { type: string; nodes?: unknown[]; value?: string } = { type: "text", value: "x" };
      for (let i = 0; i < 2000; i++) node = { type: "root", nodes: [node] };
      expect(() => braces[method](node)).toThrow(SyntaxError);
    },
  );
  it("preserva expansão, intervalos e compilação usuais", () => {
    expect(braces.expand("src/{app,lib}/{1..3}.ts")).toEqual([
      "src/app/1.ts",
      "src/app/2.ts",
      "src/app/3.ts",
      "src/lib/1.ts",
      "src/lib/2.ts",
      "src/lib/3.ts",
    ]);
    expect(braces.compile("{a,b}")).toBe("(a|b)");
    expect(braces.stringify(braces.parse("a/{b,c}/d"))).toBe("a/{b,c}/d");
  });
});
