import { ExtensionContext, window, workspace } from "vscode";
import { ScriptProvider } from "./ScriptProvider";

const scriptProvider = new ScriptProvider();
export async function activate(context: ExtensionContext) {
  scriptProvider.initContext(context);
  scriptProvider.analyze();

  window.onDidChangeActiveTextEditor(
    (editor) => scriptProvider.analyze(),
    context.subscriptions
  );

  workspace.onDidChangeTextDocument(
    (e) => scriptProvider.analyzeWithTimeout(),
    context.subscriptions
  );

  workspace.onDidSaveTextDocument(
    (doc) => scriptProvider.analyze(),
    context.subscriptions
  );
}

export function deactivate() {
  scriptProvider.clear();
}
