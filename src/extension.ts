import * as vscode from "vscode";
import { login, logout, reconnect, toggleAuth, updateAuthContext } from "./lib/login.service";
import { BoardsViewProvider } from "./lib/board.webview";
import { Board } from "./lib/board.service";
import { TasksViewProvider } from "./lib/task.webview";

let board = null;
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "tar-trello" is now active!');

  void updateAuthContext(context);

  const boardProvider = new BoardsViewProvider(context, context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BoardsViewProvider.viewType,
      boardProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tar-trello.load-boards", () => {
      boardProvider.loadBoards();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tar-trello.reload-boards", () => {
      boardProvider.loadBoards();
    }),
  );

  const taskProvider = new TasksViewProvider(context, context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TasksViewProvider.viewType,
      taskProvider,
    ),
  );

  boardProvider.setListSelectionHandler((listId: string, boardId?: string, listName?: string) => {
    void taskProvider.showTasksForList(listId, boardId, listName);
  });

  const syncAuthStateCmd = vscode.commands.registerCommand(
    "tar-trello.sync-auth-state",
    async () => {
      await boardProvider.syncAuthState();
      await taskProvider.syncAuthState();
    },
  );
  context.subscriptions.push(syncAuthStateCmd);

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

  const logoutCmd = vscode.commands.registerCommand(
    "tar-trello.logout",
    async () => {
      try {
        await logout(context);
      } catch (error: any) {
        vscode.window.showErrorMessage("Logout failed: " + error.message);
      }
    },
  );

  context.subscriptions.push(logoutCmd);

  const reconnectCmd = vscode.commands.registerCommand(
    "tar-trello.reconnect",
    async () => {
      try {
        await reconnect(context);
      } catch (error: any) {
        vscode.window.showErrorMessage("Reconnect failed: " + error.message);
      }
    },
  );

  const toggleAuthCmd = vscode.commands.registerCommand(
    "tar-trello.toggle-auth",
    async () => {
      try {
        await toggleAuth(context);
      } catch (error: any) {
        vscode.window.showErrorMessage("Auth toggle failed: " + error.message);
      }
    },
  );
  context.subscriptions.push(toggleAuthCmd);

  context.subscriptions.push(reconnectCmd);

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
