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
import { GhExpressionRange, Script } from "./Script";

// Shellcheck codes which don't play nice with GitHub Actions expressions
// See: https://github.com/marcovr/actions-shell-scripts/issues/2
const GH_EXPRESSION_FALSE_POSITIVES = new Set(["SC2050", "SC2078", "SC2193"]);

const SUPPORTED_SHELLS = new Set(["sh", "bash", "dash", "ksh", "busybox"]);

interface ShellCheckIssue {
  file: string,
  line: number;
  endLine: number;
  column: number;
  endColumn: number;
  level: "error" | "warning" | "info" | "style";
  code: number;
  message: string;
}

export function rangesOverlap(a: GhExpressionRange, b: GhExpressionRange) {
  // Only compare lines, not columns as for shellcheck likes to mark the ==
  const before = (x: GhExpressionRange, y: GhExpressionRange) => x.endLine < y.line;

  return !before(a, b) && !before(b, a);
}

export class ShellcheckProvider {
  private diagnostics = languages.createDiagnosticCollection(
    "actions-shell-scripts-diagnostics"
  );

  clear() {
    this.diagnostics.clear();
  }

  add(script: Script) {
    if (!SUPPORTED_SHELLS.has(script.getShell())) {
      return;
    }

    const config = workspace.getConfiguration("actions-shell-scripts");
    const severity = config.get("severity");
    const shellcheckFolder = config.get("shellcheckFolder", "");
    const shellcheckPath = path.join(shellcheckFolder, "shellcheck");

    const args = [
      "--format=json",
      `--severity=${severity}`,
      `--shell=${script.getShell()}`,
      "-"
    ];

    const result = process.spawnSync(shellcheckPath, args, {
      input: script.getContent(),
      encoding: "utf-8",
    });

    if (result.error) {
      throw result.error; // Binary not found or failed to launch
    }

    const output = result.stdout;
    const issues: ShellCheckIssue[] = JSON.parse(output);
    const avoidFalsePositives = config.get("avoidFalsePositives");
    const ghExpressionRanges = avoidFalsePositives ? script.getGhExpressionRanges() : [];

    issues.forEach((issue: ShellCheckIssue) => {
      const code = `SC${issue.code}`;
      if (avoidFalsePositives
        && GH_EXPRESSION_FALSE_POSITIVES.has(code)
        && ghExpressionRanges.some((range) => rangesOverlap(range, issue))) {
        // Ignore shellcheck false positives
        return;
      }

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
        value: code,
        target: Uri.parse(`https://www.shellcheck.net/wiki/${code}`),
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
