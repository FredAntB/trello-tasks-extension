import * as vscode from "vscode";
import { BoardModel } from "./board.explorer";
import { isAuthenticated } from "./login.service";

export class TasksViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'tar-trello-tasks-view';

    private _view?: vscode.WebviewView;
    private model: BoardModel;
    private selectedList?: { listId: string; boardId?: string; listName?: string };
    private refreshCommandRegistered = false;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _extensionUri: vscode.Uri,
    ) {
        this.model = new BoardModel(_context);
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        const authenticated = await isAuthenticated(this._context);
        if (!authenticated) {
            webviewView.webview.postMessage({ command: 'notAuthenticated' });
            return;
        }

        if (!this.refreshCommandRegistered) {
            this._context.subscriptions.push(
                vscode.commands.registerCommand("tar-trello.reload-tasks", async () => {
                    await this.refreshTasks();
                })
            );
            this.refreshCommandRegistered = true;
        }

        if (this.selectedList?.listId) {
            void this.showTasksForList(this.selectedList.listId, this.selectedList.boardId, this.selectedList.listName);
        }
        else {
            webviewView.webview.postMessage({ command: 'empty' });
        }
    }

    private async refreshTasks() {
        if (this.selectedList?.listId) {
            await this.showTasksForList(this.selectedList.listId, this.selectedList.boardId, this.selectedList.listName);
        } else if (this._view) {
            this._view.webview.postMessage({ command: 'empty' });
        }
    }

    public async syncAuthState() {
        if (!this._view) {
            return;
        }

        const authenticated = await isAuthenticated(this._context);
        if (!authenticated) {
            this._view.webview.postMessage({ command: 'notAuthenticated' });
            return;
        }

        if (this.selectedList?.listId) {
            await this.showTasksForList(this.selectedList.listId, this.selectedList.boardId, this.selectedList.listName);
            return;
        }

        this._view.webview.postMessage({ command: 'empty' });
    }

    public async showTasksForList(listId: string, boardId?: string, listName?: string) {
        this.selectedList = { listId, boardId, listName };

        if (!this._view) {
            return;
        }
        try {
            this._view.webview.postMessage({ command: 'loading', listId, listName });
            const cards = await this.model.retrieveCards(listId, boardId);
            this._view.webview.postMessage({ command: 'cards', cards, listId, boardId, listName });
        } catch (err: any) {
            this._view.webview.postMessage({ command: 'error', message: err?.message || String(err) });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'tasks.js'));

        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleTasksUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'tasks.css'));

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">

                <!--
                    Use a content security policy to only allow loading styles from our extension directory,
                    and only allow scripts that have a specific nonce.
                    (See the 'webview-sample' extension sample for img-src content security policy examples)
                -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleTasksUri}" rel="stylesheet">
                
                <title>Trello Tasks</title>
            </head>
            <body>
                <header class="tasks-header">
                    <h3 class="tasks-title">Tasks</h3>
                </header>
                <p class="selected-list-label">Select a list from Boards view.</p>
                <ul class="tasks-list"></ul>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}