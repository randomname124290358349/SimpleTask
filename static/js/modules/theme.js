export function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('simpletask_theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

export function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        const isDark = document.body.classList.contains('dark-mode');
        btn.textContent = isDark ? '☀️' : '🌙';
    }
}

export function initTheme() {
    const savedTheme = localStorage.getItem('simpletask_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcon();
}
