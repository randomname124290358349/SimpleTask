// Global state
let currentUser = localStorage.getItem('simpletask_user');
let currentTaskCreatedAt = null;

let currentTaskCompletedAt = null;
let activeMessageEdits = {}; // Track active edits to prevent auto-refresh

// Helper to parse SQLite UTC strings ("YYYY-MM-DD HH:MM:SS") as UTC
function parseUTCDate(dateString) {
    if (!dateString) return null;
    // Replace space with T and append Z to indicate UTC
    // Example: "2023-10-27 10:00:00" -> "2023-10-27T10:00:00Z"
    return new Date(dateString.replace(' ', 'T') + 'Z');
}

// --- User Identification ---

function checkUser() {
    if (!currentUser) {
        if (document.getElementById('id-modal')) {
            document.getElementById('id-modal').classList.add('active');
        } else {
            // If on task page and no user, redirect or show modal if possible
            // For simplicity, we might just redirect to index if no user found, 
            // but let's try to handle it gracefully or assume index check happened.
            window.location.href = '/';
        }
    } else {
        // Sync with session
        fetch('/api/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: currentUser })
        });

        const display = document.getElementById('display-name');
        if (display) {
            display.textContent = `Hi, ${currentUser}`;
            document.getElementById('user-info').style.display = 'flex';
        }

        // Load initial data if on index
        if (document.getElementById('task-list')) {
            loadTasks('open');
        }
    }
}

function identifyUser() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name) {
        currentUser = name;
        localStorage.setItem('simpletask_user', name);
        document.getElementById('id-modal').classList.remove('active');
        checkUser();
    }
}

function logoutUser() {
    localStorage.removeItem('simpletask_user');
    currentUser = null;
    document.getElementById('user-info').style.display = 'none';
    window.location.reload();
}

// --- Task Management ---

function openCreateTaskModal() {
    document.getElementById('create-task-modal').classList.add('active');
}

function closeCreateTaskModal() {
    document.getElementById('create-task-modal').classList.remove('active');
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
}

async function createTask() {
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-desc');
    const createBtn = document.getElementById('create-task-btn');

    const title = titleInput.value.trim();
    const desc = descInput.value.trim();

    if (!title) return;

    // UI Feedback
    const originalBtnText = createBtn.innerHTML;
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="pulsing">✨</span> Improving & Creating...';

    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc })
        });

        if (res.ok) {
            closeCreateTaskModal();
            loadTasks('open');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = originalBtnText;
    }
}

// Search state
let currentSearchQuery = '';
let searchDebounceTimer = null;

function handleSearch(query) {
    currentSearchQuery = query.trim();

    // Debounce
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        loadTasks(getCurrentStatus());
    }, 300);
}

function getCurrentStatus() {
    // Helper to find which tab is active
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav && activeNav.innerText.includes('Completed')) {
        return 'completed';
    }
    return 'open';
}

async function loadTasks(status) {
    let url = `/api/tasks?status=${status}`;
    if (currentSearchQuery) {
        url += `&search=${encodeURIComponent(currentSearchQuery)}`;
    }

    const res = await fetch(url);
    const tasks = await res.json();

    const list = document.getElementById('task-list');
    list.innerHTML = '';

    if (tasks.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No tasks found</div>';
        return;
    }

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => window.location.href = `/task/${task.id}`;

        const date = parseUTCDate(task.created_at).toLocaleDateString();
        const descPreview = task.description ? task.description : 'No description';

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <h3>${task.title}</h3>
                <div class="status-badge status-${task.status}">${task.status}</div>
            </div>
            <p>${descPreview}</p>
            <div class="card-footer">
                <span>${task.created_by}</span>
                <span>${date}</span>
            </div>
        `;
        list.appendChild(div);
    });
}

async function loadTaskDetails(id) {
    const res = await fetch(`/api/tasks/${id}`);
    if (!res.ok) {
        alert('Task not found');
        window.location.href = '/';
        return;
    }
    const task = await res.json();

    document.getElementById('task-title').textContent = task.title;
    document.getElementById('task-desc').textContent = task.description || '';
    document.getElementById('task-meta').textContent = `Created by ${task.created_by} on ${parseUTCDate(task.created_at).toLocaleString()}`;

    const statusBadge = document.getElementById('task-status');
    statusBadge.textContent = task.status;
    statusBadge.className = `status-badge status-${task.status}`;

    // Timer setup
    currentTaskCreatedAt = parseUTCDate(task.created_at);
    currentTaskCompletedAt = task.completed_at ? parseUTCDate(task.completed_at) : null;
    updateTimer();

    // Action buttons
    const actions = document.getElementById('task-actions');
    if (task.status === 'open') {
        actions.innerHTML = `<button class="btn btn-secondary" onclick="updateStatus(${id}, 'completed')">Mark as Completed</button>`;
    } else {
        actions.innerHTML = `<button class="btn btn-secondary" onclick="updateStatus(${id}, 'open')">Reopen Task</button>`;
    }
}

async function updateStatus(id, status) {
    await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    loadTaskDetails(id);
}

function openDeleteTaskModal() {
    document.getElementById('delete-task-modal').classList.add('active');
}

function closeDeleteTaskModal() {
    document.getElementById('delete-task-modal').classList.remove('active');
}

async function confirmDeleteTask() {
    const res = await fetch(`/api/tasks/${TASK_ID}`, {
        method: 'DELETE'
    });

    if (res.ok) {
        window.location.href = '/';
    } else {
        alert('Failed to delete task');
        closeDeleteTaskModal();
    }
}

// --- Inline Edit Management ---

let currentEditElement = null;
let originalContent = '';

function enableInlineEdit(elementId, type) {
    if (currentEditElement) return; // Already editing something

    const el = document.getElementById(elementId);
    if (!el) return;

    currentEditElement = elementId;
    originalContent = el.textContent; // Save for cancel? Or just use current value

    const currentText = el.textContent;
    el.removeAttribute('onclick'); // Disable click while editing
    el.classList.remove('editable');

    if (type === 'textarea') {
        el.innerHTML = `<textarea id="${elementId}-input" class="editable-input" rows="5" onblur="saveInlineEdit('${elementId}', 'textarea')" onkeydown="handleInlineKey(event, '${elementId}', 'textarea')">${currentText}</textarea>`;
    } else {
        el.innerHTML = `<input type="text" id="${elementId}-input" class="editable-input" value="${currentText}" onblur="saveInlineEdit('${elementId}', 'input')" onkeydown="handleInlineKey(event, '${elementId}', 'input')">`;
    }

    const input = document.getElementById(`${elementId}-input`);
    input.focus();
}

function handleInlineKey(e, elementId, type) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveInlineEdit(elementId, type);
    } else if (e.key === 'Escape') {
        cancelInlineEdit(elementId, type);
    }
}

function cancelInlineEdit(elementId, type) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = originalContent;
    resetInlineEditState(elementId, type);
}

async function saveInlineEdit(elementId, type) {
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

        const res = await fetch(`/api/tasks/${TASK_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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

// --- Theme Management ---

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('simpletask_theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        const isDark = document.body.classList.contains('dark-mode');
        btn.textContent = isDark ? '☀️' : '🌙';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('simpletask_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcon();
}

// --- Chat Management ---

async function loadMessages(taskId) {
    const res = await fetch(`/api/tasks/${taskId}/messages`);
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
        const isMine = msg.user_name === currentUser;
        div.className = `message ${isMine ? 'mine' : ''}`;
        div.id = `msg-${msg.id}`; // Add ID for easy access

        const date = parseUTCDate(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const edited = msg.is_edited ? ' (edited)' : '';

        // Allow actions for ALL users
        div.innerHTML = `
            <div class="message-bubble">
                <div class="message-header">
                    <strong>${msg.user_name}</strong>
                    <span>${date}${edited}</span>
                </div>
                <div class="message-content editable" id="msg-content-${msg.id}" 
                     onclick="startEdit(${msg.id})" 
                     title="Click to edit" 
                     style="cursor: pointer;">${msg.content}</div>
            </div>
            <div class="message-actions">
                <span class="action-link" onclick="deleteMessage(${msg.id})">Delete</span>
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

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content) return;

    input.value = ''; // Clear immediately

    // Add temporary "Improving message..." bubble
    const list = document.getElementById('message-list');
    const tempDiv = document.createElement('div');
    tempDiv.id = 'pending-message';
    tempDiv.className = 'message mine';
    tempDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-header">
                <strong>${currentUser}</strong>
                <span>Now</span>
            </div>
            <div class="message-content improving-message">
                <span class="pulsing">✨</span> Improving message with AI...
            </div>
        </div>
    `;
    list.appendChild(tempDiv);
    list.scrollTop = list.scrollHeight;

    await fetch(`/api/tasks/${TASK_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });

    // Remove pending message (loadMessages will refresh the list)
    if (tempDiv.parentNode) {
        tempDiv.remove();
    }
    loadMessages(TASK_ID);
}

// --- Message Operations ---

let messageToDeleteId = null;

function openDeleteMsgModal(id) {
    messageToDeleteId = id;
    document.getElementById('delete-msg-modal').classList.add('active');
    document.getElementById('confirm-delete-btn').onclick = confirmDeleteMessage;
}

function closeDeleteMsgModal() {
    document.getElementById('delete-msg-modal').classList.remove('active');
    messageToDeleteId = null;
}

async function confirmDeleteMessage() {
    if (!messageToDeleteId) return;

    await fetch(`/api/messages/${messageToDeleteId}`, { method: 'DELETE' });
    closeDeleteMsgModal();
    loadMessages(TASK_ID);
}

// Wrapper for the onclick in HTML
function deleteMessage(id) {
    openDeleteMsgModal(id);
}

function startEdit(id) {
    const contentEl = document.getElementById(`msg-content-${id}`);
    if (!contentEl) return;

    // Prevent double edit
    if (activeMessageEdits[id]) return;

    const currentContent = contentEl.textContent;
    activeMessageEdits[id] = currentContent; // Store original content

    // Lock the width to prevent collapsing
    const currentWidth = contentEl.offsetWidth;
    contentEl.style.width = `${currentWidth}px`;

    // Inline edit interface
    contentEl.innerHTML = `
        <textarea id="edit-input-${id}" class="edit-input" rows="2" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--accent-color); margin-bottom: 5px; font-family: inherit; font-size: inherit;">${currentContent}</textarea>
        <div class="edit-actions" style="display: flex; gap: 5px; justify-content: flex-end;">
            <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="cancelEdit(${id})">Cancel</button>
            <button class="btn" style="padding: 4px 10px; font-size: 12px;" onclick="saveEdit(${id})">Save</button>
        </div>
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

function cancelEdit(id) {
    const contentEl = document.getElementById(`msg-content-${id}`);
    if (contentEl && activeMessageEdits[id] !== undefined) {
        contentEl.textContent = activeMessageEdits[id];
        contentEl.style.width = ''; // Unlock width
        delete activeMessageEdits[id];
    }
}

async function saveEdit(id) {
    const input = document.getElementById(`edit-input-${id}`);
    if (!input) return;

    const newContent = input.value.trim();
    if (!newContent) return; // Or confirm delete?

    await fetch(`/api/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
    });

    const contentEl = document.getElementById(`msg-content-${id}`);
    if (contentEl) {
        contentEl.style.width = ''; // Unlock width
    }

    delete activeMessageEdits[id]; // Clear edit state
    loadMessages(TASK_ID);
}

// Legacy editMessage function removed as it is replaced by saveEdit logic


// --- Timer ---

function updateTimer() {
    if (!currentTaskCreatedAt) return;

    const now = currentTaskCompletedAt || new Date();
    const diff = now - currentTaskCreatedAt;

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const timerEl = document.getElementById('task-timer');
    if (timerEl) {
        timerEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }
}

// Init on index page
if (document.getElementById('task-list')) {
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        checkUser();
    });
} else {
    // For task page, we need to init theme too (it's called in task.html DOMContentLoaded but let's be safe)
    document.addEventListener('DOMContentLoaded', initTheme);
}
