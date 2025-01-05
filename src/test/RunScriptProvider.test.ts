import * as assert from "assert";
import { Position, Range, TextDocument, window } from "vscode";
import { CancellationToken } from "vscode-languageclient";
import { RunScriptProviderImpl } from "../RunScriptProvider";
import { Script } from "../Script";

// Mock für das TextDocument
class MockTextDocument implements TextDocument {
  uri = { toString: () => "test-document" } as any;
  fileName = "";
  isUntitled = false;
  languageId = "";
  version = 1;
  isDirty = false;
  isClosed = false;
  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }
  eol = 1;
  lineCount = 1;
  lineAt(): any {
    return { text: "" };
  }
  offsetAt(): number {
    return 0;
  }
  positionAt(): Position {
    return new Position(0, 0);
  }
  getText(): string {
    return "";
  }
  getWordRangeAtPosition(): Range | undefined {
    return undefined;
  }
  validateRange(): Range {
    return new Range(0, 0, 0, 0);
  }
  validatePosition(): Position {
    return new Position(0, 0);
  }
}

suite("RunScriptProvider Test Suite", () => {
  let provider: RunScriptProviderImpl;
  let mockDocument: TextDocument;

  setup(() => {
    provider = new RunScriptProviderImpl();
    mockDocument = new MockTextDocument();
  });

  suiteTeardown(() => {
    window.showInformationMessage("RunScriptProvider tests done!");
  });

  test("should add a new CodeLens for a script", async () => {
    const mockScript = {
      key: mockDocument.uri.toString(),
      position: { line: 0, character: 0 },
      getContent: () => 'echo "test"',
    } as Script;

    provider.add(mockScript);
    const codeLensesResult = provider.provideCodeLenses(
      mockDocument,
      CancellationToken.None
    );
    const codeLenses = await Promise.resolve(codeLensesResult);

    assert.ok(codeLenses);
    assert.strictEqual(codeLenses.length, 1);
    assert.deepStrictEqual(codeLenses[0].command, {
      title: "▶️ Run YAML with Script",
      command: "yaml-with-script.run",
      arguments: [mockScript],
    });
  });

  test("should support multiple CodeLenses for the same document", async () => {
    const mockScript1 = {
      key: mockDocument.uri.toString(),
      position: { line: 0, character: 0 },
      getContent: () => 'echo "test1"',
    } as Script;

    const mockScript2 = {
      key: mockDocument.uri.toString(),
      position: { line: 1, character: 0 },
      getContent: () => 'echo "test2"',
    } as Script;

    provider.add(mockScript1);
    provider.add(mockScript2);

    const codeLensesResult = provider.provideCodeLenses(
      mockDocument,
      CancellationToken.None
    );
    const codeLenses = await Promise.resolve(codeLensesResult);

    assert.ok(codeLenses);
    assert.strictEqual(codeLenses.length, 2);
  });

  test("should clear all CodeLenses for a document", async () => {
    const mockScript = {
      key: mockDocument.uri.toString(),
      position: { line: 0, character: 0 },
      getContent: () => 'echo "test"',
    } as Script;

    provider.add(mockScript);
    provider.clearSingle(mockDocument);

    const codeLensesResult = provider.provideCodeLenses(
      mockDocument,
      CancellationToken.None
    );
    const codeLenses = await Promise.resolve(codeLensesResult);

    assert.ok(codeLenses);
    assert.strictEqual(codeLenses.length, 0);
  });

  test("should return empty array when no CodeLenses exist", async () => {
    const codeLensesResult = provider.provideCodeLenses(
      mockDocument,
      CancellationToken.None
    );
    const codeLenses = await Promise.resolve(codeLensesResult);

    assert.ok(codeLenses);
    assert.strictEqual(codeLenses.length, 0);
  });

  test("should fire onDidChangeCodeLenses when adding CodeLens", (done) => {
    provider.onDidChangeCodeLenses(() => {
      done();
    });

    const mockScript = {
      key: mockDocument.uri.toString(),
      position: { line: 0, character: 0 },
      getContent: () => 'echo "test"',
    } as Script;

    provider.add(mockScript);
  });

  test("should fire onDidChangeCodeLenses when clearing CodeLenses", (done) => {
    provider.onDidChangeCodeLenses(() => {
      done();
    });

    provider.clearSingle(mockDocument);
  });

  test("should create CodeLens with correct position", async () => {
    const mockScript = {
      key: mockDocument.uri.toString(),
      position: { line: 5, character: 10 },
      getContent: () => 'echo "test"',
    } as Script;

    provider.add(mockScript);
    const codeLensesResult = provider.provideCodeLenses(
      mockDocument,
      CancellationToken.None
    );
    const codeLenses = await Promise.resolve(codeLensesResult);

    assert.ok(codeLenses);
    assert.strictEqual(codeLenses[0].range.start.line, 6);
    assert.strictEqual(codeLenses[0].range.start.character, 10);
  });
});
