import { getCurrentUser, getApiKey } from './user.js';
import { getAIPreference } from './ai.js';
import { parseUTCDate } from './utils.js';

let activeMessageEdits = {};
let messageToDeleteId = null;

export async function loadMessages(taskId) {
    const res = await fetch(`/api/tasks/${taskId}/messages`, {
        headers: { 'X-API-Key': getApiKey() }
    });
    const messages = await res.json();

    const list = document.getElementById('message-list');

    // Check if we have a pending "improving" message
    const pendingMsg = document.getElementById('pending-message');

    const currentScroll = list.scrollTop;
    const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;

    // Clear list but keep pending message if it exists
    list.innerHTML = '';

    messages.forEach(msg => {
        const div = document.createElement('div');
        const isMine = msg.user_name === getCurrentUser();
        div.className = `message ${isMine ? 'mine' : ''}`;
        div.id = `msg-${msg.id}`; // Add ID for easy access

        const dateObj = parseUTCDate(msg.created_at);
        const date = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' +
            dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const edited = msg.is_edited ? ' (edited)' : '';

        // Allow actions for ALL users
        div.innerHTML = `
            <div class="message-bubble">
                <div class="message-header">
                    <strong>${msg.user_name}</strong>
                    <span>${date}${edited}</span>
                </div>
                <div class="message-content editable" id="msg-content-${msg.id}" 
                     onclick="window.startEdit(${msg.id})" 
                     title="Click to edit" 
                     style="cursor: pointer;">${msg.content}</div>
            </div>
            <div class="message-actions">
                <span class="action-link" onclick="window.deleteMessage(${msg.id})">Delete</span>
            </div>
        `;
        list.appendChild(div);
    });

    if (pendingMsg) {
        list.appendChild(pendingMsg);
    }

    if (isNearBottom) {
        list.scrollTop = list.scrollHeight;
    } else {
        list.scrollTop = currentScroll;
    }
}

export function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

export async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content) return;

    input.value = ''; // Clear immediately

    // Add temporary message bubble
    const list = document.getElementById('message-list');
    const tempDiv = document.createElement('div');
    tempDiv.id = 'pending-message';
    tempDiv.className = 'message mine';

    const useAI = getAIPreference();
    let tempContent = content;
    if (useAI) {
        tempContent = `<span class="pulsing">✨</span> Improving message with AI...`;
    }

    tempDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-header">
                <strong>${getCurrentUser()}</strong>
                <span>Now</span>
            </div>
            <div class="message-content improving-message">
                ${tempContent}
            </div>
        </div>
    `;
    list.appendChild(tempDiv);
    list.scrollTop = list.scrollHeight;

    await fetch(`/api/tasks/${window.TASK_ID}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': getApiKey()
        },
        body: JSON.stringify({ content, use_ai: useAI })
    });

    // Remove pending message (loadMessages will refresh the list)
    if (tempDiv.parentNode) {
        tempDiv.remove();
    }
    loadMessages(window.TASK_ID);
}

export function openDeleteMsgModal(id) {
    messageToDeleteId = id;
    document.getElementById('delete-msg-modal').classList.add('active');
    document.getElementById('confirm-delete-btn').onclick = confirmDeleteMessage;
}

export function closeDeleteMsgModal() {
    document.getElementById('delete-msg-modal').classList.remove('active');
    messageToDeleteId = null;
}

export async function confirmDeleteMessage() {
    if (!messageToDeleteId) return;

    await fetch(`/api/messages/${messageToDeleteId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': getApiKey() }
    });
    closeDeleteMsgModal();
    loadMessages(window.TASK_ID);
}

export function deleteMessage(id) {
    openDeleteMsgModal(id);
}

export function handleMessageEditKey(e, id) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const input = document.getElementById(`edit-input-${id}`);
        if (input) input.blur();
    } else if (e.key === 'Escape') {
        cancelEdit(id);
    }
}

export function startEdit(id) {
    const contentEl = document.getElementById(`msg-content-${id}`);
    if (!contentEl) return;

    // Prevent double edit
    if (activeMessageEdits[id]) return;

    const currentContent = contentEl.textContent;
    activeMessageEdits[id] = currentContent; // Store original content

    // Lock the width to prevent collapsing
    const currentWidth = contentEl.offsetWidth;
    contentEl.style.width = `${currentWidth}px`;

    // Inline edit interface - No buttons, just textarea
    contentEl.innerHTML = `
        <textarea id="edit-input-${id}" class="edit-input" rows="2" 
            style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--accent-color); margin-bottom: 5px; font-family: inherit; font-size: inherit; resize: none;"
            onblur="window.saveEdit(${id})"
            onkeydown="window.handleMessageEditKey(event, ${id})">${currentContent}</textarea>
    `;

    // Focus textarea
    setTimeout(() => {
        const textarea = document.getElementById(`edit-input-${id}`);
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }, 50);
}

export function cancelEdit(id) {
    const contentEl = document.getElementById(`msg-content-${id}`);
    if (contentEl && activeMessageEdits[id] !== undefined) {
        contentEl.textContent = activeMessageEdits[id];
        contentEl.style.width = ''; // Unlock width
        delete activeMessageEdits[id];
    }
}

export async function saveEdit(id) {
    // Small delay to prevent race conditions
    setTimeout(async () => {
        const input = document.getElementById(`edit-input-${id}`);
        if (!input) return; // Already handled (e.g. cancelled)

        const newContent = input.value.trim();
        const originalContent = activeMessageEdits[id];

        // If no change or empty, revert
        if (!newContent || newContent === originalContent) {
            cancelEdit(id);
            return;
        }

        // Optimistic update
        const contentEl = document.getElementById(`msg-content-${id}`);
        if (contentEl) {
            contentEl.textContent = newContent;
            contentEl.style.width = ''; // Unlock width
        }

        delete activeMessageEdits[id]; // Clear edit state

        try {
            const res = await fetch(`/api/messages/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': getApiKey()
                },
                body: JSON.stringify({ content: newContent })
            });

            if (!res.ok) {
                // Revert on failure
                if (contentEl) contentEl.textContent = originalContent;
                alert('Failed to save changes');
            }
        } catch (error) {
            console.error('Error saving message:', error);
            if (contentEl) contentEl.textContent = originalContent;
        }

        // Reload to ensure consistency
        loadMessages(window.TASK_ID);
    }, 100);
}

export function getActiveMessageEdits() {
    return activeMessageEdits;
}
