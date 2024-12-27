import process from "child_process";
import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { Script } from "./Script";

export class DiagnosticProvider {
  private diagnostics: Map<vscode.Uri, vscode.Diagnostic[]> = new Map();
  private diagnosticCollection = vscode.languages.createDiagnosticCollection(
    "yaml-with-script-diagnostics"
  );

  add(script: Script) {
    const config = vscode.workspace.getConfiguration("yaml-with-script");
    const severity = config.get("severity");
    const dialect = config.get("dialect");
    const shellcheckFolder = config.get("shellcheckFolder", "");

    const tempScriptPath = script.createTmpFile();

    const command = [];
    command.push(path.join(shellcheckFolder, "shellcheck"));
    command.push(`--format=json`);
    command.push(`--severity=${severity}`);
    command.push(dialect === "inline" ? "" : `--shell=${dialect}`);
    command.push(tempScriptPath);
    command.push("|| true");

    const output = process.execSync(command.join(" "), { encoding: "utf-8" });
    fs.rm(tempScriptPath, () => {});
    const issues = JSON.parse(output);

    issues.forEach((issue: any) => {
      let severity;
      switch (issue.level) {
        case "error":
          severity = vscode.DiagnosticSeverity.Error;
          break;
        case "warning":
          severity = vscode.DiagnosticSeverity.Warning;
          break;
        case "info":
          severity = vscode.DiagnosticSeverity.Information;
          break;
        case "style":
          severity = vscode.DiagnosticSeverity.Hint;
          break;
        default:
          severity = vscode.DiagnosticSeverity.Information;
          break;
      }

      const position = new vscode.Range(
        script.position.translate(issue.line, issue.column),
        script.position.translate(issue.endLine, issue.endColumn)
      );
      const diagnostic = new vscode.Diagnostic(
        position,
        issue.message,
        severity
      );

      diagnostic.source = "shellcheck";
      diagnostic.code = {
        value: `SC${issue.code}`,
        target: vscode.Uri.parse(
          `https://www.shellcheck.net/wiki/SC${issue.code}`
        ),
      };

      if (this.diagnostics.has(script.document.uri)) {
        this.diagnostics.get(script.document.uri)?.push(diagnostic);
      } else {
        this.diagnostics.set(script.document.uri, [diagnostic]);
      }
    });

    this.updateDiagnostics();
  }

  clearSingle(document: vscode.TextDocument) {
    this.diagnostics.set(document.uri, []);
  }

  updateDiagnostics() {
    this.diagnostics.forEach((diagnostics, uri) => {
      this.diagnosticCollection.set(uri, undefined);
      this.diagnosticCollection.set(uri, diagnostics);
    });
  }
}
