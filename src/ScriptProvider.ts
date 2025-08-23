import process from "child_process";
import path from "path";
import {
  ExtensionContext,
  languages,
  Position,
  TextDocument,
  window,
  workspace,
} from "vscode";
import { isCollection, isMap, parseDocument, Scalar, YAMLMap } from "yaml";
import { RunScriptProvider } from "./RunScriptProvider";
import { Script } from "./Script";
import { ShellcheckProvider } from "./ShellcheckProvider";

export class ScriptProvider {
  private extensionPath = "";
  private timer: NodeJS.Timeout | undefined;
  private runScriptProvider = new RunScriptProvider();
  private shellcheckProvider = new ShellcheckProvider();

  initContext(context: ExtensionContext) {
    this.extensionPath = context.extensionPath;
    const codeLensSubscription = languages.registerCodeLensProvider(
      { pattern: "**/*.{yaml,yml}" },
      this.runScriptProvider
    );
    context.subscriptions.push(codeLensSubscription);
  }

  clear() {
    this.runScriptProvider.clear();
    this.shellcheckProvider.clear();
  }

  analyzeWithTimeout() {
    if (this.timer) {
      this.timer.refresh();
    } else {
      this.timer = setTimeout(() => {
        this.analyze();
      }, 500);
    }
  }

  analyze() {
    const config = workspace.getConfiguration("actions-shell-scripts");
    const enabled = config.get("enabled");

    if (!enabled) {
      this.clear();
      return;
    }

    try {
      const config = workspace.getConfiguration("actions-shell-scripts");
      const shellcheckFolder = config.get<string>("shellcheckFolder") || "";
      process.execSync(path.join(shellcheckFolder, "shellcheck --version"), {
        encoding: "utf-8",
      });
    } catch (error: any) {
      this.clear();
      window.showErrorMessage(
        "Could not start extension, shellcheck not installed properly!" + error
      );
      return;
    }

    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }

    const document = activeTextEditor.document;
    this.clear();

    try {
      const text = document.getText();
      const yaml = parseDocument(text);

      if (!isMap(yaml.contents)) {
        return;
      }

      this.findWorkflowScripts(document, yaml.contents);
      this.findCompositeActionScripts(document, yaml.contents);
    } catch (error) {
      console.error(error);
    }
  }

  findWorkflowScripts(document: TextDocument, map: YAMLMap) {
    const jobs = map.get("jobs");
    if (!isMap(jobs)) {
      return;
    }

    jobs.items.forEach((job) => {
      if (isMap(job.value)) {
        this.findScriptSteps(document, job.value);
      }
    });
  }

  findCompositeActionScripts(document: TextDocument, map: YAMLMap) {
    const runs = map.get("runs");
    if (isMap(runs)) {
      this.findScriptSteps(document, runs);
    }
  }

  private findScriptSteps(document: TextDocument, element: YAMLMap) {
    const steps = element.get("steps");
    if (!isCollection(steps)) {
      return;
    }

    steps.items.forEach((step) => {
      if (!isMap(step)) {
        return;
      }

      const run = step.get("run");
      const shell = (step.get("shell") || "bash") as string;
      const shellIsValid = this.shellcheckProvider.isSupportedShell(shell);

      if (run && typeof run === "string" && shellIsValid) {
        this.extractScript(document, step, run, shell);
      }
    });
  }

  private extractScript(document: TextDocument, step: YAMLMap, run: string, shell: string) {
    const value = step.items.find((i: any) => i.key.value === "run")!.value as Scalar;
    let offset = value.range![0];
    const text = document.getText();

    let pos;
    if (value.type!.startsWith("BLOCK")) {
      offset -= text.indexOf("\n", offset) - offset + 2; // Adjust for block
      pos = this.offsetToLineCol(text, offset);
    } else {
      if (value.type!.startsWith("QUOTE")) {
        offset += 1; // Adjust for quotes
      }
      pos = this.offsetToLineColInline(text, offset);
    }

    const script = new Script(
      document,
      pos,
      run,
      this.extensionPath,
      shell
    );

    this.runScriptProvider.add(script);
    this.shellcheckProvider.add(script);
  }

  private offsetToLineCol(yamlText: string, offset: number) {
    const lines = yamlText.slice(0, offset).split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length;
    return new Position(line - 1, col - 1);
  }

  private offsetToLineColInline(yamlText: string, offset: number) {
    const lines = yamlText.slice(0, offset).split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length;
    return new Position(line - 2, col - 1);
  }
}
