// adapters/base.js
export class BaseAdapter {
  constructor() {
    this.selectors = this.getSelectors();
  }

  // 子类必须实现，返回当前平台的 CSS 选择器集合
  getSelectors() { throw new Error("Method not implemented"); }

  // 核心探测器：寻找消息流的根容器
  getThreadContainer() {
    const s = this.selectors;
    return document.querySelector(s.threadContainer);
  }

  // 判断是否为 Assistant 消息，用于注入 Toggle 按钮
  isAssistantRole(node) {
    return node.getAttribute(this.selectors.roleAttribute) === 'assistant';
  }

  // 返回消息节点的唯一 id（由子类通过 selectors.idAttribute 指定）
  getMessageId(node) {
    return node && this.selectors && this.selectors.idAttribute ? node.getAttribute(this.selectors.idAttribute) : null;
  }

  // 默认实现：根据 messageEntry 选择器查找消息集合，子类可以覆盖以实现更复杂的降级策略
  findMessages() {
    const sel = this.selectors && this.selectors.messageEntry;
    if (!sel) return [];
    return Array.from(document.querySelectorAll(sel));
  }
}