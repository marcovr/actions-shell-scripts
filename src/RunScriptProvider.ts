import os from "os";
import fs from "fs";
import path from "path";
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
      title: "▶️ Run Script",
      command: "actions-shell-scripts.run",
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
    const config = workspace.getConfiguration("actions-shell-scripts");
    const runButtonEnabled = config.get("runButtonEnabled");

    if (!runButtonEnabled) {
      return [];
    }

    return this.codeLenses.get(document.uri.toString()) || [];
  }

  public resolveCodeLens(codeLens: CodeLens, _token: CancellationToken) {
    return codeLens;
  }
}

export const RunScriptProvider = RunScriptProviderImpl;

commands.registerCommand("actions-shell-scripts.run", (script: Script) => {
  const tmpFilePath = path.join(os.tmpdir(), "_shellcheck_script.sh");
  const config = workspace.getConfiguration("actions-shell-scripts");
  const baseScript = config.get("baseScript", "");

  const runScriptCommand = baseScript
    ? `source ${baseScript};\n${script.getContent()}`
    : script.getContent();

  fs.writeFileSync(tmpFilePath, runScriptCommand, "utf8");

  const terminalName = "GitHub Actions Shell Script";
  const isWindows = process.platform === "win32";
  const shell = isWindows ? "wsl" : undefined;

  const terminal =
    window.terminals.find((t) => t.name === terminalName) ||
    window.createTerminal(terminalName, shell);

  terminal.show();

  if (isWindows) {
    const escapedFilePath = tmpFilePath.replace(/\\/g, "\\\\");
    terminal.sendText(` bash --noprofile --norc -e -o pipefail "$(wslpath '${escapedFilePath}')"`);
  } else {
    terminal.sendText(` bash --noprofile --norc -e -o pipefail '${tmpFilePath}'`);
  }
});
