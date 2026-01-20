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

    const res = detectAndMark(messages, branchPairs, currentAdapter);
    wbLog('WB: detectAndMark result:', res);
    // update button states (enable/disable S/E based on roles and pending start)
    updateButtonStates();
    updateMobileNav();
};

// --- 功能：延时 Hover (防止视觉骚扰) ---
// const setupHoverLogic = (el) => {
//     el.onmouseenter = () => { el.hoverTimer = setTimeout(() => el.classList.add('wb-expanded'), 350); };
//     el.onmouseleave = () => { clearTimeout(el.hoverTimer); el.classList.remove('wb-expanded'); };
// };
function setupHoverLogic(el) {
    let hoverTimer;
    el.addEventListener('mouseenter', () => {
        // 只有标记了 mid 或 end 的才需要 hover 展开
        if (el.hasAttribute('data-wb-role') && el.getAttribute('data-wb-role') !== 'start') {
            hoverTimer = setTimeout(() => {
                el.classList.add('wb-expanded');
            }, 550);
        }
    });
    el.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        el.classList.remove('wb-expanded');
    });
}

// Centralized updater for S/E/R button states
function updateButtonStates() {
    try {
        document.querySelectorAll('.wb-branch-btn').forEach(btn => {
            const msgId = btn.dataset.msgId;
            const action = btn.dataset.action;
            const msgEl = msgId ? document.querySelector(`[data-turn-id="${msgId}"]`) : null;
            const role = msgEl ? msgEl.getAttribute('data-wb-role') : null;

            let disabled = false;

            // Always honor detected roles
            if (role === 'start' && (action === 'start' || action === 'end')) disabled = true;
            if (role === 'end' && action === 'end') disabled = true;
            if (role === 'mid' && (action === 'start' || action === 'end')) disabled = true;

            // When a start is pending, disable both Start and End on the same message
            if (pendingStartId && msgId === pendingStartId && (action === 'start' || action === 'end')) {
                disabled = true;
            }

            btn.disabled = !!disabled;
            btn.style.color = disabled ? '#ccc' : '';
        });
    } catch (e) {
        wbLog('WB: updateButtonStates error', e);
    }
}



// 注入全局开关
function injectGlobalToggle() {
    if (document.getElementById('wb-global-toggle')) return;
    const btn = document.createElement('div');
    btn.id = 'wb-global-toggle';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-pressed', 'false');

    // Create SVG code icon (</>)
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M8.7 17.3L3.4 12l5.3-5.3L10 8.4 6.6 12 10 15.6l-1.3 1.7zM15.3 6.7L20.6 12l-5.3 5.3L14 15.6 17.4 12 14 8.4l1.3-1.7z');
    svg.appendChild(path);
    btn.appendChild(svg);

    // Toggle behavior: only change background color, keep icon unchanged
    const updateGlobalToggleTitle = (isHidden) => {
        btn.title = isHidden ? 'Show Code' : 'Hide Code';
        btn.setAttribute('aria-label', btn.title);
    };

    updateGlobalToggleTitle(document.body.classList.contains('wb-global-code-hide'));
    btn.addEventListener('click', () => {
        const isHidden = document.body.classList.toggle('wb-global-code-hide');
        btn.style.background = isHidden ? '#b4dbca' : '#10a37f';
        btn.setAttribute('aria-pressed', String(isHidden));
        updateGlobalToggleTitle(isHidden);
    });

    // Size and style to match nav dots (we'll align position above nav)
    const SIZE = 40;
    Object.assign(btn.style, {
        position: 'fixed',
        right: '6px',
        zIndex: 2147483647,
        width: SIZE + 'px',
        height: SIZE + 'px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '10px',
        background: '#10a37f',
        color: '#ffffff',
        boxShadow: '0 6px 18px rgba(16,163,127,0.16)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'background .18s ease, transform .12s ease'
    });

    btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-2px)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'translateY(0)');

    document.body.appendChild(btn);

    // Positioning helper: place right above nav panel if present
    function positionGlobalToggle() {
        const nav = document.getElementById('wb-nav-panel');
        if (!nav) {
            btn.style.bottom = '18px';
            btn.style.top = '';
            return;
        }
        const navRect = nav.getBoundingClientRect();
        // place button just above nav (nav is appended to body bottom by default)
        btn.style.bottom = (window.innerHeight - navRect.top + 12) + 'px';
        btn.style.top = '';
    }

    // Reposition on layout changes
    window.addEventListener('resize', positionGlobalToggle);
    const repositionObserver = new MutationObserver(() => positionGlobalToggle());
    repositionObserver.observe(document.body, { childList: true, subtree: true });
    // initial position
    positionGlobalToggle();
}



// --- 功能：UI 注入（通过 adapter.findMessages 替代硬编码选择器） ---
const injectUI = () => {
    const messages = currentAdapter.findMessages();
    wbLog('WB: injectUI found messages:', messages ? messages.length : 0);
    // build id -> index map for ordering checks
    const idIndex = new Map();
    messages.forEach((m, i) => { const id = currentAdapter.getMessageId(m); if (id) idIndex.set(id, i); });

    messages.forEach(el => {
        if (el.getAttribute('data-wb-injected')) return;

        // --- 1.新增过滤逻辑 ---
        // -1. 检查当前节点是否是 pre 或被 pre 包裹
        if (el.matches?.('pre,code') || el.closest('pre')) return;
        
        // -2. 检查是否是 ChatGPT 的代码块容器 (通常带有特殊的类名)
        if (el.querySelector('.code-block__container') || el.classList.contains('code-block__container')) return;

        // -3. 检查是否已经注入过
        if (el.getAttribute('data-wb-injected')) return;

        const turnId = currentAdapter.getMessageId(el);
        if (!turnId) return; // 如果没有 ID，说明不是真正的消息节点
        // 2. 处理代码块折叠逻辑 (新增)
        // handleCodeToggles(el);
        setupHoverLogic(el);
        // injectCodeTools(el);

        // create S/E/R button group (no inline HTML)
        const btnArea = document.createElement('div');
        btnArea.className = 'wb-branch-group';
        btnArea.style.display = 'inline-flex';
        btnArea.style.gap = '4px';

        const makeBtn = (label, action) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wb-branch-btn';
            b.dataset.action = action; // 这一步至关重要，用于 CSS 匹配
            b.dataset.msgId = turnId;
            b.textContent = label;
            b.addEventListener('click', (ev) => {
                ev.stopPropagation();
                handleBranchAction(action, turnId, idIndex, messages);
            });
            return b;
        };


        // attach to element: prefer adapter actionArea selector if available
        let attachPoint = null;
        try {
            const sel = currentAdapter.selectors && currentAdapter.selectors.actionArea;
            if (sel) attachPoint = el.querySelector(sel);
        } catch (e) { /* ignore */ }

        // Never inject controls into code blocks; if the adapter's actionArea resolves inside <pre>/<code>,
        // fall back to injecting on the message container itself.
        if (attachPoint && (attachPoint.matches?.('pre,code') || attachPoint.closest?.('pre,code'))) {
            attachPoint = null;
        }
        if (!attachPoint) {
            // fallback: prepend to element
            el.prepend(btnArea);
        } else {
            attachPoint.prepend(btnArea);
        }

        // 在 injectUI 的 el.setAttribute('data-wb-injected', '1') 之前添加
        el.style.position = 'relative';

        const role = el.getAttribute('data-wb-role');

        const sBtn = makeBtn('S', 'start');
        const eBtn = makeBtn('E', 'end');
        const rBtn = makeBtn('R', 'remove');

        // 注入禁用逻辑
        if (role === 'start') {
            sBtn.disabled = true;
            sBtn.style.color = '#ccc';
            eBtn.disabled = true;
            eBtn.style.color = '#ccc';
        } else if (role === 'end') {
            eBtn.disabled = true;
            eBtn.style.color = '#ccc';
        } else if (role === 'mid') {
            sBtn.disabled = true;
            eBtn.disabled = true;
        }

        // button states will be set by updateButtonStates()

        btnArea.appendChild(sBtn);
        btnArea.appendChild(eBtn);
        btnArea.appendChild(rBtn);

        el.setAttribute('data-wb-injected', '1');
    });

    applyLogic();
};

// Handler for S/E/R actions
/**
 * 核心交互处理器
 * @param {string} action - 'start' | 'end' | 'remove'
 * @param {string} turnId - 消息节点的唯一 ID
 */
function handleBranchAction(action, turnId) {
    wbLog(`WB: Action [${action}] triggered on [${turnId}]`);

    if (action === 'start') {
        // 1. 设置待定起点
        pendingStartId = turnId;

        // 2. 视觉反馈：清除所有旧的 pending 标记，给当前节点加上虚线框
        document.querySelectorAll('[data-wb-pending]').forEach(el => {
            el.removeAttribute('data-wb-pending');
        });

        const currentMsg = document.querySelector(`[data-turn-id="${turnId}"]`);
        if (currentMsg) {
            currentMsg.setAttribute('data-wb-pending', 'true');
        }

        wbLog('WB: Pending start set. Waiting for End node.');
        // 刷新 UI 使 S 按钮进入 disabled 状态
        applyLogic();

    } else if (action === 'end') {
        // 1. 只有存在 pendingStartId 时才允许建立 Pair
        if (pendingStartId) {
            if (pendingStartId === turnId) {
                wbLog('WB: Cannot set same node as start and end.');
                return;
            }

            // 2. 存入正式分支对
            branchPairs.push({
                startId: pendingStartId,
                endId: turnId
            });

            // 3. 清理待定状态
            pendingStartId = null;
            document.querySelectorAll('[data-wb-pending]').forEach(el => {
                el.removeAttribute('data-wb-pending');
            });

            savePairs();
            applyLogic();
            wbLog('WB: Branch pair established and saved.');
        } else {
            alert('请先选择一个起点 (S)');
        }

    } else if (action === 'remove') {
        // 1. 查找包含当前点击节点的 Pair
        const messages = currentAdapter.findMessages();
        const idIndex = new Map();
        messages.forEach((m, i) => {
            const id = currentAdapter.getMessageId(m);
            if (id) idIndex.set(id, i);
        });

        const idx = idIndex.get(turnId);
        if (idx === undefined) return;

        // 2. 过滤掉包含该节点的 Pair
        const initialCount = branchPairs.length;
        branchPairs = branchPairs.filter(p => {
            const sIdx = idIndex.get(p.startId);
            const eIdx = idIndex.get(p.endId);
            if (sIdx === undefined || eIdx === undefined) return true;

            // 判断 turnId 是否在 [start, end] 区间内
            const min = Math.min(sIdx, eIdx);
            const max = Math.max(sIdx, eIdx);
            return !(idx >= min && idx <= max);
        });

        if (branchPairs.length < initialCount) {
            // 如果是在 pending 状态下点 remove，也要清理 pending
            if (pendingStartId === turnId) pendingStartId = null;

            savePairs();
            applyLogic();
            wbLog('WB: Branch removed.');
        } else {
            // 特殊情况：如果只是清除尚未闭合的 Pending 状态
            if (pendingStartId === turnId) {
                pendingStartId = null;
                document.querySelectorAll('[data-wb-pending]').forEach(el => {
                    el.removeAttribute('data-wb-pending');
                });
                applyLogic();
                wbLog('WB: Pending status cleared.');
            }
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
injectGlobalToggle();
