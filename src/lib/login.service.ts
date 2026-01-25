import * as vscode from "vscode";
import { OAuth } from "oauth";

const API_KEY = process.env.API_KEY;
const SECRET = process.env.SECRET;

const BASE_URL = process.env.BASE_URL;

const CALLBACK_URL = process.env.CALLBACK_URL;

const APP_NAME = process.env.APP_NAME;

const oauth = new OAuth(
  `${BASE_URL}/OAuthGetRequestToken`,
  `${BASE_URL}/OAuthGetAccessToken`,
  API_KEY || "",
  SECRET || "",
  "1.0",
  CALLBACK_URL || "",
  "HMAC-SHA1",
);

function getRequestToken(): Promise<{ token: string; tokenSecret: string }> {
  return new Promise((resolve, reject) => {
    oauth.getOAuthRequestToken((error, token, tokenSecret) => {
      if (error) {
        return reject(error);
      }
      resolve({ token, tokenSecret });
    });
  });
}

function getAccessToken(
  token: string,
  tokenSecret: string,
  verifier: string,
): Promise<{ accessToken: string; accessSecret: string }> {
  return new Promise((resolve, reject) => {
    oauth.getOAuthAccessToken(
      token,
      tokenSecret,
      verifier,
      (error, accessToken, accessSecret) => {
        if (error) {
          return reject(error);
        }
        resolve({ accessToken, accessSecret });
      },
    );
  });
}

async function verifyTokens(context: vscode.ExtensionContext): Promise<any> {
  const accessToken = await context.secrets.get("trelloAccessToken");
  const accessSecret = await context.secrets.get("trelloAccessSecret");

  if (!accessToken || !accessSecret) {
    vscode.window.showErrorMessage("No access token found, did you log in?");
    throw new Error("You need to login if you want to verify.");
  }
  return new Promise((resolve, reject) => {
    oauth.get(
      `${BASE_URL}/members/me`,
      accessToken,
      accessSecret,
      (error, data) => {
        if (error) {
          reject("Token verification failed...\n" + error);
          vscode.window.showWarningMessage("Login verification failed...");
        }
        vscode.window.showInformationMessage(
          "Successful Trello authentication.",
        );
        console.dir(data, { depth: null });
        resolve(data);
      },
    );
  });
}

function handleAuth(
  context: vscode.ExtensionContext,
  token: string,
  tokenSecret: string,
) {
  const handler = vscode.window.registerUriHandler({
    handleUri(uri) {
      const verifier = uri.query.split("&")[1].split("=")[1];
      getAccessToken(token, tokenSecret, verifier)
        .then(({ accessToken, accessSecret }) => {
          context.secrets.store("trelloAccessToken", accessToken);
          context.secrets.store("trelloAccessSecret", accessSecret);
        })
        .finally(async () => await verifyTokens(context));
        vscode.window.showInformationMessage("Login successful!");
    },
  });
  context.subscriptions.push(handler);
}

export async function login(context: vscode.ExtensionContext): Promise<void> {
  if (!API_KEY || !SECRET) {
    vscode.window.showErrorMessage("Trello API key/secret missing.");
    throw new Error("Missing API key or secret.");
  }

  if (!APP_NAME) {
    vscode.window.showErrorMessage("Trello app name missing.");
    throw new Error("Missing Trello's app name.");
  }

  try {
    const { token, tokenSecret } = await getRequestToken();

    handleAuth(context, token, tokenSecret);

    const authUrl = `${BASE_URL}/OAuthAuthorizeToken?oauth_token=${token}&name=${encodeURIComponent(APP_NAME)}&expiration=never&scope=read,write`;
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    console.log("waiting for verification code...");
  } catch (error: any) {
    throw new Error("Login failed: " + error.message);
  }
}
