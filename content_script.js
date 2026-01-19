// Bootstrap loader: inject the actual module into the page as a module script.
(function injectModule(){
  try {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = chrome.runtime.getURL('content_module.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {
    console.error('WB: failed to inject module:', e);
  }
})();

// Listen for logs posted from the page module and persist them via chrome.storage
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== 'wb-extension') return;

  if (msg.type === 'error') {
    try {
      if (!chrome || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get({ wb_logs: [] }, (res) => {
        const logs = res.wb_logs || [];
        logs.push({ ts: Date.now(), args: msg.args });
        // keep only last 500 entries
        const capped = logs.slice(-500);
        chrome.storage.local.set({ wb_logs: capped });
      });
    } catch (e) {
      // Persisting logs failed — avoid throwing further
      console.error('WB: failed to persist error log', e);
    }
  } else if (msg.type === 'download_logs') {
    try {
      chrome.storage.local.get({ wb_logs: [] }, (res) => {
        const data = JSON.stringify(res.wb_logs || [], null, 2);
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wb_logs.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      console.error('WB: failed to download logs', e);
    }
  }
});