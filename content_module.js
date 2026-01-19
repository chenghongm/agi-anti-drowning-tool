import { ChatGPTAdapter } from './adapters/chatgpt.js';
import { ClaudeAdapter } from './adapters/claude.js';
import { detectAndMark } from './core/detection.js';

// Lightweight logger that mirrors to page console and posts messages to the extension
function serializeArg(a) {
    try {
        if (a instanceof Element) return `<${a.tagName.toLowerCase()} class="${a.className}" id="${a.id}">`;
        if (a instanceof Node) return a.nodeName;
        return typeof a === 'object' ? JSON.stringify(a) : String(a);
    } catch (e) { return String(a); }
}
function wbLog(...args) {
    try {
        const payload = args.map(serializeArg);
        window.postMessage({ source: 'wb-extension', type: 'log', args: payload }, '*');
    } catch (e) { /* ignore */ }
    console.log(...args);
}

// Initialize adapter based on host; fallback to ChatGPTAdapter
const currentAdapter = (function pickAdapter() {
    try {
        if (window.location.host.includes('claude')) {
            return new ClaudeAdapter();
        }
    } catch (e) { /* ignore */ }
    return new ChatGPTAdapter();
})();

let branchPairs = JSON.parse(localStorage.getItem('wb_pairs') || '[]');
let pendingStartId = null;

// Persistence helpers (page context): use localStorage so module can run in page
function loadPairs() {
    try {
        branchPairs = JSON.parse(localStorage.getItem('wb_pairs') || '[]') || [];
    } catch (e) {
        wbLog('WB: loadPairs JSON parse failed', e);
        branchPairs = [];
    }
}

function savePairs() {
    try {
        localStorage.setItem('wb_pairs', JSON.stringify(branchPairs || []));
        wbLog('WB: savePairs ->', branchPairs);
    } catch (e) {
        wbLog('WB: savePairs failed', e);
    }
}
wbLog('WB: currentAdapter initialized ->', currentAdapter.constructor.name, currentAdapter.selectors);

// --- 核心：属性标记与染色（使用 adapter 提供的消息集合和 id） ---
const applyLogic = () => {
        // Reload branchPairs in case localStorage was updated at runtime
        try {
            branchPairs = JSON.parse(localStorage.getItem('wb_pairs') || '[]');
        } catch (e) {
            wbLog('WB: failed to parse wb_pairs from localStorage', e);
            branchPairs = [];
        }

        const messages = currentAdapter.findMessages();
        wbLog('WB: applyLogic found messages:', messages ? messages.length : 0);
        if (!messages || messages.length === 0) {
                wbLog('WB: no messages found by adapter; selectors:', currentAdapter.selectors);
                return;
        }
        wbLog('WB: branchPairs (loaded):', branchPairs);

        // Auto-demo: if no branchPairs exist, create a temporary pair spanning last few messages
        // let usedPairs = branchPairs;
        // if ((!usedPairs || usedPairs.length === 0) && messages.length >= 6) {
        //     const fromIdx = Math.max(0, messages.length - 6);
        //     const toIdx = messages.length - 1;
        //     const startId = currentAdapter.getMessageId(messages[fromIdx]);
        //     const endId = currentAdapter.getMessageId(messages[toIdx]);
        //     if (startId && endId) {
        //         usedPairs = [{ startId, endId }];
        //         wbLog('WB: auto-demo pair created', usedPairs);
        //     }
        // }

        const res = detectAndMark(messages, branchPairs, currentAdapter);
        wbLog('WB: detectAndMark result:', res);
        updateMobileNav();
};

// --- 功能：延时 Hover (防止视觉骚扰) ---
const setupHoverLogic = (el) => {
    el.onmouseenter = () => { el.hoverTimer = setTimeout(() => el.classList.add('wb-expanded'), 350); };
    el.onmouseleave = () => { clearTimeout(el.hoverTimer); el.classList.remove('wb-expanded'); };
};

// --- 功能：代码块控制 ---
const injectCodeTools = (el) => {
    el.querySelectorAll('pre').forEach(pre => {
        if (pre.dataset.wbInjected) return;
        pre.onclick = () => pre.classList.toggle('wb-code-minimized');
        pre.dataset.wbInjected = '1';
    });
};

// --- 功能：UI 注入（通过 adapter.findMessages 替代硬编码选择器） ---
const injectUI = () => {
    const messages = currentAdapter.findMessages();
    wbLog('WB: injectUI found messages:', messages ? messages.length : 0);
    // build id -> index map for ordering checks
    const idIndex = new Map();
    messages.forEach((m, i) => { const id = currentAdapter.getMessageId(m); if (id) idIndex.set(id, i); });

    messages.forEach(el => {
        if (el.getAttribute('data-wb-injected')) return;
        const turnId = currentAdapter.getMessageId(el);
        setupHoverLogic(el);
        injectCodeTools(el);

        // create S/E/R button group (no inline HTML)
        const btnArea = document.createElement('div');
        btnArea.className = 'wb-branch-group';
        btnArea.style.display = 'inline-flex';
        btnArea.style.gap = '4px';

        const makeBtn = (label, action) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wb-branch-btn';
            b.textContent = label;
            b.addEventListener('click', (ev) => {
                ev.stopPropagation();
                handleBranchAction(action, turnId, idIndex, messages);
            });
            return b;
        };

        btnArea.appendChild(makeBtn('S', 'start'));
        btnArea.appendChild(makeBtn('E', 'end'));
        btnArea.appendChild(makeBtn('R', 'remove'));

        // attach to element: prefer adapter actionArea selector if available
        let attachPoint = null;
        try {
            const sel = currentAdapter.selectors && currentAdapter.selectors.actionArea;
            if (sel) attachPoint = el.querySelector(sel);
        } catch (e) { /* ignore */ }
        if (!attachPoint) {
            // fallback: prepend to element
            el.prepend(btnArea);
        } else {
            attachPoint.prepend(btnArea);
        }

        el.setAttribute('data-wb-injected', '1');
    });

    applyLogic();
};

// Handler for S/E/R actions
function handleBranchAction(action, turnId, idIndex, messages) {
    loadPairs();
    wbLog('WB: handleBranchAction', action, turnId);
    const idx = idIndex.get(turnId);
    if (action === 'start') {
        // if target already in any pair, reject
        const inPair = branchPairs.some(p => p.startId === turnId || p.endId === turnId);
        if (inPair) return wbLog('WB: start rejected; already in pair', turnId);
        pendingStartId = turnId;
        // mark visually
        const el = messages[idx]; if (el) el.setAttribute('data-wb-role', 'pending');
        wbLog('WB: pendingStartId set', pendingStartId);
    } else if (action === 'end') {
        if (!pendingStartId) return wbLog('WB: end clicked but no pending start');
        const startIdx = idIndex.get(pendingStartId);
        if (startIdx === undefined || idx === undefined) return wbLog('WB: start or end id missing in DOM');
        if (idx <= startIdx) return wbLog('WB: end must be after start');
        branchPairs.push({ startId: pendingStartId, endId: turnId });
        pendingStartId = null;
        savePairs();
        applyLogic();
    } else if (action === 'remove') {
        // find pair that contains this turnId (by id equality or range)
        const pairIdx = branchPairs.findIndex(p => p.startId === turnId || p.endId === turnId || (
            idIndex.get(p.startId) !== undefined && idIndex.get(p.endId) !== undefined &&
            idIndex.get(p.startId) <= idx && idx <= idIndex.get(p.endId)
        ));
        if (pairIdx !== -1) {
            branchPairs.splice(pairIdx, 1);
            savePairs();
            applyLogic();
        } else {
            wbLog('WB: remove clicked but no matching pair found for', turnId);
        }
    }
}

// --- 手机定位组件 ---
const updateMobileNav = () => {
    let nav = document.getElementById('wb-nav-panel') || document.createElement('div');
    nav.id = 'wb-nav-panel'; document.body.appendChild(nav);
    // Clear nav and add a scroll-to-bottom control (use JS event listeners to satisfy CSP)
    nav.innerHTML = '';
    const topDot = document.createElement('div');
    topDot.className = 'wb-nav-dot';
    topDot.innerText = '↓';
    topDot.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    nav.appendChild(topDot);

    document.querySelectorAll('[data-wb-role="start"]').forEach((el, i) => {
        const dot = document.createElement('div');
        dot.className = 'wb-nav-dot'; dot.innerText = i + 1;
        dot.addEventListener('click', () => el.scrollIntoView({ behavior: 'smooth' }));
        nav.appendChild(dot);
    });
};

const observer = new MutationObserver(() => {
    clearTimeout(window.wbTimer);
    window.wbTimer = setTimeout(injectUI, 500);
});
observer.observe(document.body, { childList: true, subtree: true });
injectUI();
