import process from "child_process";
import path from "path";
import * as vscode from "vscode";
import { CodeLensProvider } from "./CodeLensProvider";
import { DiagnosticProvider } from "./DiagnosticProvider";
import { ScriptProvider } from "./ScriptProvider";

export let extensionContext: vscode.ExtensionContext;
export const scriptProvider = new ScriptProvider();
export const codeLensProvider = new CodeLensProvider();
export const diagnosticProvider = new DiagnosticProvider();

scriptProvider.setOnStartAnalyzeFunction(() => {
  const scripts = scriptProvider.get();

  scripts.forEach((script) => {
    codeLensProvider.clearSingle(script.document);
    diagnosticProvider.clearSingle(script.document);
  });
});

scriptProvider.setOnEndAnalyzeFunction(() => {
  const scripts = scriptProvider.get();

  scripts.forEach(async (script) => {
    codeLensProvider.add(script);
    diagnosticProvider.add(script);
  });

  diagnosticProvider.updateDiagnostics();
});

function runExtension(document?: vscode.TextDocument) {
  const config = vscode.workspace.getConfiguration("yaml-with-script");
  const enabled = config.get("enabled");

  if (!enabled) {
    scriptProvider.clear();
    return;
  }

  try {
    const config = vscode.workspace.getConfiguration("yaml-with-script");
    const shellcheckFolder = config.get<string>("shellcheckFolder") || "";
    process.execSync(path.join(shellcheckFolder, "shellcheck --version"), {
      encoding: "utf-8",
    });
  } catch (error: any) {
    scriptProvider.clear();
    vscode.window.showErrorMessage(
      "Could not start extension, shellsheck not installed properly!" + error
    );
    return;
  }

  if (document) {
    scriptProvider.analyze(document);
  } else {
    scriptProvider.analyzeAllOpen();
  }
}

export async function activate(context: vscode.ExtensionContext) {
  extensionContext = context;
  runExtension();

  vscode.workspace.onDidOpenTextDocument(
    (document) => runExtension(document),
    context.subscriptions
  );
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (
      event.contentChanges.filter((item) => item.text.length > 0).length > 0
    ) {
      runExtension(event.document);
    }
  }, context.subscriptions);
  vscode.workspace.onDidCloseTextDocument(
    (document) => runExtension(document),
    context.subscriptions
  );
  vscode.workspace.onDidSaveTextDocument(
    (document) => runExtension(document),
    context.subscriptions
  );
  vscode.workspace.onDidChangeConfiguration((config) => {
    if (config.affectsConfiguration("yaml-with-script")) {
      runExtension();
    }
  }, context.subscriptions);

  const codeLensSubscription = vscode.languages.registerCodeLensProvider(
    { pattern: "**/*.{yaml,yml}" },
    codeLensProvider
  );
  context.subscriptions.push(codeLensSubscription);
}

export function deactivate() {
  scriptProvider.clear();
}
