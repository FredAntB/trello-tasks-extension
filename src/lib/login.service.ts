import * as vscode from "vscode";
import { getTrelloRuntimeConfig } from "./config";

async function verifyToken(context: vscode.ExtensionContext): Promise<any> {
  const { apiKey, baseUrl } = getTrelloRuntimeConfig(context);
  const accessToken = await context.secrets.get("trelloAccessToken");

  if (!accessToken) {
    vscode.window.showErrorMessage("No access token found, did you log in?");
    throw new Error("You need to login if you want to verify.");
  }

  const url = new URL(`${baseUrl}/members/me`);
  url.searchParams.set("key", apiKey || "");
  url.searchParams.set("token", accessToken);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : `HTTP ${response.status}`;
    throw new Error(`Token verification failed: ${message}`);
  }

  vscode.window.showInformationMessage("Successful Trello authentication.");
  console.dir(payload, { depth: null });
  return payload;
}

function buildAuthorizeUrl(
  apiKey: string,
  appName: string,
  baseUrl: string,
  returnUrl: string,
): string {
  const authUrl = new URL(`${baseUrl}/authorize`);
  authUrl.searchParams.set("key", apiKey);
  authUrl.searchParams.set("name", appName);
  authUrl.searchParams.set("expiration", "never");
  authUrl.searchParams.set("scope", "read,write");
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("callback_method", "fragment");
  authUrl.searchParams.set("return_url", returnUrl);
  return authUrl.toString();
}

function parseTokenFromUri(uri: vscode.Uri): string | undefined {
  if (uri.fragment) {
    const fragmentParams = new URLSearchParams(uri.fragment);
    const fragmentToken = fragmentParams.get("token");
    if (fragmentToken) {
      return fragmentToken;
    }
  }

  if (uri.query) {
    const queryParams = new URLSearchParams(uri.query);
    const queryToken = queryParams.get("token");
    if (queryToken) {
      return queryToken;
    }
  }

  return undefined;
}

async function waitForTokenFromCallback(
  context: vscode.ExtensionContext,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      disposable.dispose();
      reject(new Error("Timed out waiting for Trello callback."));
    }, 180000);

    const disposable = vscode.window.registerUriHandler({
      handleUri(uri) {
        const token = parseTokenFromUri(uri);
        if (!token) {
          return;
        }

        clearTimeout(timeout);
        disposable.dispose();
        resolve(token);
      },
    });

    context.subscriptions.push(disposable);
  });
}

export async function login(context: vscode.ExtensionContext): Promise<void> {
  const { apiKey, appName, callbackUrl, baseUrl } = getTrelloRuntimeConfig(context);

  if (!apiKey) {
    vscode.window.showErrorMessage("Trello API key missing.");
    throw new Error("Missing API key.");
  }

  if (!appName) {
    vscode.window.showErrorMessage("Trello app name missing.");
    throw new Error("Missing Trello's app name.");
  }

  if (!callbackUrl) {
    vscode.window.showErrorMessage("Trello callback URL missing.");
    throw new Error("Missing callback URL.");
  }

  try {
    const tokenPromise = waitForTokenFromCallback(context);

    const authUrl = buildAuthorizeUrl(apiKey, appName, baseUrl, callbackUrl);
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    const token = await tokenPromise;

    await context.secrets.store("trelloAccessToken", token.trim());
    await verifyToken(context);
    await vscode.commands.executeCommand(
      "setContext",
      "tar-trello.authenticated",
      true,
    );
    await setFreshStart(false);
    await context.globalState.update("tar-trello.fresh", false);
    await vscode.commands.executeCommand("tar-trello.sync-auth-state");
    vscode.window.showInformationMessage("Login successful!");
  } catch (error: any) {
    throw new Error("Login failed: " + error.message);
  }
}

export async function logout(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete("trelloAccessToken");
  await vscode.commands.executeCommand(
    "setContext",
    "tar-trello.authenticated",
    false,
  );
  await vscode.commands.executeCommand("tar-trello.sync-auth-state");
  vscode.window.showInformationMessage("Logged out from Trello.");
}

export async function reconnect(context: vscode.ExtensionContext): Promise<void> {
  await logout(context);
  await login(context);
}

export async function isAuthenticated(
  context: vscode.ExtensionContext,
): Promise<boolean> {
  const token = await context.secrets.get("trelloAccessToken");
  return !!token;
}

export async function updateAuthContext(
  context: vscode.ExtensionContext,
): Promise<void> {
  const authenticated = await isAuthenticated(context);
  await vscode.commands.executeCommand(
    "setContext",
    "tar-trello.authenticated",
    authenticated,
  );
}

export async function setFreshStart(
  fresh: boolean,
): Promise<void> {
  await vscode.commands.executeCommand(
    "setContext",
    "tar-trello.fresh",
    fresh,
  );
}

export async function toggleAuth(context: vscode.ExtensionContext): Promise<void> {
  const authenticated = await isAuthenticated(context);
  if (authenticated) {
    await logout(context);
  } else {
    await login(context);
    await updateAuthContext(context);
    await vscode.commands.executeCommand("tar-trello.sync-auth-state");
  }
}

export async function resetData(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete("trelloAccessToken");

  await context.globalState.update("trelloCurrentBoard", undefined);

  await vscode.commands.executeCommand(
    "setContext",
    "tar-trello.authenticated",
    false,
  );
  await setFreshStart(true);
  await context.globalState.update("tar-trello.fresh", true);
  await vscode.commands.executeCommand("tar-trello.sync-auth-state");

  vscode.window.showInformationMessage("Task at Reach data has been reset.");
}