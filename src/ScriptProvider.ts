import process from "child_process";
import path from "path";
import {
  ExtensionContext,
  languages,
  Position,
  TextDocument,
  window,
  workspace,
} from "vscode";
import { isMap, parseDocument } from "yaml";
import { RunScriptProvider } from "./RunScriptProvider";
import { Script } from "./Script";
import { ShellcheckProvider } from "./ShellcheckProvider";

export class ScriptProvider {
  private extensionPath = "";
  private timer: NodeJS.Timeout | undefined;
  private runScriptProvider = new RunScriptProvider();
  private shellcheckProvider = new ShellcheckProvider();

  initContext(context: ExtensionContext) {
    this.extensionPath = context.extensionPath;
    const codeLensSubscription = languages.registerCodeLensProvider(
      { pattern: "**/*.{yaml,yml}" },
      this.runScriptProvider
    );
    context.subscriptions.push(codeLensSubscription);
  }

  clear() {
    this.runScriptProvider.clear();
    this.shellcheckProvider.clear();
  }

  analyzeWithTimeout() {
    if (this.timer) {
      this.timer.refresh();
    } else {
      this.timer = setTimeout(() => {
        this.analyze();
      }, 500);
    }
  }

  analyze() {
    const config = workspace.getConfiguration("yaml-with-script");
    const enabled = config.get("enabled");

    if (!enabled) {
      this.clear();
      return;
    }

    try {
      const config = workspace.getConfiguration("yaml-with-script");
      const shellcheckFolder = config.get<string>("shellcheckFolder") || "";
      process.execSync(path.join(shellcheckFolder, "shellcheck --version"), {
        encoding: "utf-8",
      });
    } catch (error: any) {
      this.clear();
      window.showErrorMessage(
        "Could not start extension, shellsheck not installed properly!" + error
      );
      return;
    }

    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }

    const document = activeTextEditor.document;
    this.clear();

    try {
      const text = document.getText();
      const yaml = parseDocument(text);

      if (isMap(yaml.contents)) {
        yaml.contents.items.forEach((item) => {
          this.searchScripts(document, item, item.key.toString());
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  private searchScripts(document: TextDocument, yaml: any, path: string) {
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
      path,
      this.extensionPath
    );

    this.runScriptProvider.add(script);
    this.shellcheckProvider.add(script);
  }

  private offsetToLineCol(yamlText: string, offset: number) {
    const lines = yamlText.slice(0, offset).split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length;
    return new Position(line - 1, col - 1);
  }
}
