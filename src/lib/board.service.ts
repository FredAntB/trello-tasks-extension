import * as vscode from "vscode";
import "node-fetch";

const API_KEY = process.env.API_KEY;

const BASE_URL = process.env.BASE_URL;

export class Board {
    context: vscode.ExtensionContext;
    token;
    currentBoard: number | undefined;
    boards: { id: number, name: string }[];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.token = this.context.secrets.get("trelloAccessToken");
        this.boards = [];

        if (!this.token) {
            vscode.window.showErrorMessage("No token found, please login first.");
            throw new Error("Missing access token.");
        }

        this.currentBoard = this.context.globalState.get("trelloCurrentBoard");
    }

    async getBoards(): Promise<any> {
        const url = `${BASE_URL}/boards?key=${API_KEY}&token=${this.token}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        const boards = await response.json();
        console.dir(boards);
    }

    async setBoard(id: number) {
        this.currentBoard = id;
    }
}