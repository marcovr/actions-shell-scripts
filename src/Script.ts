import { Position, Range, TextDocument } from "vscode";

export class Script {
  public key: string;
  public document: TextDocument;
  public position: Position;
  public extensionPath: string;
  public codelensPosition: Position;
  private content: string;

  constructor(
    document: TextDocument,
    position: Position,
    contnet: string,
    extensionPath: string
  ) {
    this.key = document.uri.toString();
    this.document = document;
    this.position = position;
    this.codelensPosition = new Position(position.line + 1, position.character);
    this.content = contnet;
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
    return this.content
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\$\{\{.*?\}\}/g, (match) => 'A'.repeat(match.length)); // Replace GH placeholders with dummy content
  }
}
