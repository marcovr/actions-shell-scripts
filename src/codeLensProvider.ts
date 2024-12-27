import AnsiToHtml from "ansi-to-html";
import { spawn } from "child_process";
import terminate from "terminate";
import * as vscode from "vscode";
import { Script } from "./Script";

export class CodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: Map<string, vscode.CodeLens[]> = new Map();

  add(script: Script) {
    const codeLensPos = new vscode.Position(
      script.position.line + 1,
      script.position.character
    );

    const codeLensRange = new vscode.Range(codeLensPos, codeLensPos);
    const codeLens = new vscode.CodeLens(codeLensRange);

    codeLens.command = {
      title: "▶️ Run YAML with Script",
      command: "yaml-with-script.runScriptInTerminal",
      arguments: [script],
    };

    if (this.codeLenses.has(script.key)) {
      this.codeLenses.get(script.key)?.push(codeLens);
    } else {
      this.codeLenses.set(script.key, [codeLens]);
    }
  }

  clearSingle(document: vscode.TextDocument) {
    this.codeLenses.set(document.uri.toString(), []);
  }

  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    return this.codeLenses.get(document.uri.toString()) || [];
  }

  resolveCodeLens?(
    codeLens: vscode.CodeLens
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }
}

let panel: vscode.WebviewPanel | undefined;
let scriptRunning = false;
vscode.commands.registerCommand(
  "yaml-with-script.runScriptInTerminal",
  (script: Script) => {
    if (scriptRunning) {
      vscode.window.showWarningMessage("A script is already running!");
      return;
    }

    scriptRunning = true;

    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        "yamlWithScriptOutput",
        "YAML with Script - Output",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
        }
      );
    } else {
      panel.webview.html = "";
    }

    const config = vscode.workspace.getConfiguration("yaml-with-script");
    const baseScript = config.get("baseScript");

    const runScriptCommand = [];
    runScriptCommand.push(baseScript !== "" ? `source ${baseScript} &&` : "");
    runScriptCommand.push(script.getContent());

    const process = spawn(runScriptCommand.join("\n"), [], { shell: true });

    panel.onDidDispose(() => {
      if (process.pid) {
        terminate(process.pid);
      }
      panel = undefined;
    });

    const consoleWebView = new ConsoleWebView();

    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "stopScript":
            if (process.pid) {
              terminate(process.pid);
            }
            break;
          case "setAutoScroll":
            consoleWebView.setAutoScroll(message.isAutoScroll);
            break;
        }
      },
      undefined,
      []
    );

    process.stdout.on("data", (data) => {
      consoleWebView.addLog(data);

      if (panel) {
        panel.webview.html = consoleWebView.getContent();
      }
    });

    process.stderr.on("data", (data) => {
      consoleWebView.addLog(data);

      if (panel) {
        panel.webview.html = consoleWebView.getContent();
      }
    });

    process.on("exit", (code, signal) => {
      consoleWebView.setRunningState(false);

      if (signal) {
        consoleWebView.setKilled(true);
      }

      if (panel) {
        panel.webview.html = consoleWebView.getContent();
      }

      scriptRunning = false;
    });
  }
);

class ConsoleWebView {
  private logs: string[] = [];
  private ansiToHtml: AnsiToHtml;
  private isRunning: boolean = true;
  private isKilled: boolean = false;
  private isAutoScroll: boolean = true;

  constructor() {
    this.ansiToHtml = new AnsiToHtml({
      fg: "#cccccc",
      bg: "#1e1e1e",
      colors: {
        0: "#000000", // black
        1: "#cd3131", // red
        2: "#0dbc79", // green
        3: "#e5e510", // yellow
        4: "#2472c8", // blue
        5: "#bc3fbc", // magenta
        6: "#11a8cd", // cyan
        7: "#e5e5e5", // white
        8: "#666666", // bright black
        9: "#f14c4c", // bright red
        10: "#23d18b", // bright green
        11: "#f5f543", // bright yellow
        12: "#3b8eea", // bright blue
        13: "#d670d6", // bright magenta
        14: "#29b8db", // bright cyan
        15: "#e5e5e5", // bright white
      },
    });
  }

  setRunningState(isRunning: boolean) {
    this.isRunning = isRunning;
  }

  setKilled(isKilled: boolean) {
    this.isKilled = isKilled;
  }

  setAutoScroll(isAutoScroll: boolean) {
    this.isAutoScroll = isAutoScroll;
  }

  addLog(log: any) {
    const cleanLog = log.toString("utf-8");
    const htmlLog = this.ansiToHtml.toHtml(cleanLog);
    this.logs.push(htmlLog);
  }

  getContent() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                margin: 0;
                padding: "5%";
                font-family: 'Consolas', monospace;
                font-size: 13px;
                line-height: 1.4;
                color: #cccccc;
                overflow-wrap: break-word;
                white-space: pre-wrap;
                word-break: break-all;
            }

            #console-output {
                margin: 0;
                padding: 0;
                white-space: pre-wrap;
                tab-size: 4;
            }

            span {
                display: inline-block;
                min-height: 1.4em;
                line-height: 1.4;
            }

            .control-bar {
              background-color: #252526;
              top: 0px;
              position: sticky;
              width: "100%";
              padding: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #454545;
          }

          .stop-button {
              background-color: #f14c4c;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 12px;
              display: ${this.isRunning ? "block" : "none"};
          }

          .stop-button:hover {
              background-color: #cd3131;
          }

          .success-text {
              color: #89d185;
              align-self: center;
              margin-right: 10px;
              display: ${this.isRunning ? "none" : "block"};
          }

          .fail-text {
              color:rgb(203, 108, 58);
              align-self: center;
              margin-right: 10px;
              display: ${this.isRunning ? "none" : "block"};
          }

          .checkbox-container {
            display: flex;
            align-items: left;
            color: #cccccc;
            font-size: 12px;
          }

          .checkbox-container input {
              margin-right: 5px;
          }
        </style>
    </head>
    <body><div class="control-bar"><div class="checkbox-container"><input type="checkbox" id="autoscrollCheckbox" ${this.isAutoScroll ? "checked" : ""} /><label for="autoscrollCheckbox">Auto Scroll</label></div>${
      this.isKilled
        ? '<span class="fail-text">Script was canceled</span>'
        : '<span class="success-text">Script finished</span>'
    }<button class="stop-button" id="stopButton">Stop Script</button></div><div id="console-output">${this.logs.join("")}</div>
      <script>
          const vscode = acquireVsCodeApi();

          ${this.isAutoScroll ? "window.scrollTo(0, document.body.scrollHeight);" : ""}

          document.getElementById('stopButton').addEventListener('click', () => {
              vscode.postMessage({ command: 'stopScript' });
          });

          document.getElementById('autoscrollCheckbox').addEventListener('change', (event) => {
            vscode.postMessage({
                command: 'setAutoScroll',
                isAutoScroll: event.target.checked
            });
        });
      </script>
    </body>
    </html>`;
  }
}
