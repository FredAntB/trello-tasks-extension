import * as vscode from 'vscode';
import { OAuth } from 'oauth';

const API_KEY = process.env.API_KEY;
const SECRET = process.env.SECRET;

const CALLBACK_URL = process.env.CALLBACK_URL;

const APP_NAME = process.env.APP_NAME;

const oauth = new OAuth(
            'https://trello.com/1/OAuthGetRequestToken',
            'https://trello.com/1/OAuthGetAccessToken',
            API_KEY || '',
            SECRET || '',
            '1.0',
            CALLBACK_URL || '',
            'HMAC-SHA1'
        );

function getRequestToken(): Promise<{ token: string, tokenSecret: string }> {
    return new Promise((resolve, reject) => {
        oauth.getOAuthRequestToken((error, token, tokenSecret) => {
            if(error) {
                return reject(error);
            }
            resolve({ token, tokenSecret });
        });
    });
}

function getAccessToken(token: string, tokenSecret: string, verifier: string): Promise<{ accessToken: string, accessSecret: string }> {
    return new Promise((resolve, reject) => {
        oauth.getOAuthAccessToken(token, tokenSecret, verifier, (error, accessToken, accessSecret) => {
            if (error) {
                return reject(error);
            }
            resolve({ accessToken, accessSecret });
        });
    });
}

function verifyTokens(accessToken: string, accessSecret: string): Promise<any> {
    return new Promise((resolve, reject) => {
        oauth.get('https://api.trello.com/1/members/me', accessToken, accessSecret, (error, data) => {
            if (error) {
                reject("Token verification failed...\n"+error);
                vscode.window.showWarningMessage("Login verification failed...");
            }
            vscode.window.showInformationMessage("Successful Trello authentication.");
            resolve(data);
        });
    });
}

export async function login(context: any): Promise<void> {
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

        const authUrl = `https://trello.com/1/OAuthAuthorizeToken?oauth_token=${token}&name=${encodeURIComponent(APP_NAME)}&expiration=never&scope=read,write`;
        await vscode.env.openExternal(vscode.Uri.parse(authUrl));

        const verifier = await vscode.window.showInputBox({ prompt: "Enter the verification code provided by Trello:" });
        if (!verifier) {
            throw new Error("Verification code not provided.");
        }

        const { accessToken, accessSecret } = await getAccessToken(token, tokenSecret, verifier);

        await context.secrets.store("trelloAccessToken", accessToken);
        await context.secrets.store("trelloAccessSecret", accessSecret);

        const data = await verifyTokens(accessToken, accessSecret);
        console.log("Trello account data: ", data);
    }
    catch (error: any) {
        throw new Error('Login failed: ' + error.message);
    }
}