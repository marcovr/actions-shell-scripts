import AnsiToHtml from "ansi-to-html";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import terminate from "terminate";
import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  commands,
  Event,
  EventEmitter,
  Position,
  Range,
  TextDocument,
  ViewColumn,
  WebviewPanel,
  window,
  workspace,
} from "vscode";
import { Script } from "./Script";

export class RunScriptProviderImpl implements CodeLensProvider {
  private codeLenses: Map<string, CodeLens[]> = new Map();
  private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
  public readonly onDidChangeCodeLenses: Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor() {
    workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  add(script: Script) {
    const codeLensPos = new Position(
      script.position.line + 1,
      script.position.character
    );
    const codeLensRange = new Range(codeLensPos, codeLensPos);
    const codeLens = new CodeLens(codeLensRange, {
      title: "▶️ Run YAML with Script",
      command: "yaml-with-script.run",
      arguments: [script],
    });

    this.codeLenses.set(script.key, [
      ...(this.codeLenses.get(script.key) || []),
      codeLens,
    ]);

    this._onDidChangeCodeLenses.fire();
  }

  clear() {
    this.codeLenses = new Map();
  }

  clearSingle(document: TextDocument) {
    this.codeLenses.set(document.uri.toString(), []);
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(
    document: TextDocument,
    _token: CancellationToken
  ): CodeLens[] | Thenable<CodeLens[]> {
    return this.codeLenses.get(document.uri.toString()) || [];
  }

  public resolveCodeLens(codeLens: CodeLens, _token: CancellationToken) {
    return codeLens;
  }
}

export const RunScriptProvider = RunScriptProviderImpl;

let panel: WebviewPanel | undefined;
let scriptRunning = false;
commands.registerCommand("yaml-with-script.run", (script: Script) => {
  if (scriptRunning) {
    window.showWarningMessage("A script is already running!");
    return;
  }

  scriptRunning = true;

  if (!panel) {
    panel = window.createWebviewPanel(
      "yamlWithScriptOutput",
      "YAML with Script - Output",
      ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
  } else {
    panel.webview.html = "";
  }

  const htmlPath = path.join(script.extensionPath, "html", "console.html");
  panel.webview.html = fs
    .readFileSync(htmlPath, "utf8")
    .replace(/>\s+</g, "><");

  const ansiToHtml = new AnsiToHtml({
    fg: "#cccccc",
    bg: "#1e1e1e",
    colors: {
      0: "#000000",
      1: "#cd3131",
      2: "#0dbc79",
      3: "#e5e510",
      4: "#2472c8",
      5: "#bc3fbc",
      6: "#11a8cd",
      7: "#e5e5e5",
      8: "#666666",
      9: "#f14c4c",
      10: "#23d18b",
      11: "#f5f543",
      12: "#3b8eea",
      13: "#d670d6",
      14: "#29b8db",
      15: "#e5e5e5",
    },
  });

  const config = workspace.getConfiguration("yaml-with-script");
  const baseScript = config.get("baseScript", "");

  const runScriptCommand = baseScript
    ? `source ${baseScript} && ${script.getContent()}`
    : script.getContent();

  const cwd = workspace.workspaceFolders?.[0]?.uri.fsPath;
  const process = spawn(runScriptCommand, [], { shell: true, cwd });

  panel.onDidDispose(() => {
    if (process.pid) {
      terminate(process.pid);
    }
    panel = undefined;
  });

  panel.webview.onDidReceiveMessage((message) => {
    if (message.command === "stopScript" && process.pid) {
      terminate(process.pid);
    }
  });

  const handleProcessOutput = (data: Buffer) => {
    if (panel) {
      panel.webview.postMessage({
        type: "updateContent",
        value: ansiToHtml.toHtml(data.toString("utf-8")),
      });
    }
  };

  process.stdout.on("data", handleProcessOutput);
  process.stderr.on("data", handleProcessOutput);

  process.on("exit", (code, signal) => {
    const message = signal ? "Cancelled!" : `Finished (${code})`;
    if (panel) {
      panel.webview.postMessage({
        type: "scriptStopped",
        value: message,
      });
    }

    scriptRunning = false;
  });
});
