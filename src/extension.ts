import * as vscode from "vscode";
import { login, logout, reconnect, resetData, toggleAuth, updateAuthContext } from "./lib/login.service";
import { BoardsViewProvider } from "./lib/board.webview";
import { TasksViewProvider } from "./lib/task.webview";

let board = null;
export function activate(context: vscode.ExtensionContext) {
  const isFresh = context.globalState.get<boolean>("tar-trello.fresh", true);
  
  void vscode.commands.executeCommand("setContext", "tar-trello.fresh", isFresh);

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

  const resetDataCmd = vscode.commands.registerCommand(
    "tar-trello.reset-data",
    async () => {
      try {
        await resetData(context);
      } catch (error: any) {
        vscode.window.showErrorMessage("Reset data failed: " + error.message);
      }
    },
  );

  context.subscriptions.push(resetDataCmd);

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
}

// This method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  board = null;
  resetData(context).catch((error) => {
    console.error("Error during pdeactivation reset:", error);
  });
}
