import * as cp from "child_process";
import * as yaml from "js-yaml";
import * as vscode from "vscode";

// Führe ShellCheck auf dem extrahierten Shell-Code aus
function runShellCheck(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(script);

    const command = `echo '${script}' | shellcheck --shell=bash --format=json --norc /dev/stdin || true`;

    cp.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }
      resolve(stdout);
    });
  });
}

// Zeige die ShellCheck-Diagnosen im Editor an
function showShellCheckDiagnostics(document: vscode.TextDocument, script: string, startLine: number) {
  runShellCheck(script)
    .then((result) => {
      const diagnostics: vscode.Diagnostic[] = [];
      const issues = JSON.parse(result);

      issues.forEach((issue: any) => {
        const range = new vscode.Range(
          new vscode.Position(startLine + issue.line - 1, issue.column - 1),
          new vscode.Position(startLine + issue.line - 1, issue.column - 1 + issue.length)
        );
        const diagnostic = new vscode.Diagnostic(
          range,
          issue.message,
          issue.level === "warning" ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(diagnostic);
      });

      const diagnosticCollection = vscode.languages.createDiagnosticCollection("shellcheck");
      diagnosticCollection.set(document.uri, diagnostics);
    })
    .catch((err) => {
      vscode.window.showErrorMessage("ShellCheck konnte nicht ausgeführt werden: " + err);
    });
}

function extractShellScriptsFromYaml(yamlText: string) {
  const parsedYaml: Record<string, any> = yaml.load(yamlText) as Record<string, any>;

  const shellScripts: { script: string; startLine: number }[] = [];

  // todo: rekursive einbauen
  ["before_script", "script", "after_script"].forEach((section) => {
    if (parsedYaml && parsedYaml[section]) {
      const script = parsedYaml[section][0];

      console.log(script);
      const lines = script.split("\n");
      const startLine = lines[0].length ? 1 : 0;
      console.log(startLine);
      shellScripts.push({ script, startLine });
    }
  });

  return shellScripts;
}

export function activate(context: vscode.ExtensionContext) {
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "yaml") {
      const yamlText = document.getText();

      // Extrahiere Shell-Skripte
      const shellScripts = extractShellScriptsFromYaml(yamlText);

      // Zeige Fehler für jedes Skript im YAML-Dokument an
      shellScripts.forEach((scriptObj) => {
        showShellCheckDiagnostics(document, scriptObj.script, scriptObj.startLine);
      });
    }
  });
}

export function deactivate() {}
