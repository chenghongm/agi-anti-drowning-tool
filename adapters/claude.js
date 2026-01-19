// adapters/claude.js
import { BaseAdapter } from './base.js';

export class ClaudeAdapter extends BaseAdapter {
  getSelectors() {
    return {
      threadContainer: 'main',
      messageEntry: 'div.claude-message',
      idAttribute: 'data-message-id',
      roleAttribute: 'data-wb-role',
      codeBlock: 'pre',
      actionArea: '.claude-actions'
    };
  }

  // Claude layout is simple: messages are individual divs with a data-message-id
  findMessages() {
    const sel = this.selectors && this.selectors.messageEntry;
    if (!sel) return [];
    return Array.from(document.querySelectorAll(sel));
  }
}
