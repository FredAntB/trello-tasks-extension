# Task at Reach - Trello

Task at Reach - Trello is a VS Code extension that brings your Trello workflow into the editor.

It lets you authenticate with Trello, browse your boards and lists, and inspect tasks (cards) from the VS Code activity bar.

## Features

- Trello OAuth login/logout from VS Code.
- Dedicated activity bar container: **Task At Reach**.
- Boards view to list available Trello boards.
- List selection flow to load cards for a selected list.
- Tasks view with refresh support.
- Built-in walkthrough to guide first-time setup.

### Suggested screenshots/GIFs (recommended before publishing)

If you want a polished Marketplace page, add these assets before publishing updates:

1. Login flow screenshot/GIF.
2. Board selection screenshot.
3. Tasks view screenshot (cards loaded).

You can place them in an assets folder such as `images/` and reference them here.

Suggested assets to prepare:

- Login flow screenshot
- Board selection screenshot
- Tasks view screenshot

## Requirements

### Runtime

- VS Code `^1.108.2` or newer.
- A Trello account.
- A Trello Power-Up / OAuth app configuration.

### Environment variables

This extension reads the following values from environment variables:

- `API_KEY`
- `SECRET`
- `BASE_URL`
- `CALLBACK_URL`
- `APP_NAME`

Without these values, login/authentication will fail.

### Development setup

1. Install dependencies:
	- `npm install`
2. Compile once:
	- `npm run compile`
3. Watch mode while developing:
	- `npm run watch`
4. Press `F5` in VS Code to launch the Extension Development Host.

## Extension Settings

This extension contributes the following setting:

- `tar-trello.enabled`: Enable or disable Task at Reach - Trello features.

## Known Issues

- No bundled onboarding validation for missing OAuth environment variables.
- If Trello authentication configuration is incorrect, the login flow may open but fail to finalize.
- UI currently focuses on browsing boards/lists/cards; advanced card actions are limited.

## Release Notes

### 0.1.0

Initial release of Task at Reach - Trello:

- Trello login/logout integration.
- Board and list browsing in webview.
- Task (card) display in dedicated tasks webview.

---

## Following extension guidelines

Review VS Code extension best practices:

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## For more information

- [Visual Studio Code Extension API](https://code.visualstudio.com/api)
- [Trello API Documentation](https://developer.atlassian.com/cloud/trello/rest/)
