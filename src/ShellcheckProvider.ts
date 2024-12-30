import process from "child_process";
import path from "path";
import {
  Diagnostic,
  DiagnosticSeverity,
  languages,
  Range,
  TextDocument,
  Uri,
  workspace,
} from "vscode";
import { Script } from "./Script";

export class ShellcheckProvider {
  private diagnostics: Map<Uri, Diagnostic[]> = new Map();
  private diagnosticCollection = languages.createDiagnosticCollection(
    "yaml-with-script-diagnostics"
  );

  add(script: Script) {
    const config = workspace.getConfiguration("yaml-with-script");
    const severity = config.get("severity");
    const dialect = config.get("dialect");
    const shellcheckFolder = config.get("shellcheckFolder", "");

    const command = [];
    command.push(`printf '%s' '${script.getContent()}' | `);
    command.push(path.join(shellcheckFolder, "shellcheck"));
    command.push(`--format=json`);
    command.push(`--severity=${severity}`);
    command.push(dialect === "inline" ? "" : `--shell=${dialect}`);
    command.push("/dev/stdin");
    command.push("|| true");

    const output = process.execSync(command.join(" "), { encoding: "utf-8" });
    const issues = JSON.parse(output);

    issues.forEach((issue: any) => {
      let severity;
      switch (issue.level) {
        case "error":
          severity = DiagnosticSeverity.Error;
          break;
        case "warning":
          severity = DiagnosticSeverity.Warning;
          break;
        case "info":
          severity = DiagnosticSeverity.Information;
          break;
        case "style":
          severity = DiagnosticSeverity.Hint;
          break;
        default:
          severity = DiagnosticSeverity.Information;
          break;
      }

      const position = new Range(
        script.position.translate(issue.line, issue.column),
        script.position.translate(issue.endLine, issue.endColumn)
      );
      const diagnostic = new Diagnostic(position, issue.message, severity);

      diagnostic.source = "shellcheck";
      diagnostic.code = {
        value: `SC${issue.code}`,
        target: Uri.parse(`https://www.shellcheck.net/wiki/SC${issue.code}`),
      };

      if (this.diagnostics.has(script.document.uri)) {
        this.diagnostics.get(script.document.uri)?.push(diagnostic);
      } else {
        this.diagnostics.set(script.document.uri, [diagnostic]);
      }
    });

    this.updateDiagnostics();
  }

  clearSingle(document: TextDocument) {
    this.diagnostics.set(document.uri, []);
  }

  updateDiagnostics() {
    this.diagnostics.forEach((diagnostics, uri) => {
      this.diagnosticCollection.set(uri, undefined);
      this.diagnosticCollection.set(uri, diagnostics);
    });
  }
}
