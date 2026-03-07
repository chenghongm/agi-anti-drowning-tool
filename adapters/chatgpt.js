// adapters/chatgpt.js
import { BaseAdapter } from './base.js';

export class ChatGPTAdapter extends BaseAdapter {
  // getSelectors() {
  //   return {
  //     threadContainer: 'main div.flex-1.overflow-hidden div.flex.flex-col', // 基础路径
  //     messageEntry: 'article',
  //     idAttribute: 'data-turn-id',
  //     roleAttribute: 'data-testimonial', // 示例：捕捉特定属性
  //     codeBlock: 'pre',
  //     actionArea: '.flex.items-center.justify-between' // 按钮注入点
  //   };
  // }


  // 增强探测：如果 article 失效，寻找具备特定数据特征的 div
  // findMessages() {
  //   let nodes = document.querySelectorAll(this.selectors.messageEntry);
  //   if (nodes.length === 0) {
  //     // 降级方案：寻找拥有 'group' 类的 div，这是大模型对话常见的布局特征
  //     nodes = document.querySelectorAll('main div[group="conversations"]');
  //   }
  //   return Array.from(nodes);
  // }
  getSelectors() {
  return {
    // Chat thread root: keep it broad enough to survive layout changes
    threadContainer: 'main',

    // Only target top-level message articles first
    messageEntry: 'main article[data-turn-id], main article',

    // Stable identifiers
    idAttribute: 'data-turn-id',

    // Optional role-like attribute if present in your DOM
    roleAttribute: 'data-message-author-role',

    // Code blocks
    codeBlock: 'pre',

    // Candidate action/toolbars inside one message article
    actionAreaCandidates: [
      '[data-testid="message-actions"]',
      '[data-message-actions]',
      '.flex.items-center.justify-between',
      '.flex.items-center.gap-2',
      '.flex.justify-between'
    ]
  };
}

  findMessages() {
  const { messageEntry, idAttribute, roleAttribute } = this.selectors;

  // 1. Primary path: top-level articles
  let nodes = Array.from(document.querySelectorAll(messageEntry));

  // Keep only likely top-level conversation messages
  nodes = nodes.filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    if (!node.closest('main')) return false;

    // Prefer articles with turn id
    if (node.hasAttribute(idAttribute)) return true;

    // Or with message role metadata
    if (roleAttribute && node.hasAttribute(roleAttribute)) return true;

    // Or article that looks like a real conversation block
    return !node.closest('article article');
  });

  if (nodes.length > 0) {
    return nodes;
  }

  // 2. Fallback: find conversation-like containers, but avoid nested scheduler/tool cards
  nodes = Array.from(
    document.querySelectorAll(
      'main [data-turn-id], main [data-message-author-role], main [data-testid*="conversation"], main [data-testid*="message"]'
    )
  ).filter((node) => {
    if (!(node instanceof HTMLElement)) return false;

    // Avoid nested fake hits
    const nestedArticle = node.closest('article');
    if (nestedArticle && node !== nestedArticle && nestedArticle.hasAttribute(idAttribute)) {
      return false;
    }

    // Ignore obvious non-message cards if they exist
    if (
      node.closest('[data-testid*="scheduler"]') ||
      node.closest('[data-testid*="task"]') ||
      node.closest('[data-testid*="tool"]')
    ) {
      return false;
    }

    return true;
  });

  return nodes;
}


}