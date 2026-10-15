import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirects";

describe("safeNextPath", () => {
  const app = "https://bottle.example";
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/dashboard", app)).toBe("/dashboard");
    expect(safeNextPath("/gifts/1?x=1#y", app)).toBe("/gifts/1?x=1#y");
  });
  it("rejects anything that could leave the origin", () => {
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "", undefined, null, 42, "/\\\\evil"]) {
      expect(safeNextPath(bad, app)).toBe("/dashboard");
    }
  });
});
