(function() {
    const SITE = window.location.host.includes('claude') ? 
                 { container: 'div.claude-message', id: 'data-message-id' } : 
                 { container: 'article', id: 'data-turn-id' };

    let branchPairs = JSON.parse(localStorage.getItem('wb_pairs') || '[]');
    let pendingStartId = null;

    // --- 核心：属性标记与染色 ---
    const applyLogic = () => {
        document.querySelectorAll(`${SITE.container}[data-wb-role]`).forEach(el => el.removeAttribute('data-wb-role'));
        
        branchPairs.forEach(pair => {
            const start = document.querySelector(`[${SITE.id}="${pair.startId}"]`);
            const end = document.querySelector(`[${SITE.id}="${pair.endId}"]`);
            if (!start || !end) return;

            start.setAttribute('data-wb-role', 'start');
            end.setAttribute('data-wb-role', 'end');
            
            let curr = start.nextElementSibling;
            while (curr && curr !== end) {
                if (curr.matches(SITE.container)) curr.setAttribute('data-wb-role', 'mid');
                curr = curr.nextElementSibling;
            }
        });
        updateMobileNav();
    };

    // --- 功能：延时 Hover (防止视觉骚扰) ---
    const setupHoverLogic = (el) => {
        el.onmouseenter = () => {
            el.hoverTimer = setTimeout(() => el.classList.add('wb-expanded'), 350);
        };
        el.onmouseleave = () => {
            clearTimeout(el.hoverTimer);
            el.classList.remove('wb-expanded');
        };
    };

    // --- 功能：代码块控制 ---
    const injectCodeTools = (el) => {
        el.querySelectorAll('pre').forEach(pre => {
            if (pre.dataset.wbInjected) return;
            pre.onclick = () => pre.classList.toggle('wb-code-minimized');
            pre.dataset.wbInjected = "1";
        });
    };

    // --- 功能：UI 注入 ---
    const injectUI = () => {
        document.querySelectorAll(`${SITE.container}:not([data-wb-injected])`).forEach(el => {
            const turnId = el.getAttribute(SITE.id);
            // 注入 S/E/R 按钮逻辑 (此处略，参考之前版本)
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
})();