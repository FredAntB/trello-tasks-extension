import * as vscode from "vscode";
import { BUILTIN_API_KEY } from "./generated-config";

const DEFAULT_BASE_URL = "https://trello.com/1";
const DEFAULT_APP_NAME = "my-trello-vscode-extension";

export interface TrelloRuntimeConfig {
  apiKey: string | undefined;
  baseUrl: string;
  appName: string;
  callbackUrl: string;
}

export function getTrelloRuntimeConfig(
  context: vscode.ExtensionContext,
): TrelloRuntimeConfig {
  const settings = vscode.workspace.getConfiguration("tar-trello");

  const apiKey =
    settings.get<string>("apiKey")?.trim() ||
    process.env.API_KEY?.trim() ||
    BUILTIN_API_KEY.trim() ||
    undefined;

  const baseUrl =
    settings.get<string>("baseUrl")?.trim() ||
    process.env.BASE_URL?.trim() ||
    DEFAULT_BASE_URL;

  const appName =
    settings.get<string>("appName")?.trim() ||
    process.env.APP_NAME?.trim() ||
    DEFAULT_APP_NAME;

  const callbackUrl = `${vscode.env.uriScheme}://${context.extension.id}/auth`;

  return {
    apiKey,
    baseUrl,
    appName,
    callbackUrl,
  };
}
