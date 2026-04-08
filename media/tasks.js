//@ts-check

/** @type {() => any} */
// @ts-ignore - injected by VS Code webview runtime
const acquireVsCodeApi = globalThis.acquireVsCodeApi;

(function () {
    const vscode = acquireVsCodeApi();

    const tasksList = /** @type {HTMLElement | null} */ (document.querySelector('.tasks-list'));
    const selectedListLabel = /** @type {HTMLElement | null} */ (document.querySelector('.selected-list-label'));
    const refreshButton = /** @type {HTMLButtonElement | null} */ (document.querySelector('.refresh-tasks-button'));

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'refreshTasks' });
        });
    }

    window.addEventListener('message', (event) => {
        const message = event.data;
        const action = message?.command || message?.type;

        switch (action) {
            case 'cards': {
                renderCards(message.cards || [], message.listId || '', message.listName || '');
                break;
            }
            case 'empty': {
                if (selectedListLabel) {
                    selectedListLabel.textContent = 'Select a list from Boards view.';
                }
                if (tasksList) {
                    tasksList.textContent = '';
                }
                break;
            }
            case 'error': {
                if (selectedListLabel) {
                    selectedListLabel.textContent = `Error: ${message.message || 'Unknown error'}`;
                }
                break;
            }
        }
    });

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
