// adapters/claude.js
import { BaseAdapter } from './base.js';

export class ClaudeAdapter extends BaseAdapter {
  getSelectors() {
    return {
      threadContainer: 'main',
      messageEntry: '[data-testid="user-message"], .font-claude-response',
      idAttribute: 'data-wb-turn-id',
      assistantMessage: [
        '.font-claude-response'
      ],
      codeBlock: 'pre',
      actionArea: null
    };
  }

  findMessages() {
    return Array.from(
      document.querySelectorAll('[data-testid="user-message"], .font-claude-response')
    ).filter(node => {
      if (!(node instanceof HTMLElement)) return false;
      // 排除流式输出中的节点
      if (node.closest('[data-is-streaming="true"]')) return false;
      return true;
    });
  }

  getMessageId(el) {
    if (!(el instanceof HTMLElement)) return null;
    let id = el.getAttribute('data-wb-turn-id');
    if (!id) {
      const all = Array.from(
        document.querySelectorAll('[data-testid="user-message"], .font-claude-response')
      ).filter(n => !n.closest('[data-is-streaming="true"]'));
      const idx = all.indexOf(el);
      if (idx === -1) return null;
      id = `claude-turn-${idx}`;
      el.setAttribute('data-wb-turn-id', id);
    }
    return id;
  }

  findActionArea(messageEl) {
    return messageEl.closest('[data-test-render-count]') || null;
  }
}
