
let aiAvailable = false;

export async function checkAIConfig() {
    try {
        const apiKey = localStorage.getItem('simpletask_api_key');
        const res = await fetch('/api/config', {
            headers: { 'X-API-Key': apiKey }
        });
        const data = await res.json();
        aiAvailable = data.ai_available;

        if (aiAvailable) {
            const containers = document.querySelectorAll('#ai-toggle-container');
            containers.forEach(el => el.style.display = 'flex');

            // Restore preference
            const savedPref = localStorage.getItem('simpletask_use_ai');
            const useAI = savedPref === null ? true : (savedPref === 'true');

            document.querySelectorAll('#use-ai-toggle').forEach(el => el.checked = useAI);
        }
    } catch (e) {
        console.error('Failed to check AI config', e);
    }
}

export function toggleAIPreference(enabled) {
    localStorage.setItem('simpletask_use_ai', enabled);
}

export function getAIPreference() {
    if (!aiAvailable) return false;
    const savedPref = localStorage.getItem('simpletask_use_ai');
    return savedPref === null ? true : (savedPref === 'true');
}
