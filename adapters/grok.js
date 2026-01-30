// adapters/grok.js
import { BaseAdapter } from './base.js';

export class GrokAdapter extends BaseAdapter {
  getSelectors() {
    return {
      // x.ai (Grok) messages commonly render as divs with ids like "response-<uuid>"
      threadContainer: 'main',
      messageEntry: 'main div[id^="response-"]',
      idAttribute: 'id',
      roleAttribute: 'data-testimonial', // unused by current UI logic
      codeBlock: 'pre',
      // Prefer injecting at the message container (fallback handled in content_module.js)
    };
  }

  // 增强探测：优先使用 response-*，再降级到更宽松的匹配
  findMessages() {
    const primary = this.selectors && this.selectors.messageEntry;
    if (primary) {
      const nodes = document.querySelectorAll(primary);
      if (nodes && nodes.length) return Array.from(nodes);
    }

    const fallback = document.querySelectorAll('main [id^="response-"]');
    return Array.from(fallback || []);
  }
}
