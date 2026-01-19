// adapters/chatgpt.js
import { BaseAdapter } from './base.js';

export class ChatGPTAdapter extends BaseAdapter {
  getSelectors() {
    return {
      threadContainer: 'main div.flex-1.overflow-hidden div.flex.flex-col', // 基础路径
      messageEntry: 'article',
      idAttribute: 'data-turn-id',
      roleAttribute: 'data-testimonial', // 示例：捕捉特定属性
      codeBlock: 'pre',
      actionArea: '.flex.items-center.justify-between' // 按钮注入点
    };
  }

  // 增强探测：如果 article 失效，寻找具备特定数据特征的 div
  findMessages() {
    let nodes = document.querySelectorAll(this.selectors.messageEntry);
    if (nodes.length === 0) {
      // 降级方案：寻找拥有 'group' 类的 div，这是大模型对话常见的布局特征
      nodes = document.querySelectorAll('main div[group="conversations"]');
    }
    return Array.from(nodes);
  }
}