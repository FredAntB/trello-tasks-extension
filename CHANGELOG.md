# Change Log

All notable changes to the "tar-trello" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.1.2] - 2026-04-11

### Added

- `Reset Trello Data` action in the boards view title menu.
- Logout/login actions in the boards view title menu.

### Changed

- Trello authentication now uses browser-based OAuth callback flow.
- Boards/tasks auth state refresh is centralized through sync command handling.
- Board and task refresh actions now follow authentication context conditions.

### Fixed

- Fixed card loading crash when Trello cards payload is not an array (`cards.map is not a function`).
- Fixed stale logout warning after successful login.
- Fixed tasks panel not refreshing correctly after login/auth state changes.

## [0.1.1]

### Fixed

- Logout warning now disappears after successful login.
- Tasks view refreshes after login instead of remaining in logged-out state.
- Auth state changes now resync boards and tasks views automatically.

## [0.1.0]

### Added

- Initial release of Task at Reach - Trello.