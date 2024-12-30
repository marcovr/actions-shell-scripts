import process from "child_process";
import path from "path";
import {
  ExtensionContext,
  languages,
  TextDocument,
  window,
  workspace,
} from "vscode";
import { RunScriptProvider } from "./RunScriptProvider";
import { ScriptProvider } from "./ScriptProvider";
import { ShellcheckProvider } from "./ShellcheckProvider";

export let extensionContext: ExtensionContext;
export const scriptProvider = new ScriptProvider();
export const codeLensProvider = new RunScriptProvider();
export const diagnosticProvider = new ShellcheckProvider();

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

function runExtension(document?: TextDocument) {
  const config = workspace.getConfiguration("yaml-with-script");
  const enabled = config.get("enabled");

  if (!enabled) {
    scriptProvider.clear();
    return;
  }

  try {
    const config = workspace.getConfiguration("yaml-with-script");
    const shellcheckFolder = config.get<string>("shellcheckFolder") || "";
    process.execSync(path.join(shellcheckFolder, "shellcheck --version"), {
      encoding: "utf-8",
    });
  } catch (error: any) {
    scriptProvider.clear();
    window.showErrorMessage(
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

export async function activate(context: ExtensionContext) {
  extensionContext = context;
  runExtension();

  workspace.onDidOpenTextDocument(
    (document) => runExtension(document),
    context.subscriptions
  );
  workspace.onDidChangeTextDocument((event) => {
    if (event.contentChanges.some((item) => item.text.length > 0)) {
      runExtension(event.document);
    }
  }, context.subscriptions);
  workspace.onDidCloseTextDocument(
    (document) => runExtension(document),
    context.subscriptions
  );
  workspace.onDidSaveTextDocument(
    (document) => runExtension(document),
    context.subscriptions
  );
  workspace.onDidChangeConfiguration((config) => {
    if (config.affectsConfiguration("yaml-with-script")) {
      runExtension();
    }
  }, context.subscriptions);

  const codeLensSubscription = languages.registerCodeLensProvider(
    { pattern: "**/*.{yaml,yml}" },
    codeLensProvider
  );
  context.subscriptions.push(codeLensSubscription);
}

export function deactivate() {
  scriptProvider.clear();
}
