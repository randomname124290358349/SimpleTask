import { getApiKey } from './user.js';

let currentEditElement = null;
let originalContent = '';

export function enableInlineEdit(elementId, type) {
    if (currentEditElement) return; // Already editing something

    const el = document.getElementById(elementId);
    if (!el) return;

    currentEditElement = elementId;
    originalContent = el.textContent; // Save for cancel? Or just use current value

    const currentText = el.textContent;
    el.removeAttribute('onclick'); // Disable click while editing
    el.classList.remove('editable');

    if (type === 'textarea') {
        el.innerHTML = `<textarea id="${elementId}-input" class="editable-input" rows="5" onblur="window.saveInlineEdit('${elementId}', 'textarea')" onkeydown="window.handleInlineKey(event, '${elementId}', 'textarea')">${currentText}</textarea>`;
    } else {
        el.innerHTML = `<input type="text" id="${elementId}-input" class="editable-input" value="${currentText}" onblur="window.saveInlineEdit('${elementId}', 'input')" onkeydown="window.handleInlineKey(event, '${elementId}', 'input')">`;
    }

    const input = document.getElementById(`${elementId}-input`);
    input.focus();
}

export function handleInlineKey(e, elementId, type) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveInlineEdit(elementId, type);
    } else if (e.key === 'Escape') {
        cancelInlineEdit(elementId, type);
    }
}

export function cancelInlineEdit(elementId, type) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = originalContent;
    resetInlineEditState(elementId, type);
}

export async function saveInlineEdit(elementId, type) {
    // Small delay to prevent race conditions with other events
    setTimeout(async () => {
        const input = document.getElementById(`${elementId}-input`);
        if (!input) return; // Already handled?

        const newVal = input.value.trim();

        // Optimistic update
        const el = document.getElementById(elementId);
        el.textContent = newVal;
        resetInlineEditState(elementId, type);

        if (newVal === originalContent) return; // No change

        // Save to backend
        const title = elementId === 'task-title' ? newVal : document.getElementById('task-title').textContent;
        const description = elementId === 'task-desc' ? newVal : document.getElementById('task-desc').textContent;

        const res = await fetch(`/api/tasks/${window.TASK_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': getApiKey()
            },
            body: JSON.stringify({ title, description })
        });

        if (!res.ok) {
            alert('Failed to save changes');
            el.textContent = originalContent; // Revert
        }
    }, 100);
}

function resetInlineEditState(elementId, type) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.classList.add('editable');
    el.setAttribute('onclick', `enableInlineEdit('${elementId}', '${type}')`);
    currentEditElement = null;
}
