import * as assert from "assert";
import { Position, TextDocument } from "vscode";
import { Script } from "../Script";

class MockTextDocument {
  uri = { toString: () => "test-document" } as any;
}

function makeScript(content: string) {
  return new Script(
    new MockTextDocument() as TextDocument,
    new Position(0, 0),
    content,
    "",
    "bash"
  );
}

suite("Script Test Suite", () => {
  test("getGhExpressionRanges returns no ranges when there is no GH expression", () => {
    const script = makeScript('echo "hello world"');

    assert.deepStrictEqual(script.getGhExpressionRanges(), []);
  });

  test("getGhExpressionRanges locates a single expression", () => {
    const script = makeScript('echo "${{ github.ref }}"');

    assert.deepStrictEqual(script.getGhExpressionRanges(), [
      { line: 1, column: 7, endLine: 1, endColumn: 24 },
    ]);
  });

  test("getGhExpressionRanges locates multiple expressions across lines", () => {
    const script = makeScript(
      'a="${{ github.repository }}"\nif [[ "${{ github.ref }}" == "refs/tags/v"* ]]; then\n  echo hi\nfi'
    );

    assert.deepStrictEqual(script.getGhExpressionRanges(), [
      { line: 1, column: 4, endLine: 1, endColumn: 28 },
      { line: 2, column: 8, endLine: 2, endColumn: 25 },
    ]);
  });

  test("getContent replaces GH expressions with same-length dummy content", () => {
    const script = makeScript('a="${{ github.repository }}"');

    assert.strictEqual(script.getContent(), 'a="AAAAAAAAAAAAAAAAAAAAAAAA"');
  });

  test("getContent normalizes CRLF line endings", () => {
    const script = makeScript('echo "a"\r\necho "b"');

    assert.strictEqual(script.getContent(), 'echo "a"\necho "b"');
  });
});
