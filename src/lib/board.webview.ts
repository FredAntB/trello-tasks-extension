import * as vscode from "vscode";
import { BoardModel } from "./board.explorer";

export class BoardsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'tar-trello-boards-view';

	private _view?: vscode.WebviewView;
	private model: BoardModel;
	private onListSelected?: (listId: string, boardId?: string, listName?: string) => void;

	constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _extensionUri: vscode.Uri,
	) {
		this.model = new BoardModel(_context);
	}

	public resolveWebviewView(
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

		webviewView.webview.onDidReceiveMessage(async (msg) => {
			try {
				// Accept both `command` (preferred) and legacy `type` fields from the webview
				const action = msg?.command || msg?.type;
				switch (action) {
					case 'load-boards':
					case 'loadBoards': {
						const boards = await this.model.retriveBoardNodes();
						webviewView.webview.postMessage({ command: 'boards', boards });
						break;
					}
					case 'selectBoard': {
						if (msg?.boardId) {
							const lists = await this.model.retrieveLists(msg.boardId);
							webviewView.webview.postMessage({ command: 'lists', lists, boardId: msg.boardId });
						}
						break;
					}
					case 'selectList': {
						if (msg?.listId) {
							if (this.onListSelected) {
								this.onListSelected(msg.listId, msg.boardId, msg.listName);
							}
							else {
								const cards = await this.model.retrieveCards(msg.listId, msg.boardId);
								webviewView.webview.postMessage({ command: 'cards', cards, listId: msg.listId });
							}
						}
						break;
					}
				}
			}
			catch (error: any) {
				webviewView.webview.postMessage({ command: 'error', message: error?.message || String(error) });
			}
		});
	}

	public setListSelectionHandler(handler: (listId: string, boardId?: string, listName?: string) => void) {
		this.onListSelected = handler;
	}

	public loadBoards() {
		if (!this._view) {
			vscode.window.showWarningMessage('Boards view is not visible');
			return;
		}
		(async () => {
			try {
				const boards = await this.model.retriveBoardNodes();
				
				this._view!.webview.postMessage({ command: 'boards', boards });
			} catch (err: any) {
				this._view!.webview.postMessage({ command: 'error', message: err?.message || String(err) });
			}
		})();
	}

	public pickBoard() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'pickBoard' });
		}
	}

	public pickList() {
		if (this._view) {
		this._view.webview.postMessage({type: 'pickList'});
		}
	}

	public pickTask() {
		if (this._view) {
		this._view.webview.postMessage({ type: 'pickTask' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

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
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Trello Boards</title>
			</head>
			<body>
				<template id="card-template">
					<article class="card board-card">
						<div class="board-preview" aria-hidden="true"></div>
						<div class="card-meta">
							<h3 class="card-name"></h3>
							<label class="desc-label">Description</label>
							<p class="card-desc"></p>
						</div>
					</article>
				</template>
				<ul class="board-list">
				</ul>
				<button class="load-boards-button">Load Boards</button>

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