import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import baseline from "./fixtures/original-ui.json";

// The approved visual design predates the functional changes. Keep its original
// presentation independent of transaction plumbing so it cannot be replaced
// silently by future functional work.
for (const [file, expected] of Object.entries(baseline.classes)) {
  test(`preserves the original presentation classes: ${file}`, () => {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const actual: (string | undefined)[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(source) === "className"
      ) {
        actual.push(node.initializer?.getText(source).replace(/\s+/g, " "));
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.deepEqual(
      actual,
      expected,
      `Presentation changed from original commit ${baseline.baseline}`,
    );
  });
}

test("preserves the original global styling and fonts", () => {
  const css = fs
    .readFileSync("src/app/globals.css", "utf8")
    .replace(/\r\n/g, "\n");
  assert.equal(
    createHash("sha256").update(css.slice(0, baseline.cssLength)).digest("hex"),
    baseline.cssHash,
  );
});

test("restored comparison remains on the homepage and its dedicated page", () => {
  for (const file of ["src/app/page.tsx", "src/app/compare/page.tsx"]) {
    assert.match(fs.readFileSync(file, "utf8"), /<ComparisonMatrix\s*\/>/);
  }
  const comparison = fs.readFileSync(
    "src/components/ComparisonMatrix.tsx",
    "utf8",
  );
  for (const label of [
    "Traditional Brokerages",
    "EVM Index Protocols",
    "Manual DEX Swapping",
    "Account Minimums",
    "Annual Management Expense Ratio",
  ])
    assert.ok(comparison.includes(label));
  assert.match(comparison, /<table\b/);
});
