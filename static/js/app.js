import * as Utils from './modules/utils.js';
import * as AI from './modules/ai.js';
import * as Theme from './modules/theme.js';
import * as Timer from './modules/timer.js';
import * as InlineEdit from './modules/inline-edit.js';
import * as Tasks from './modules/tasks.js';
import * as User from './modules/user.js';
import * as Chat from './modules/chat.js';

// Expose to window for HTML onclick handlers and inline scripts
window.checkUser = User.checkUser;
window.identifyUser = User.identifyUser;
window.logoutUser = User.logoutUser;

window.checkAIConfig = AI.checkAIConfig;
window.toggleAIPreference = AI.toggleAIPreference;
window.getAIPreference = AI.getAIPreference;

window.openCreateTaskModal = Tasks.openCreateTaskModal;
window.closeCreateTaskModal = Tasks.closeCreateTaskModal;
window.createTask = Tasks.createTask;
window.handleSearch = Tasks.handleSearch;
window.setViewMode = Tasks.setViewMode;
window.loadTasks = Tasks.loadTasks;
window.loadTaskDetails = Tasks.loadTaskDetails;
window.updateStatus = Tasks.updateStatus;
window.openDeleteTaskModal = Tasks.openDeleteTaskModal;
window.closeDeleteTaskModal = Tasks.closeDeleteTaskModal;
window.confirmDeleteTask = Tasks.confirmDeleteTask;

window.enableInlineEdit = InlineEdit.enableInlineEdit;
window.handleInlineKey = InlineEdit.handleInlineKey;
window.saveInlineEdit = InlineEdit.saveInlineEdit;
window.cancelInlineEdit = InlineEdit.cancelInlineEdit;

window.toggleDarkMode = Theme.toggleDarkMode;
window.updateThemeIcon = Theme.updateThemeIcon;
window.initTheme = Theme.initTheme;

window.loadMessages = Chat.loadMessages;
window.handleEnter = Chat.handleEnter;
window.sendMessage = Chat.sendMessage;
window.openDeleteMsgModal = Chat.openDeleteMsgModal;
window.closeDeleteMsgModal = Chat.closeDeleteMsgModal;
window.confirmDeleteMessage = Chat.confirmDeleteMessage;
window.deleteMessage = Chat.deleteMessage;
window.handleMessageEditKey = Chat.handleMessageEditKey;
window.startEdit = Chat.startEdit;
window.saveEdit = Chat.saveEdit;
window.cancelEdit = Chat.cancelEdit;
window.activeMessageEdits = Chat.getActiveMessageEdits();

window.updateTimer = Timer.updateTimer;

// Init logic
if (document.getElementById('task-list')) {
    // We can't rely on DOMContentLoaded here because if this is a module, 
    // it might run after DOMContentLoaded if deferred? 
    // Actually modules are deferred, so they run after parsing, before DOMContentLoaded fires?
    // "defer" scripts execute before DOMContentLoaded.
    // So we can still listen to it, or just run if ready.

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            Theme.initTheme();
            User.checkUser();
            AI.checkAIConfig();
            Tasks.initViewMode();
        });
    } else {
        Theme.initTheme();
        User.checkUser();
        AI.checkAIConfig();
        Tasks.initViewMode();
    }
} else {
    // For task page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            Theme.initTheme();
            AI.checkAIConfig();
        });
    } else {
        Theme.initTheme();
        AI.checkAIConfig();
    }
}
