import * as vscode from "vscode";
import "node-fetch";

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;

export interface BoardNode {
  id: string;
  name: string;
  desc?: string;
  bgImage?: string;
  type: "board";
}

export interface ListNode {
  id: string;
  name: string;
  boardId: string;
  type: "list";
}

export interface CardNode {
  id: string;
  name: string;
  desc?: string;
  listId: string;
  boardId?: string;
  type: "card";
}

export type TreeNode = BoardNode | ListNode | CardNode;

// this is the board model for the trello board explorer
export class BoardModel {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private getToken(): Thenable<string | undefined> {
    return this.context.secrets.get("trelloAccessToken");
  }

  public retriveBoardNodes(): Thenable<BoardNode[]> {
    return (async () => {
      const token = await this.getToken();
      const tokenParam = token ? `&token=${token}` : "";
      const url = `${BASE_URL}/members/me/boards?key=${API_KEY}${tokenParam}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const boards = (await res.json()) as any[];

      return boards.map((b) => ({
        id: b.id,
        name: b.name,
        desc: b.desc || "No description available.",
        bgImage:
        b.prefs?.backgroundImageScaled?.[0]?.url ||
        b.prefs?.backgroundImageScaled?.[0]?.url ||
        b.prefs?.backgroundImage ||
          b.prefs?.background ||
          undefined,
        type: "board" as const,
      }));
    })();
  }

  public retrieveLists(boardId: string): Thenable<ListNode[]> {
    return (async () => {
      const token = await this.getToken();
      const tokenParam = token ? `&token=${token}` : "";
      const url = `${BASE_URL}/boards/${boardId}/lists?key=${API_KEY}${tokenParam}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const lists = (await res.json()) as any[];
      return lists.map((l) => ({
        id: l.id,
        name: l.name,
        boardId,
        type: "list" as const,
      }));
    })();
  }

  public retrieveCards(listId: string, boardId?: string): Thenable<CardNode[]> {
    return (async () => {
      const token = await this.getToken();
      const tokenParam = token ? `&token=${token}` : "";
      const url = `${BASE_URL}/lists/${listId}/cards?key=${API_KEY}${tokenParam}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await res.json();

      if (!res.ok) {
        const apiMessage =
          payload && typeof payload === "object" && "message" in payload
            ? String((payload as { message?: unknown }).message)
            : `HTTP ${res.status}`;
        throw new Error(`Failed to load cards: ${apiMessage}`);
      }

      if (!Array.isArray(payload)) {
        const apiMessage =
          payload && typeof payload === "object" && "message" in payload
            ? String((payload as { message?: unknown }).message)
            : "Unexpected cards response format.";
        throw new Error(`Failed to load cards: ${apiMessage}`);
      }

      const cards = payload as any[];
      return cards.map((c) => ({
        id: c.id,
        name: c.name,
        desc: c.desc || "",
        listId,
        boardId,
        type: "card" as const,
      }));
    })();
  }

  // unified getChildren for provider usage
  public getChildren(node?: TreeNode): Thenable<TreeNode[]> {
    if (!node) {
      return this.retriveBoardNodes();
    }
    if (node.type === "board") {
      return this.retrieveLists(node.id);
    }
    if (node.type === "list") {
      return this.retrieveCards(node.id, node.boardId);
    }
    return Promise.resolve([]);
  }
}

export class BoardTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<any> =
    new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;

  constructor(private readonly model: BoardModel) {}

  public refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    const label = element.name;
    const tooltip = "desc" in element ? element.desc : undefined;
    const collapsible =
      element.type === "board" || element.type === "list"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

    const item = new vscode.TreeItem(label, collapsible);
    item.tooltip = tooltip;
    item.contextValue = element.type; // "board" | "list" | "card"
    if (element.type === "card" && element.desc) {
      item.description = element.desc;
    }
    return item;
  }

  getChildren(element?: TreeNode): Thenable<TreeNode[]> {
    return this.model.getChildren(element as TreeNode | undefined);
  }
}
