import AnsiToHtml from "ansi-to-html";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import terminate from "terminate";
import * as vscode from "vscode";
import { extensionContext } from "./extension";
import { Script } from "./Script";

export class CodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: Map<string, vscode.CodeLens[]> = new Map();

  // Fügt ein CodeLens hinzu oder erstellt es
  add(script: Script) {
    const codeLensPos = new vscode.Position(
      script.position.line + 1,
      script.position.character
    );
    const codeLensRange = new vscode.Range(codeLensPos, codeLensPos);
    const codeLens = new vscode.CodeLens(codeLensRange, {
      title: "▶️ Run YAML with Script",
      command: "yaml-with-script.runScriptInTerminal",
      arguments: [script],
    });

    this.codeLenses.set(script.key, [
      ...(this.codeLenses.get(script.key) || []),
      codeLens,
    ]);
  }

  // Entfernt CodeLens für ein bestimmtes Dokument
  clearSingle(document: vscode.TextDocument) {
    this.codeLenses.set(document.uri.toString(), []);
  }

  // Gibt die CodeLenses für das Dokument zurück
  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    return this.codeLenses.get(document.uri.toString()) || [];
  }

  // Resolves CodeLens (optional)
  resolveCodeLens?(
    codeLens: vscode.CodeLens
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }
}

// Globale Variablen für das Panel und den Status
let panel: vscode.WebviewPanel | undefined;
let scriptRunning = false;

// Command-Registrierung für das Ausführen von Skripten
vscode.commands.registerCommand(
  "yaml-with-script.runScriptInTerminal",
  (script: Script) => {
    if (scriptRunning) {
      vscode.window.showWarningMessage("A script is already running!");
      return;
    }

    scriptRunning = true;

    // Webview-Panel erstellen oder leeren
    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        "yamlWithScriptOutput",
        "YAML with Script - Output",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );
    } else {
      panel.webview.html = "";
    }

    const htmlPath = path.join(
      extensionContext.extensionPath,
      "html",
      "console.html"
    );
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

    const config = vscode.workspace.getConfiguration("yaml-with-script");
    const baseScript = config.get("baseScript", "");

    const runScriptCommand = baseScript
      ? `source ${baseScript} && ${script.getContent()}`
      : script.getContent();

    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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

    // Skriptausgabe verarbeiten
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

    // Skript beenden
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
  }
);
