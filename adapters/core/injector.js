// core/injector.js
import { debounce } from '../utils/helpers';

export const startInjection = (adapter) => {
  const observer = new MutationObserver(debounce(() => {
    const container = adapter.getThreadContainer();
    if (!container) return;

    const messages = adapter.findMessages();
    messages.forEach(msg => {
      if (!msg.hasAttribute('data-ad-processed')) {
        injectControls(msg, adapter);
        msg.setAttribute('data-ad-processed', 'true');
      }
    });
  }, 500));

  observer.observe(document.body, { childList: true, subtree: true });
};