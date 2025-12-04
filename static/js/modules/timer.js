let currentTaskCreatedAt = null;
let currentTaskCompletedAt = null;

export function setTimerState(createdAt, completedAt) {
    currentTaskCreatedAt = createdAt;
    currentTaskCompletedAt = completedAt;
}

export function updateTimer() {
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
