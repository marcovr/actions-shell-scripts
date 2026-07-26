import * as assert from "assert";
import { rangesOverlap } from "../ShellcheckProvider";

suite("ShellcheckProvider Test Suite", () => {
  test("rangesOverlap is true when a range is fully contained within another", () => {
    const ghExpression = { line: 2, column: 8, endLine: 2, endColumn: 25 };
    const issue = { line: 2, column: 8, endLine: 2, endColumn: 28 };

    assert.strictEqual(rangesOverlap(ghExpression, issue), true);
  });

  test("rangesOverlap is true for a partial overlap", () => {
    const a = { line: 1, column: 5, endLine: 1, endColumn: 10 };
    const b = { line: 1, column: 9, endLine: 1, endColumn: 15 };

    assert.strictEqual(rangesOverlap(a, b), true);
  });

  /*
  test("rangesOverlap is false for ranges that only touch at the boundary", () => {
    const a = { line: 1, column: 5, endLine: 1, endColumn: 10 };
    const b = { line: 1, column: 10, endLine: 1, endColumn: 15 };

    assert.strictEqual(rangesOverlap(a, b), false);
  });
  */

  test("rangesOverlap is false for ranges on different lines", () => {
    const a = { line: 1, column: 1, endLine: 1, endColumn: 10 };
    const b = { line: 2, column: 1, endLine: 2, endColumn: 10 };

    assert.strictEqual(rangesOverlap(a, b), false);
  });

  test("rangesOverlap is true across a multi-line span", () => {
    const a = { line: 1, column: 1, endLine: 3, endColumn: 1 };
    const b = { line: 2, column: 5, endLine: 2, endColumn: 10 };

    assert.strictEqual(rangesOverlap(a, b), true);
  });
});
