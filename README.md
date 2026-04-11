# Task at Reach - Trello

Task at Reach - Trello is a VS Code extension that lets you browse Trello boards and tasks from the editor.

It uses Trello’s token-based authorization flow, so users sign in directly with Trello and the resulting token is stored securely in VS Code secret storage.

## Features

- Trello login via the browser token flow.
- Boards view in the VS Code activity bar.
- List selection and task browsing inside the editor.
- Refresh actions for boards and tasks.
- Built-in walkthrough for first-time setup.

### Suggested screenshots or GIFs

If you want to polish the Marketplace page, consider adding:

- Login flow screenshot or GIF.
- Boards view screenshot.
- Tasks view screenshot.

## Requirements

- VS Code `^1.108.2` or newer.
- A Trello account.
- A Trello Power-Up / API key.

## Setup

1. Install dependencies with `npm install`.
2. Set the required environment variables for development:
	- `API_KEY`
	- `APP_NAME`
	- `BASE_URL` if you want to override the default Trello API base URL.
3. Run `npm run compile` or `npm run watch`.
4. Launch the extension host from VS Code.

## How login works

1. Click **Login to Trello**.
2. The extension opens Trello’s authorization page in your browser.
3. After approving access, Trello shows your token on the page.
4. Paste that token back into the VS Code prompt.

The token is then validated and stored securely in VS Code secret storage.

## Extension Settings

- `tar-trello.enabled`: Enable or disable the extension.

## Known Issues

- The Trello browser callback still needs to complete so VS Code can finish the login flow.
- If the browser does not return focus to VS Code automatically, switch back to the editor and wait for the callback to finish.
- Board and task data depend on a valid Trello token; if the session is revoked, use the reconnect action to sign in again.

## Release Notes

### 0.1.0

Initial release of Task at Reach - Trello.

### 0.1.1

Bug fix: logout warning now disappears after a successful login.
Bug fix: the tasks view now refreshes after login instead of staying stuck on the logout message.
Bug fix: auth state changes now resync the boards and tasks views automatically.

---

## Following extension guidelines

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
