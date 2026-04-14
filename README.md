# Task at Reach - Trello (GitHub)

Task at Reach - Trello is a VS Code extension for browsing Trello boards, lists, and tasks directly from the editor.

This README is the repository/developer document.

For the Marketplace-facing page, see [README.marketplace.md](README.marketplace.md).

## Repository Structure

- Source code: [src](src)
- Webview assets: [media](media)
- Extension resources/icons: [resources](resources)
- Release history: [CHANGELOG.md](CHANGELOG.md)
- Marketplace content: [README.marketplace.md](README.marketplace.md)

## Development Setup

1. Install dependencies:
	- `npm install`
2. Configure environment variables for local development:
	- `API_KEY`
	- `APP_NAME`
	- `BASE_URL` (optional override)
	- `CALLBACK_URL` (used by browser callback login flow)
3. Compile once:
	- `npm run compile`
4. Or run watch mode:
	- `npm run watch`
5. Press `F5` to run the extension in the Extension Development Host.

## Commands and Views

Main commands are contributed from [package.json](package.json), including:

- Login/Logout
- Refresh Boards / Refresh Tasks
- Reset Trello Data

Main views are:

- Trello Boards webview
- Trello Tasks webview

## Authentication Notes

The extension uses browser-based Trello authorization and stores user tokens in VS Code Secret Storage.

If a token becomes invalid or revoked, users should re-authenticate.

## Packaging and Publishing

Use scripts in [package.json](package.json) for packaging/publishing.

Marketplace publishing should use [README.marketplace.md](README.marketplace.md) via `--readmePath`.

## License

This project is licensed under GPL-3.0-only. See [LICENSE](LICENSE).
