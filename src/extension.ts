import * as vscode from "vscode";
import { slug, title } from "./name";
import Runner from "./runner";

function debounce<T extends (...args: any[]) => void>(delay: number, fn: T) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function activate(context: vscode.ExtensionContext): void {
  var ext = new Runner(context);
  ext.showOutputMessage();

  const onSave = (document: vscode.TextDocument) => {
    ext.runCommands(document);
  };

  vscode.commands.registerCommand(`extension.${slug}.toggle`, () => {
    ext.isEnabled = !ext.isEnabled;
    vscode.window.showInformationMessage(`${title} enabled: ${ext.isEnabled}`);
  });

  vscode.commands.registerCommand(`extension.${slug}.enable`, () => {
    ext.isEnabled = true;
  });

  vscode.commands.registerCommand(`extension.${slug}.disable`, () => {
    ext.isEnabled = false;
  });

  vscode.workspace.onDidChangeConfiguration(() => {
    let msg = ext.showStatusMessage(`${title}: reloading config`);
    ext.loadConfig();
    msg.dispose();
  });

  vscode.workspace.onDidSaveTextDocument(debounce(250, onSave));
}
