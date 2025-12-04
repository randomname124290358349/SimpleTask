import { loadTasks } from './tasks.js';

let currentUser = localStorage.getItem('simpletask_user');

export function getCurrentUser() {
    return currentUser;
}

export function checkUser() {
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

export function identifyUser() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name) {
        currentUser = name;
        localStorage.setItem('simpletask_user', name);
        document.getElementById('id-modal').classList.remove('active');
        checkUser();
    }
}

export function logoutUser() {
    localStorage.removeItem('simpletask_user');
    currentUser = null;
    document.getElementById('user-info').style.display = 'none';
    window.location.reload();
}
