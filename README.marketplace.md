# Task at Reach - Trello

Task at Reach - Trello brings your Trello workflow into VS Code so you can inspect boards, select lists, and review tasks without leaving the editor.

## Features

- Browser-based Trello login.
- Trello Boards view in the activity bar.
- List selection to load task cards.
- Dedicated Tasks view with refresh support.
- Reset action for local extension Trello state.

## Requirements

- VS Code `^1.108.2` or newer.
- A Trello account.
- Trello API key/app configuration used by this extension.

## Quick Start

1. Install the extension.
2. Open **Task At Reach** from the activity bar.
3. Click **Login to Trello**.
4. Authorize in browser and return to VS Code.
5. Pick a board and then a list to view tasks.

## Extension Settings

- `tar-trello.enabled`: Enable/disable Task at Reach - Trello.

## Known Issues

- If browser callback does not return focus automatically, switch back to VS Code and wait for auth completion.
- If token is revoked in Trello, login is required again.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for full release details.

## Support / Repository

Source code and issues:

- [GitHub Repository](https://github.com/FredAntB/trello-tasks-extension)

## License

GPL-3.0-only
