import { ChatGPTAdapter } from './adapters/chatapt.js';
import { ClaudeAdapter } from './adapters/claude.js';

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

// --- 核心：属性标记与染色（使用 adapter 提供的消息集合和 id） ---
const applyLogic = () => {
    const messages = currentAdapter.findMessages();
    if (!messages || messages.length === 0) return;

    // 清理旧标记
    messages.forEach(el => el.removeAttribute('data-wb-role'));

    // 建立 id -> index 映射，便于区间计算
    const idIndex = new Map();
    messages.forEach((m, i) => { const id = currentAdapter.getMessageId(m); if (id) idIndex.set(id, i); });

    branchPairs.forEach(pair => {
        const startIdx = idIndex.get(pair.startId);
        const endIdx = idIndex.get(pair.endId);
        if (startIdx === undefined || endIdx === undefined) return;

        const start = messages[startIdx];
        const end = messages[endIdx];
        start.setAttribute('data-wb-role', 'start');
        end.setAttribute('data-wb-role', 'end');

        const from = Math.min(startIdx, endIdx), to = Math.max(startIdx, endIdx);
        for (let i = from + 1; i < to; i++) {
            messages[i].setAttribute('data-wb-role', 'mid');
        }
    });

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
    messages.forEach(el => {
        if (el.getAttribute('data-wb-injected')) return;
        const turnId = currentAdapter.getMessageId(el);
        setupHoverLogic(el);
        injectCodeTools(el);
        el.setAttribute('data-wb-injected', '1');
    });
    applyLogic();
};

// --- 手机定位组件 ---
const updateMobileNav = () => {
    let nav = document.getElementById('wb-nav-panel') || document.createElement('div');
    nav.id = 'wb-nav-panel'; document.body.appendChild(nav);
    nav.innerHTML = '<div class="wb-nav-dot" onclick="window.scrollTo({top:document.body.scrollHeight,behavior:\'smooth\'})">↓</div>';

    document.querySelectorAll('[data-wb-role="start"]').forEach((el, i) => {
        const dot = document.createElement('div');
        dot.className = 'wb-nav-dot'; dot.innerText = i + 1;
        dot.onclick = () => el.scrollIntoView({ behavior: 'smooth' });
        nav.appendChild(dot);
    });
};

const observer = new MutationObserver(() => {
    clearTimeout(window.wbTimer);
    window.wbTimer = setTimeout(injectUI, 500);
});
observer.observe(document.body, { childList: true, subtree: true });
injectUI();