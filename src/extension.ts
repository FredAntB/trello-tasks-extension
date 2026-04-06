import * as vscode from "vscode";
import { login } from "./lib/login.service";
import { BoardsViewProvider } from "./lib/board.webview";
import { Board } from "./lib/board.service";
import { BoardModel } from "./lib/board.explorer";
import { BoardTreeDataProvider } from "./lib/board.explorer";

let board = null;
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "tar-trello" is now active!');

  // WEB DATA PROVIDER ------------ START
  const provider = new BoardsViewProvider(context, context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BoardsViewProvider.viewType,
      provider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tar-trello.load-boards", () => {
      provider.loadBoards();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tar-trello.reload-boards", () => {
      provider.loadBoards();
    }),
  );

  // TREE DATA PROVIDER ------------ START
  const boardM = new BoardModel(context);
  const boardTDP = new BoardTreeDataProvider(boardM);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("tar-trello-tasks-view", boardTDP),
  );

  const loginCmd = vscode.commands.registerCommand(
    "tar-trello.login",
    async () => {
      try {
        await login(context);
      } catch (error: any) {
        vscode.window.showErrorMessage("Login failed: " + error.message);
      }
    },
  );

  context.subscriptions.push(loginCmd);

  const boardCmd = vscode.commands.registerCommand(
    "tar-trello.selectBoard",
    async () => {
      try {
        board = new Board(context);
        board.getBoards();
      } catch (error) {
        vscode.window.showErrorMessage("Board loading failed: " + error);
      }
    },
  );
  context.subscriptions.push(boardCmd);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "tar-trello.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello World from Task at Reach - Trello!",
      );
    },
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
  board = null;
}
