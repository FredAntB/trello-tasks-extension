//@ts-check

/** @type {() => any} */
// @ts-ignore - injected by VS Code webview runtime
const acquireVsCodeApi = globalThis.acquireVsCodeApi;

(function () {
    const vscode = acquireVsCodeApi();

    const tasksList = /** @type {HTMLElement | null} */ (document.querySelector('.tasks-list'));
    const selectedListLabel = /** @type {HTMLElement | null} */ (document.querySelector('.selected-list-label'));
    const refreshButton = /** @type {HTMLButtonElement | null} */ (document.querySelector('.refresh-tasks-button'));

    (function setTaskAccentFromTheme() {
        const cs = getComputedStyle(document.documentElement);
        const themeBg = cs.getPropertyValue('--vscode-sideBar-background') || cs.getPropertyValue('--vscode-editor-background') || cs.getPropertyValue('--vscode-panel-background') || '';

        /** @param {string} input */
        function parseColor(input) {
            if (!input) { return null; }
            input = input.trim();
            const m = input.match(/rgba?\(([^)]+)\)/);
            if (m) {
                const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
                return { r: parts[0], g: parts[1], b: parts[2] };
            }
            const hex = input.replace('#', '');
            if (hex.length === 6) {
                return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
            }
            if (hex.length === 3) {
                return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16) };
            }
            return null;
        }

        /** @param {{r:number,g:number,b:number}} c */
        function luminance(c) {
            const srgb = [c.r / 255, c.g / 255, c.b / 255].map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
            return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
        }

        const parsed = parseColor(themeBg);
        const isDark = parsed ? (luminance(parsed) < 0.5) : true;

        if (isDark) {
            document.documentElement.style.setProperty('--task-accent-bg', '#3d5a7a');
            document.documentElement.style.setProperty('--task-accent-border', '#5a8fd4');
        } else {
            document.documentElement.style.setProperty('--task-accent-bg', '#c9eff8');
            document.documentElement.style.setProperty('--task-accent-border', '#4a7b99');
        }
    })();

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'refreshTasks' });
        });
    }

    /**
     * Detect if theme is light or dark
     * @returns {'light' | 'dark'}
     */
    function getThemeType() {
        const cs = getComputedStyle(document.documentElement);
        const themeBg = cs.getPropertyValue('--vscode-sideBar-background') || cs.getPropertyValue('--vscode-editor-background') || '';
        
        /** @param {string} input */
        function parseColor(input) {
            if (!input) {
                return null;
            }
            input = input.trim();
            const m = input.match(/rgba?\(([^)]+)\)/);
            if (m) {
                const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
                return { r: parts[0], g: parts[1], b: parts[2] };
            }
            const hex = input.replace('#', '');
            if (hex.length === 6) {
                return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
            }
            if (hex.length === 3) {
                return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16) };
            }
            return null;
        }
        
        /** @param {{r:number,g:number,b:number}} c */
        function luminance(c) {
            const srgb = [c.r / 255, c.g / 255, c.b / 255].map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
            return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
        }
        
        const parsed = parseColor(themeBg);
        return parsed && luminance(parsed) < 0.5 ? 'dark' : 'light';
    }

    function resetSelectedListLabelStyle() {
        if (selectedListLabel) {
            selectedListLabel.removeAttribute('style');
        }
    }

    window.addEventListener('message', (event) => {
        const message = event.data;
        const action = message?.command || message?.type;

        switch (action) {
            case 'notAuthenticated': {
                if (selectedListLabel) {
                    selectedListLabel.classList.remove('is-loading');
                    const isDark = getThemeType() === 'dark';
                    const bg = isDark ? 'rgba(255, 200, 0, 0.1)' : 'rgba(180, 120, 255, 0.12)';
                    const border = isDark ? '#ffa500' : '#a855f7';
                    const text = isDark ? '#ffa500' : '#7c3aed';
                    selectedListLabel.style.cssText = `padding: 12px; text-align: center; background: ${bg}; border: 1px solid ${border}; border-radius: 4px; color: ${text}; font-weight: 500;`;
                    selectedListLabel.textContent = 'Oooops, you got logged out! Reconnect to Trello.';
                }
                if (tasksList) {
                    tasksList.textContent = '';
                }
                break;
            }
            case 'loading': {
                resetSelectedListLabelStyle();
                renderLoading(message.listId || '', message.listName || '');
                break;
            }
            case 'cards': {
                resetSelectedListLabelStyle();
                renderCards(message.cards || [], message.listId || '', message.listName || '');
                break;
            }
            case 'empty': {
                resetSelectedListLabelStyle();
                if (selectedListLabel) {
                    selectedListLabel.classList.remove('is-loading');
                    selectedListLabel.textContent = 'Select a list from Boards view.';
                }
                if (tasksList) {
                    tasksList.textContent = '';
                }
                break;
            }
            case 'error': {
                resetSelectedListLabelStyle();
                if (selectedListLabel) {
                    selectedListLabel.classList.remove('is-loading');
                    selectedListLabel.textContent = `Error: ${message.message || 'Unknown error'}`;
                }
                break;
            }
        }
    });

    /**
     * @param {string} listId
     * @param {string} listName
     */
    function renderLoading(listId, listName) {
        if (!tasksList) {
            return;
        }

        tasksList.textContent = '';
        if (selectedListLabel) {
            const label = listName || listId;
            selectedListLabel.classList.add('is-loading');
            selectedListLabel.textContent = label ? `Loading tasks for: ${label}` : 'Loading tasks...';
        }

        const loading = document.createElement('li');
        loading.className = 'task-loading';
        loading.innerHTML = '<span class="task-spinner" aria-hidden="true"></span><span class="task-loading-text">Loading tasks...</span>';
        tasksList.appendChild(loading);
    }

    /**
     * @param {Array<{ id: string, name: string, desc?: string }>} cards
     * @param {string} listId
     * @param {string} listName
     */
    function renderCards(cards, listId, listName) {
        if (!tasksList) {
            return;
        }

        tasksList.textContent = '';
        if (selectedListLabel) {
            const label = listName || listId;
            selectedListLabel.classList.remove('is-loading');
            selectedListLabel.textContent = label ? `List: ${label}` : 'Tasks';
        }

        if (!Array.isArray(cards) || cards.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'task-empty';
            empty.textContent = 'No tasks found in this list.';
            tasksList.appendChild(empty);
            return;
        }

        for (const card of cards) {
            const li = document.createElement('li');
            li.className = 'task-card';

            const title = document.createElement('h4');
            title.className = 'task-name';
            title.textContent = card.name || 'Untitled task';

            const desc = document.createElement('p');
            desc.className = 'task-desc';
            desc.textContent = card.desc || 'No description';

            li.appendChild(title);
            li.appendChild(desc);
            tasksList.appendChild(li);
        }
    }
})();
