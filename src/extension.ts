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
  var ext = new Runner(context);
  ext.showOutputMessage();

  const onSave = (document: vscode.TextDocument) => {
    ext.runCommands(document);
  };

  const inform = () => {
    const status = ext.isEnabled ? 'Enabled' : 'Disabled'
    vscode.window.showInformationMessage(`SaveCmd: ${status}`);
  }

  vscode.commands.registerCommand(`extension.savecmd.toggle`, () => {
    ext.isEnabled = !ext.isEnabled;
    inform();
  });

  vscode.commands.registerCommand(`extension.savecmd.enable`, () => {
    ext.isEnabled = true;
    inform();
  });

  vscode.commands.registerCommand(`extension.savecmd.disable`, () => {
    ext.isEnabled = false;
    inform();
  });

  vscode.workspace.onDidChangeConfiguration(() => {
    let msg = ext.showStatusMessage(`SaveCmd: Reloading Config`);
    ext.loadConfig();
    msg.dispose();
  });

  vscode.workspace.onDidSaveTextDocument(debounce(250, onSave));
}
