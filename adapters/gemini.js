// adapters/gemini.js
import { BaseAdapter } from './base.js';

export class GeminiAdapter extends BaseAdapter {
    getSelectors() {
        return {
            // Keep the root broad; Gemini layout can shift, but content still lives under main
            threadContainer: 'main',

            // True user-assistant pair root
            messageEntry: 'main .conversation-container.message-actions-hover-boundary',

            // Gemini does not have a stable turn id here, so use the container id
            idAttribute: 'id',

            // Optional role-ish markers inside the pair
            userQuery: 'user-query',
            modelResponse: 'model-response',

            // Code blocks inside Gemini responses
            codeBlock: 'pre',

            // Response action area: anchor to Gemini's footer action component
            actionArea: 'message-actions .actions-container-v2'
        };
    }

    findMessages() {
        const {
            messageEntry,
            idAttribute,
            userQuery,
            modelResponse
        } = this.selectors;

        // 1. Primary path: real conversation pair containers
        let nodes = Array.from(document.querySelectorAll(messageEntry)).filter((node) => {
            if (!(node instanceof HTMLElement)) return false;
            if (!node.closest('main')) return false;

            // Strong signal: has both user and assistant parts
            const hasUser = !!node.querySelector(userQuery);
            const hasModel = !!node.querySelector(modelResponse);

            if (hasUser && hasModel) return true;

            // Fallback: still accept if it has a stable id and at least one side rendered
            if (node.hasAttribute(idAttribute) && (hasUser || hasModel)) return true;

            return false;
        });

        if (nodes.length > 0) {
            return nodes;
        }

        // 2. Fallback: looser search for Gemini conversation roots
        nodes = Array.from(
            document.querySelectorAll('main .conversation-container')
        ).filter((node) => {
            if (!(node instanceof HTMLElement)) return false;

            const hasUser = !!node.querySelector('user-query');
            const hasModel = !!node.querySelector('model-response');

            // Avoid random nested containers
            if (!hasUser || !hasModel) return false;

            // Ignore obvious inner blocks if Gemini adds nested containers later
            const parentConversation = node.parentElement?.closest?.('.conversation-container');
            if (parentConversation) return false;

            return true;
        });

        return nodes;
    }

    getMessageId(node) {
        if (!node) return null;

        const cached = node.getAttribute(this.selectors.idAttribute);
        if (cached) return cached;

        let id = node.getAttribute('id');
        if (!id) {
            const contentEl = node.querySelector('[id^="message-content-id-"], [id^="model-response-message-content"]');
            if (contentEl && contentEl.id) id = contentEl.id;
        }
        if (!id) {
            const draftId = node.querySelector('[data-test-draft-id]')?.getAttribute('data-test-draft-id');
            if (draftId) id = `draft-${draftId}`;
        }

        if (!id) return null;
        node.setAttribute(this.selectors.idAttribute, id);
        console.debug('Generated message id for Gemini node:', { node, id });
        return id;
    }
    findActionArea(messageEl) {
        if (!(messageEl instanceof HTMLElement)) return null;

        return (
            messageEl.querySelector('message-actions .actions-container-v2') ||
            messageEl.querySelector('message-actions') ||
            null
        );
    }
}
