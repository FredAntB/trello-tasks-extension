//@ts-check

/** @type {() => any} */
// @ts-ignore - injected by VS Code webview runtime
const acquireVsCodeApi = globalThis.acquireVsCodeApi;

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    /* global acquireVsCodeApi */
    const vscode = acquireVsCodeApi();
    const cardTemplate = /** @type {HTMLTemplateElement | null} */ (document.getElementById('card-template'));
    const boardList = /** @type {HTMLElement | null} */ (document.querySelector('.board-list'));
    const loadBoardsButton = /** @type {HTMLButtonElement | null} */ (document.querySelector('.load-boards-button'));

    const oldState = vscode.getState() || { boards: [], listsByBoardId: {} };
    console.dir(oldState.board, { depth: null });

    if (oldState.boards && oldState.boards.length > 0) {
        if (loadBoardsButton) {
            loadBoardsButton.disabled = true;
            loadBoardsButton.hidden = true;
            loadBoardsButton.style.display = 'none';
            console.log('[webview] initial state: boards present, disabling load button');
        }
    }
    else {
        console.log('[webview] initial state: no boards, load button enabled');
        loadBoardsButton?.removeAttribute('disabled');
        loadBoardsButton?.removeAttribute('hidden');
        loadBoardsButton?.style.removeProperty('display');
    }

    // Theme-based accent: pick a soft light color for light themes and a purplish tint for dark themes
    (function setBoardAccentFromTheme(){
        const cs = getComputedStyle(document.documentElement);
        // try a few theme variables (some themes expose different vars)
        const themeBg = cs.getPropertyValue('--vscode-sideBar-background') || cs.getPropertyValue('--vscode-editor-background') || cs.getPropertyValue('--vscode-panel-background') || '';

        /** @param {string} input */
        function parseColor(input){
            if (!input) { return null; }
            input = input.trim();
            // rgb(a)
            const m = input.match(/rgba?\(([^)]+)\)/);
            if (m) {
                const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
                return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
            }
            // hex
            const hex = input.replace('#','');
            if (hex.length === 6) {
                return { r: parseInt(hex.substring(0,2),16), g: parseInt(hex.substring(2,4),16), b: parseInt(hex.substring(4,6),16), a: 1 };
            }
            if (hex.length === 3) {
                return { r: parseInt(hex[0]+hex[0],16), g: parseInt(hex[1]+hex[1],16), b: parseInt(hex[2]+hex[2],16), a:1 };
            }
            return null;
        }

        /** @param {{r:number,g:number,b:number}} c */
        function luminance(c){
            // c: {r,g,b}
            const srgb = [c.r/255, c.g/255, c.b/255].map((v) => v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4));
            return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
        }

        const parsed = parseColor(themeBg);
        const isDark = parsed ? (luminance(parsed) < 0.5) : true;

        if (isDark) {
            // purplish clear background and border for dark theme
            document.documentElement.style.setProperty('--board-accent-bg', 'rgba(108,74,226,0.08)');
            document.documentElement.style.setProperty('--board-accent-border', 'rgba(108,74,226,0.28)');
        } else {
            // light blue-cyan accent for light theme
            document.documentElement.style.setProperty('--board-accent-bg', '#e6f7ff');
            document.documentElement.style.setProperty('--board-accent-border', '#9fdfff');
        }
    })();

    /** @type {Array<{ id: string, name: string, desc?: string, bgImage?: string }>} */
    let boards = Array.isArray(oldState.boards) ? oldState.boards : [];
    /** @type {Record<string, Array<{ id: string, name: string, boardId: string, type: 'list' }>>} */
    let listsByBoardId = oldState.listsByBoardId && typeof oldState.listsByBoardId === 'object' ? oldState.listsByBoardId : {};
    /** @type {Set<string>} */
    const expandedBoards = new Set();
    /** @type {Set<string>} */
    const pendingBoards = new Set();
    /** @type {HTMLElement | null} */
    let authNotice = null;
    const COLLAPSE_ANIMATION_MS = 220;

    updateBoardList(boards);
    // disable load button if we already have boards
    if (loadBoardsButton) {
        loadBoardsButton.disabled = Array.isArray(boards) && boards.length > 0;
    }

    // Request boards from the extension when button clicked
    if (loadBoardsButton) {
        loadBoardsButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'load-boards' });
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

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        console.log('[webview] received message', message);
        const action = message.command || message.type;
        switch (action) {
            case 'notAuthenticated': {
                if (authNotice) {
                    authNotice.remove();
                    authNotice = null;
                }
                if (boardList) {
                    boardList.textContent = '';
                }
                if (loadBoardsButton) {
                    loadBoardsButton.disabled = true;
                    loadBoardsButton.hidden = true;
                    loadBoardsButton.style.display = 'none';
                }
                const isDark = getThemeType() === 'dark';
                const bg = isDark ? 'rgba(255, 200, 0, 0.1)' : 'rgba(180, 120, 255, 0.12)';
                const border = isDark ? '#ffa500' : '#a855f7';
                const text = isDark ? '#ffa500' : '#7c3aed';
                const msg = document.createElement('div');
                msg.style.cssText = `padding: 20px; text-align: center; margin-top: 20px; background: ${bg}; border: 1px solid ${border}; border-radius: 6px; color: ${text}; font-size: 14px; line-height: 1.6;`;
                msg.innerHTML = '<p style="margin: 0 0 8px 0; font-weight: 500; font-size: 16px;">Oooops, looks like you got logged out of Trello!</p><p style="margin: 8px 0; opacity: 0.9;">Use the little socket to get back in.</p>';
                if (boardList) {
                    boardList.parentElement?.insertBefore(msg, boardList);
                }
                authNotice = msg;
                break;
            }
            case 'boards': {
                console.dir(message.boards, { depth: null });
                updateBoardList(message.boards || []);
                break;
            }
            case 'lists': {
                handleListsMessage(message.boardId, message.lists || []);
                break;
            }
            case 'cards': {
                // TODO: render cards if needed
                break;
            }
            case 'error': {
                console.error('Error from extension:', message.message);
                break;
            }
        }
    });

    /**
     * @param {{ id: string, name: string, desc?: string, bgImage?: string }} board
     */
    function renderCard(board) {
        if (cardTemplate && boardList) {
            const item = document.createElement('li');
            item.className = 'board-item';
            item.dataset.boardId = board.id;

            const fragment = cardTemplate.content.cloneNode(true);
            const cardName = /** @type {HTMLElement | null} */ ((/** @type {DocumentFragment} */ (fragment)).querySelector('.card-name'));
            const cardDesc = /** @type {HTMLElement | null} */ ((/** @type {DocumentFragment} */ (fragment)).querySelector('.card-desc'));
            const cardRoot = /** @type {HTMLElement | null} */ ((/** @type {DocumentFragment} */ (fragment)).querySelector('.board-card'));

            if (cardName) {
                cardName.textContent = board.name || '';
            }
            if (cardDesc) {
                cardDesc.textContent = board.desc || '';
            }
            if (cardRoot) {
                cardRoot.addEventListener('click', () => onBoardClicked(board.id));
                cardRoot.classList.toggle('is-expanded', expandedBoards.has(board.id));
                // set background image if provided
                const preview = /** @type {HTMLElement | null} */ ((/** @type {DocumentFragment} */ (fragment)).querySelector('.board-preview'));
                if (preview && board.bgImage) {
                    // prefer HTTPS URLs; CSP allows https: per provider
                    preview.style.backgroundImage = `url(${board.bgImage})`;
                }
            }

            const listsContainer = document.createElement('div');
            listsContainer.className = 'board-lists';
            listsContainer.hidden = !expandedBoards.has(board.id);

            item.appendChild(fragment);
            item.appendChild(listsContainer);
            boardList.appendChild(item);

            if (expandedBoards.has(board.id)) {
                const cachedLists = listsByBoardId[board.id];
                if (Array.isArray(cachedLists)) {
                    renderLists(board.id, cachedLists);
                } else {
                    renderLoading(board.id);
                    requestBoardLists(board.id);
                }
            }
        } else {
            // fallback: simple li
            const li = document.createElement('li');
            li.textContent = board.name || board.id;
            if (boardList) {
                li.addEventListener('click', () => onBoardClicked(board.id));
                boardList.appendChild(li);
            }
        }
    }

    /**
     * @param {Array<{ id: string, name: string, desc?: string, bgImage?: string }>} boards
     */
    function updateBoardList(boards) {
        if (!boardList) {
            return;
        }

        if (authNotice) {
            authNotice.remove();
            authNotice = null;
        }

        // keep expansion state only for boards still present
        const boardIds = new Set((boards || []).map((b) => b.id));
        for (const expandedId of Array.from(expandedBoards)) {
            if (!boardIds.has(expandedId)) {
                expandedBoards.delete(expandedId);
            }
        }

        boardList.textContent = '';
        for (const board of boards) {
            console.dir(board, { depth: null });
            renderCard(board);
        }
        // Update the saved state
        saveState();
        // disable load button when boards exist, enable when cleared
        if (loadBoardsButton) {
            loadBoardsButton.disabled = Array.isArray(boards) && boards.length > 0;
            loadBoardsButton.hidden = Array.isArray(boards) && boards.length > 0;
            console.log('[webview] updateBoardList: set disabled=', loadBoardsButton.disabled, 'hidden=', loadBoardsButton.hidden, 'boards.length=', boards.length);
        }
    }

    function saveState() {
        vscode.setState({
            boards,
            listsByBoardId
        });
    }

    /**
     * @param {string} boardId
     * @returns {HTMLElement | null}
     */
    function getBoardItemById(boardId) {
        if (!boardList) {
            return null;
        }
        const children = boardList.querySelectorAll('.board-item');
        for (const child of children) {
            if (/** @type {HTMLElement} */ (child).dataset.boardId === boardId) {
                return /** @type {HTMLElement} */ (child);
            }
        }
        return null;
    }

    /**
     * @param {string} boardId
     * @returns {HTMLElement | null}
     */
    function getBoardListsContainer(boardId) {
        const item = getBoardItemById(boardId);
        if (!item) {
            return null;
        }
        return /** @type {HTMLElement | null} */ (item.querySelector('.board-lists'));
    }

    /**
     * @param {string} boardId
     * @param {boolean} expanded
     */
    function setBoardExpanded(boardId, expanded) {
        const item = getBoardItemById(boardId);
        if (!item) {
            return;
        }
        const cardRoot = /** @type {HTMLElement | null} */ (item.querySelector('.board-card'));
        const listsContainer = /** @type {HTMLElement | null} */ (item.querySelector('.board-lists'));
        if (cardRoot) {
            cardRoot.classList.toggle('is-expanded', expanded);
        }
        if (listsContainer) {
            if (expanded) {
                listsContainer.classList.remove('is-collapsing');
                listsContainer.hidden = false;
            } else {
                listsContainer.classList.add('is-collapsing');
                window.setTimeout(() => {
                    if (!expandedBoards.has(boardId)) {
                        listsContainer.hidden = true;
                        listsContainer.classList.remove('is-collapsing');
                    }
                }, COLLAPSE_ANIMATION_MS);
            }
        }
    }

    /**
     * @param {string} boardId
     */
    function requestBoardLists(boardId) {
        if (pendingBoards.has(boardId)) {
            return;
        }
        pendingBoards.add(boardId);
        vscode.postMessage({ command: 'selectBoard', boardId });
    }

    /**
     * @param {string} boardId
     */
    function renderLoading(boardId) {
        const listsContainer = getBoardListsContainer(boardId);
        if (!listsContainer) {
            return;
        }
        listsContainer.textContent = '';
        const loading = document.createElement('p');
        loading.className = 'board-lists-loading';
        loading.textContent = 'Loading lists...';
        listsContainer.appendChild(loading);
    }

    /**
     * @param {string} boardId
     * @param {Array<{ id: string, name: string, boardId: string, type: 'list' }>} lists
     */
    function renderLists(boardId, lists) {
        const listsContainer = getBoardListsContainer(boardId);
        if (!listsContainer) {
            return;
        }

        listsContainer.textContent = '';
        if (!Array.isArray(lists) || lists.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'board-lists-empty';
            empty.textContent = 'No lists found.';
            listsContainer.appendChild(empty);
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'lists-list';
        for (const listNode of lists) {
            const li = document.createElement('li');
            li.className = 'list-row';
            li.textContent = listNode.name;
            li.addEventListener('click', (event) => {
                event.stopPropagation();
                vscode.postMessage({ command: 'selectList', listId: listNode.id, boardId, listName: listNode.name });
            });
            ul.appendChild(li);
        }
        listsContainer.appendChild(ul);
    }

    /**
     * @param {string} boardId
     * @param {Array<{ id: string, name: string, boardId: string, type: 'list' }>} lists
     */
    function handleListsMessage(boardId, lists) {
        if (!boardId) {
            return;
        }
        pendingBoards.delete(boardId);
        listsByBoardId = {
            ...listsByBoardId,
            [boardId]: Array.isArray(lists) ? lists : []
        };
        saveState();
        if (expandedBoards.has(boardId)) {
            renderLists(boardId, listsByBoardId[boardId]);
        }
    }

    /** 
     * @param {string} boardId
     */
    function onBoardClicked(boardId) {
        if (expandedBoards.has(boardId)) {
            expandedBoards.delete(boardId);
            setBoardExpanded(boardId, false);
            saveState();
            return;
        }

        expandedBoards.add(boardId);
        setBoardExpanded(boardId, true);

        const cachedLists = listsByBoardId[boardId];
        if (Array.isArray(cachedLists)) {
            renderLists(boardId, cachedLists);
        } else {
            renderLoading(boardId);
            requestBoardLists(boardId);
        }
        saveState();
    }
}());

