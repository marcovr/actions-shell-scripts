import { Position, Range, TextDocument } from "vscode";
import yaml from "yaml";

export class Script {
  public key: string;
  public document: TextDocument;
  public position: Position;
  public path: string;
  public extensionPath: string;
  public codelensPosition: Position;
  private index: number;

  constructor(
    document: TextDocument,
    position: Position,
    index: number,
    path: string,
    extensionPath: string
  ) {
    this.key = document.uri.toString();
    this.document = document;
    this.position = position;
    this.codelensPosition = new Position(position.line + 1, position.character);
    this.index = index;
    this.path = path;
    this.extensionPath = extensionPath;
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
}
