import * as vscode from "vscode";
import { isMap, parseDocument } from "yaml";
import { Script } from "./Script";

export class ScriptProvider {
  private scripts: Script[] = [];
  private onStartAnalyzeFunction: (scripts: Script[]) => void = () => {};
  private onEndAnalyzeFunction: (scripts: Script[]) => void = () => {};
  private processing = false;

  add(script: Script) {
    this.scripts.push(script);
  }

  setOnStartAnalyzeFunction(
    onStartAnalyzeFunction: (scripts: Script[]) => void
  ) {
    this.onStartAnalyzeFunction = onStartAnalyzeFunction;
  }

  setOnEndAnalyzeFunction(onEndAnalyzeFunction: (scripts: Script[]) => void) {
    this.onEndAnalyzeFunction = onEndAnalyzeFunction;
  }

  clear() {
    this.onStartAnalyzeFunction(this.scripts);
    this.scripts = [];
    this.onEndAnalyzeFunction(this.scripts);
  }

  clearDocument(document: vscode.TextDocument) {
    this.scripts = this.scripts.filter(
      (script) => script.document.uri !== document.uri
    );
  }

  get() {
    return this.scripts;
  }

  analyzeAllOpen() {
    vscode.window.visibleTextEditors
      .map((editor) => editor.document)
      .forEach((document) => {
        this.analyze(document);
      });
  }

  analyze(document: vscode.TextDocument) {
    if (this.processing) {
      return;
    }
    this.processing = true;

    try {
      this.onStartAnalyzeFunction(this.scripts);

      this.clearDocument(document);

      const text = document.getText();
      const yaml = parseDocument(text);

      if (isMap(yaml.contents)) {
        yaml.contents.items.forEach((item) => {
          this.searchScripts(document, item, item.key.toString());
        });
      }

      this.onEndAnalyzeFunction(this.scripts);
    } catch (error) {
      console.error(error);
    }

    this.processing = false;
  }

  private searchScripts(
    document: vscode.TextDocument,
    yaml: any,
    path: string
  ) {
    if (isMap(yaml.value)) {
      yaml.value.items.forEach((item: any) => {
        this.searchScripts(document, item, path + "." + item.key);
      });
      return;
    }

    const key = yaml.key;
    if (!["before_script", "script", "after_script"].includes(key.toString())) {
      return;
    }

    const items = yaml.value.items;
    const itemCount = items.length - 1;

    const script = new Script(
      document,
      this.offsetToLineCol(document.getText(), items[itemCount].range[0]),
      itemCount,
      path
    );

    this.add(script);
  }

  private offsetToLineCol(yamlText: string, offset: number) {
    const lines = yamlText.slice(0, offset).split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length;
    return new vscode.Position(line - 1, col - 1);
  }
}
