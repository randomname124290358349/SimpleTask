import { parseUTCDate } from './utils.js';
import { getAIPreference } from './ai.js';
import { setTimerState, updateTimer } from './timer.js';
import { getApiKey, logoutUser } from './user.js';

let currentViewMode = localStorage.getItem('simpletask_view_mode') || 'card';
let currentSortOrder = 'desc';
let currentSearchQuery = '';
let searchDebounceTimer = null;

export function openCreateTaskModal() {
    document.getElementById('create-task-modal').classList.add('active');
}

export function closeCreateTaskModal() {
    document.getElementById('create-task-modal').classList.remove('active');
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
}

export async function createTask() {
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-desc');
    const createBtn = document.getElementById('create-task-btn');

    const title = titleInput.value.trim();
    const desc = descInput.value.trim();

    if (!title) return;

    // UI Feedback
    const originalBtnText = createBtn.innerHTML;
    createBtn.disabled = true;

    const useAI = getAIPreference();
    if (useAI) {
        createBtn.innerHTML = '<span class="pulsing">✨</span> Improving & Creating...';
    } else {
        createBtn.innerHTML = 'Creating...';
    }

    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': getApiKey()
            },
            body: JSON.stringify({ title, description: desc, use_ai: useAI })
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

export function handleSearch(query) {
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

export function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('simpletask_view_mode', mode);

    // Update UI
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(mode)) {
            btn.classList.add('active');
        }
    });

    loadTasks(getCurrentStatus());
}

export function toggleSortOrder() {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    loadTasks(getCurrentStatus());
}

export function initViewMode() {
    // Set initial active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(currentViewMode)) {
            btn.classList.add('active');
        }
    });
}

export async function loadTasks(status) {
    let url = `/api/tasks?status=${status}`;
    if (currentSearchQuery) {
        url += `&search=${encodeURIComponent(currentSearchQuery)}`;
    }

    const res = await fetch(url, {
        headers: { 'X-API-Key': getApiKey() }
    });

    if (res.status === 401) {
        logoutUser();
        return;
    }
    const tasks = await res.json();

    const list = document.getElementById('task-list');
    list.innerHTML = '';

    // Update grid/table class
    if (currentViewMode === 'table') {
        list.classList.remove('task-grid');
        list.classList.add('task-table-view');
    } else {
        list.classList.add('task-grid');
        list.classList.remove('task-table-view');
    }

    if (tasks.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No tasks found</div>';
        return;
    }

    if (currentViewMode === 'table') {
        // Sort tasks
        tasks.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return currentSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        const table = document.createElement('table');
        table.className = 'task-table';

        const sortIcon = currentSortOrder === 'asc' ? '↑' : '↓';

        table.innerHTML = `
            <thead>
                <tr>
                    <th style="text-align: left;">Title</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th style="cursor: pointer; user-select: none;" onclick="toggleSortOrder()">
                        Date ${sortIcon}
                    </th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        tasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.onclick = () => window.location.href = `/task/${task.id}`;
            const date = parseUTCDate(task.created_at).toLocaleDateString();

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${task.title}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${task.description ? task.description.substring(0, 50) + (task.description.length > 50 ? '...' : '') : ''}</div>
                </td>
                <td><span class="status-badge status-${task.status}">${task.status}</span></td>
                <td>${task.created_by}</td>
                <td>${date}</td>
            `;
            tbody.appendChild(tr);
        });
        list.appendChild(table);
    } else {
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
}

export async function loadTaskDetails(id) {
    const res = await fetch(`/api/tasks/${id}`, {
        headers: { 'X-API-Key': getApiKey() }
    });
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
    setTimerState(
        parseUTCDate(task.created_at),
        task.completed_at ? parseUTCDate(task.completed_at) : null
    );
    updateTimer();

    // Action buttons
    const actions = document.getElementById('task-actions');
    if (task.status === 'open') {
        actions.innerHTML = `<button class="btn btn-secondary" onclick="window.updateStatus(${id}, 'completed')">Mark as Completed</button>`;
    } else {
        actions.innerHTML = `<button class="btn btn-secondary" onclick="window.updateStatus(${id}, 'open')">Reopen Task</button>`;
    }
}

export async function updateStatus(id, status) {
    await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': getApiKey()
        },
        body: JSON.stringify({ status })
    });
    loadTaskDetails(id);
}

export function openDeleteTaskModal() {
    document.getElementById('delete-task-modal').classList.add('active');
}

export function closeDeleteTaskModal() {
    document.getElementById('delete-task-modal').classList.remove('active');
}

export async function confirmDeleteTask() {
    const res = await fetch(`/api/tasks/${window.TASK_ID}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': getApiKey() }
    });

    if (res.ok) {
        window.location.href = '/';
    } else {
        alert('Failed to delete task');
        closeDeleteTaskModal();
    }
}
