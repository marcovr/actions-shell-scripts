import process from "child_process";
import path from "path";
import {
  Diagnostic,
  DiagnosticSeverity,
  languages,
  Range,
  Uri,
  workspace,
} from "vscode";
import { Script } from "./Script";

export class ShellcheckProvider {
  private diagnostics = languages.createDiagnosticCollection(
    "yaml-with-script-diagnostics"
  );

  clear() {
    this.diagnostics.clear();
  }

  add(script: Script) {
    const config = workspace.getConfiguration("yaml-with-script");
    const severity = config.get("severity");
    const dialect = config.get("dialect");
    const shellcheckFolder = config.get("shellcheckFolder", "");
    const shellcheckPath = path.join(shellcheckFolder, "shellcheck");

    const args = [
      "--format=json",
      `--severity=${severity}`,
    ];
    if (dialect !== "inline") {
      args.push(`--shell=${dialect}`);
    }
    args.push("-");

    const result = process.spawnSync(shellcheckPath, args, {
      input: script.getContent(),
      encoding: "utf-8",
    });

    if (result.error) {
      throw result.error; // Binary not found or failed to launch
    }

    const output = result.stdout;
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
        const existingDiagnostics =
          this.diagnostics.get(script.document.uri) ?? [];
        this.diagnostics.set(script.document.uri, [
          diagnostic,
          ...existingDiagnostics,
        ]);
      } else {
        this.diagnostics.set(script.document.uri, [diagnostic]);
      }
    });
  }
}
