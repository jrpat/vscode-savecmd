import * as vscode from "vscode";
import * as path from "path";
var ncp = require("copy-paste");
var endOfLine = require("os").EOL;

interface ICommand {
  match?: string;
  notMatch?: string;
  cmd: string;
  isAsync: boolean;
  isShellCommand: boolean;
}

interface IConfig {
  shell: string;
  autoClearConsole: boolean;
  commands: Array<ICommand>;
}

export default class Runner {
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext;
  private config: IConfig;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel("SaveCmd");
    this.config = vscode.workspace.getConfiguration("savecmd") as unknown as IConfig;
  }

  private runInTerminal(command: string) {
    var editor = vscode.window.activeTextEditor;
    if (!editor) return;
    var column = editor.viewColumn;
    ncp.copy(command + endOfLine, function () {
      vscode.commands
        .executeCommand("workbench.action.terminal.focus")
        .then(() => {
          vscode.commands
            .executeCommand("workbench.action.terminal.paste")
            .then(() => {
              if (!editor) return;
              vscode.window.showTextDocument(editor.document, column);
            });
        });
    });
  }

  private runAll(commands: ICommand[]): void {
    commands.forEach((command) => {
      if (command.isShellCommand) this.runInTerminal(command.cmd);
      else vscode.commands.executeCommand(command.cmd);
    });
  }

  public get isEnabled(): boolean {
    return !!this.context.globalState.get("isEnabled", true);
  }
  public set isEnabled(value: boolean) {
    this.context.globalState.update("isEnabled", value);
    this.showOutputMessage();
  }

  public get shell(): string {
    return this.config.shell;
  }

  public get autoClearConsole(): boolean {
    return !!this.config.autoClearConsole;
  }

  public get commands(): Array<ICommand> {
    return this.config.commands || [];
  }

  public loadConfig(): void {
    this.config = vscode.workspace.getConfiguration("savecmd") as unknown as IConfig;
  }

  public showOutputMessage(msg?: string): void {
    msg = msg || `SaveCmd: ${this.isEnabled ? "enabled" : "disabled"}.`;
    this.outputChannel.appendLine(msg);
  }

  public showStatusMessage(msg: string): vscode.Disposable {
    this.showOutputMessage(msg);
    return vscode.window.setStatusBarMessage(msg);
  }

  public runCommands(document: vscode.TextDocument): void {
    if (this.autoClearConsole) {
      this.outputChannel.clear();
    }

    if (!this.isEnabled || this.commands.length === 0) {
      this.showOutputMessage();
      return;
    }

    var match = (pattern: string) =>
      pattern &&
      pattern.length > 0 &&
      new RegExp(pattern).test(document.fileName);

    var commandConfigs = this.commands.filter((cfg) => {
      var matchPattern = cfg.match || "";
      var negatePattern = cfg.notMatch || "";

      // if no match pattern was provided, or if match pattern succeeds
      var isMatch = matchPattern.length === 0 || match(matchPattern);

      // negation has to be explicitly provided
      var isNegate = negatePattern.length > 0 && match(negatePattern);

      // negation wins over match
      return !isNegate && isMatch;
    });

    if (commandConfigs.length === 0) {
      return;
    }

    const msg = this.showStatusMessage("SaveCmd: Running...");
    setTimeout(() => msg.dispose(), 1000);

    // build our commands by replacing parameters with values
    var commands: Array<ICommand> = [];
    for (let cfg of commandConfigs) {
      var cmdStr = cfg.cmd;

      var extName = path.extname(document.fileName);

      var root = vscode.workspace.workspaceFolders![0].name;
      var relativeFile = "." + document.fileName.replace(root, "");

      cmdStr = cmdStr.replace(/\${relativeFile}/g, relativeFile);
      cmdStr = cmdStr.replace(/\${file}/g, `${document.fileName}`);
      cmdStr = cmdStr.replace(
        /\${workspaceRoot}/g,
        `${vscode.workspace.rootPath}`
      );
      cmdStr = cmdStr.replace(
        /\${fileBasename}/g,
        `${path.basename(document.fileName)}`
      );
      cmdStr = cmdStr.replace(
        /\${fileDirname}/g,
        `${path.dirname(document.fileName)}`
      );
      cmdStr = cmdStr.replace(/\${fileExtname}/g, `${extName}`);
      cmdStr = cmdStr.replace(
        /\${fileBasenameNoExt}/g,
        `${path.basename(document.fileName, extName)}`
      );
      cmdStr = cmdStr.replace(/\${cwd}/g, `${process.cwd()}`);

      // replace environment variables ${env.Name}
      cmdStr = cmdStr.replace(
        /\${env\.([^}]+)}/g,
        (sub: string, envName: string) => {
          return process.env[envName] ?? "";
        }
      );

      commands.push({
        cmd: cmdStr,
        isAsync: !!cfg.isAsync,
        isShellCommand: !!(cfg.isShellCommand === false ? false : true),
      });
    }

    this.runAll(commands);
  }
}
