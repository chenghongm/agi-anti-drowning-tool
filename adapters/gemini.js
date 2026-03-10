// adapters/gemini.js
import { BaseAdapter } from './base.js';

export class GeminiAdapter extends BaseAdapter {
    getSelectors() {
        return {
            threadContainer: 'main',
            messageEntry: 'main .conversation-container.message-actions-hover-boundary',
            idAttribute: 'id', 
            userQuery: 'user-query',
            modelResponse: 'model-response',
            codeBlock: 'pre',
            actionArea: 'message-actions .actions-container-v2'
        };
    }

    findMessages() {
        const { messageEntry, idAttribute, userQuery, modelResponse } = this.selectors;

        let pairs = Array.from(document.querySelectorAll(messageEntry)).filter(node => {
            if (!(node instanceof HTMLElement)) return false;
            if (!node.closest('main')) return false;
            const hasUser = !!node.querySelector(userQuery);
            const hasModel = !!node.querySelector(modelResponse);
            if (hasUser && hasModel) return true;
            if (node.hasAttribute(idAttribute) && (hasUser || hasModel)) return true;
            return false;
        });

        if (pairs.length === 0) {
            pairs = Array.from(document.querySelectorAll('main .conversation-container')).filter(node => {
                if (!(node instanceof HTMLElement)) return false;
                if (!node.querySelector('user-query') || !node.querySelector('model-response')) return false;
                if (node.parentElement?.closest?.('.conversation-container')) return false;
                return true;
            });
        }

        // Flatten: 每个 pair 拆成 [userHost, modelHost]，按对话顺序展开
        const flat = [];
        for (const pair of pairs) {
            const pairId = pair.getAttribute(idAttribute) || '';

            const userEl = pair.querySelector(userQuery);
            const modelEl = pair.querySelector(modelResponse);

            const userHost = userEl?.firstElementChild instanceof HTMLElement
                ? userEl.firstElementChild : userEl;
            const modelHost = modelEl?.firstElementChild instanceof HTMLElement
                ? modelEl.firstElementChild : modelEl;

            if (userHost instanceof HTMLElement) {
                // 用 pairId mark 用户和模型消息，方便 detect 模块关联同一对话的两条消息
                userHost.setAttribute('data-wb-turn-id', `${pairId}-user`);
                userHost.setAttribute('data-wb-gemini-pair', pairId);
                flat.push(userHost);
            }
            if (modelHost instanceof HTMLElement) {
                modelHost.setAttribute('data-wb-turn-id', `${pairId}-model`);
                modelHost.setAttribute('data-wb-gemini-pair', pairId);
                flat.push(modelHost);
            }
        }

        return flat;
    }

    getMessageId(el) {
        if (!(el instanceof HTMLElement)) return null;
        // 优先读 findMessages 预先写入的 turn id
        return el.getAttribute('data-wb-turn-id') || el.getAttribute('id') || null;
    }

    findActionArea(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return null;
        // modelHost 的 actionArea 往上找最近的 pair 容器再查
        const pair = messageEl.closest('.conversation-container');
        return (
            pair?.querySelector('message-actions .actions-container-v2') ||
            pair?.querySelector('message-actions') ||
            null
        );
    }
}
