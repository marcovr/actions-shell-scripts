import { Position, Range, TextDocument } from "vscode";

const GH_EXPRESSION_REGEX = /\$\{\{.*?\}\}/g;

export interface GhExpressionRange {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export class Script {
  public key: string;
  public document: TextDocument;
  public position: Position;
  public extensionPath: string;
  public codelensPosition: Position;
  private content: string;
  private shell: string;

  constructor(
    document: TextDocument,
    position: Position,
    contnet: string,
    extensionPath: string,
    shell: string
  ) {
    this.key = document.uri.toString();
    this.document = document;
    this.position = position;
    this.codelensPosition = new Position(position.line + 1, position.character);
    this.content = contnet;
    this.extensionPath = extensionPath;
    this.shell = shell;
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

  getShell() {
    return this.shell;
  }

  getContent() {
    return this.normalizedContent()
      .replace(GH_EXPRESSION_REGEX, (match) => "A".repeat(match.length)); // Replace GH expressions ${{ ... }} with dummy content
  }

  // Finds ranges of GitHub Actions expressions ${{ ... }}
  getGhExpressionRanges(): GhExpressionRange[] {
    const ranges: GhExpressionRange[] = [];

    this.normalizedContent()
      .split("\n")
      .forEach((lineText, index) => {
        const line = index + 1;
        const regex = new RegExp(GH_EXPRESSION_REGEX);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(lineText))) {
          const column = match.index + 1;
          ranges.push({
            line,
            column,
            endLine: line,
            endColumn: column + match[0].length,
          });
        }
      });

    return ranges;
  }

  private normalizedContent() {
    return this.content.replace(/\r\n/g, "\n"); // Normalize line endings
  }
}
