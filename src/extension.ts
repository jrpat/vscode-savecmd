import * as vscode from "vscode";
import Runner from "./runner";

function debounce<T extends (...args: any[]) => void>(delay: number, fn: T) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function activate(context: vscode.ExtensionContext): void {
  var extension = new Runner(context);
  extension.showOutputMessage();

  const onSave = (document: vscode.TextDocument) => {
    extension.runCommands(document);
  };

  vscode.commands.registerCommand("extension.cmdOnSave.enable", () => {
    extension.isEnabled = true;
  });

  vscode.commands.registerCommand("extension.cmdOnSave.disable", () => {
    extension.isEnabled = false;
  });

  vscode.workspace.onDidChangeConfiguration(() => {
    let disposeStatus = extension.showStatusMessage(
      "CmdOnSave: Reloading config."
    );
    extension.loadConfig();
    disposeStatus.dispose();
  });

  vscode.workspace.onDidSaveTextDocument(debounce(500, onSave));
}
