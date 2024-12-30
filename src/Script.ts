import fs from "fs";
import os from "os";
import path from "path";
import { Position, Range, TextDocument } from "vscode";
import yaml from "yaml";

export class Script {
  public key: string;
  public document: TextDocument;
  public position: Position;
  public path: string;
  public codelensPosition: Position;
  private index: number;

  constructor(
    document: TextDocument,
    position: Position,
    index: number,
    path: string
  ) {
    this.key = document.uri.toString();
    this.document = document;
    this.position = position;
    this.codelensPosition = new Position(position.line + 1, position.character);
    this.index = index;
    this.path = path;
  }

  getRangeToPosition(
    lineStart: number,
    columnStart: number,
    lineEnd: number,
    columnEnd: number
  ) {
    return new Range(
      this.position.translate(lineStart, columnStart),
      this.position.translate(lineEnd, columnEnd)
    );
  }

  getContent() {
    const pathParts = this.path.split(".");
    let yamlDoc = yaml.parse(this.document.getText());

    for (const part of pathParts) {
      if (yamlDoc[part] !== undefined) {
        yamlDoc = yamlDoc[part];
      } else {
        return undefined;
      }
    }

    return yamlDoc[this.index];
  }

  createTmpFile() {
    const tmpExtensionFolder = path.join(os.homedir(), ".yaml-with-bash");
    fs.mkdirSync(tmpExtensionFolder, { recursive: true });

    const filename = [];
    filename.push(this.getDate());
    filename.push("-");
    filename.push(path.basename(this.document.fileName).replace(" ", "_"));
    filename.push("-");
    filename.push(this.path);
    filename.push(".sh");

    const tempScriptPath = path.join(tmpExtensionFolder, filename.join(""));
    fs.writeFileSync(tempScriptPath, this.getContent());
    fs.chmodSync(tempScriptPath, 0o755);
    return tempScriptPath;
  }

  private pad2(n: number) {
    return n < 10 ? "0" + n : n;
  }
  private getDate(): string {
    const date = new Date();
    return (
      date.getFullYear().toString() +
      this.pad2(date.getMonth() + 1) +
      this.pad2(date.getDate()) +
      this.pad2(date.getHours()) +
      this.pad2(date.getMinutes()) +
      this.pad2(date.getSeconds())
    );
  }
}
