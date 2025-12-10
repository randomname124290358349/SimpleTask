import { loadTasks } from './tasks.js';

let currentUser = localStorage.getItem('simpletask_user');
let currentApiKey = localStorage.getItem('simpletask_api_key');

export function getCurrentUser() {
    return currentUser;
}

export function getApiKey() {
    return currentApiKey;
}

export function checkUser() {
    if (!currentUser || !currentApiKey) {
        if (document.getElementById('id-modal')) {
            document.getElementById('id-modal').classList.add('active');
        } else {
            window.location.href = '/';
        }
    } else {
        // Sync with session
        fetch('/api/identify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': currentApiKey
            },
            body: JSON.stringify({ name: currentUser })
        }).then(res => {
            if (res.status === 401) {
                // Invalid key
                logoutUser();
            }
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

        // Refresh AI config now that we have credentials
        if (window.checkAIConfig) {
            window.checkAIConfig();
        }
    }
}

export function identifyUser() {
    const input = document.getElementById('username-input');
    const keyInput = document.getElementById('apikey-input');

    const name = input.value.trim();
    const key = keyInput.value.trim();

    if (name && key) {
        currentUser = name;
        currentApiKey = key;
        localStorage.setItem('simpletask_user', name);
        localStorage.setItem('simpletask_api_key', key);
        document.getElementById('id-modal').classList.remove('active');
        checkUser();
    } else {
        alert('Please enter both Name and API Key');
    }
}

export function logoutUser() {
    localStorage.removeItem('simpletask_user');
    localStorage.removeItem('simpletask_api_key');
    currentUser = null;
    currentApiKey = null;
    document.getElementById('user-info').style.display = 'none';
    window.location.reload();
}
