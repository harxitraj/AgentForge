// ─────────────────────────────────────────────────────
// AgentForge Dashboard
// ─────────────────────────────────────────────────────

// ── State ─────────────────────────────────────────────
let selectedRepoUrl = null;
let activeTaskId = null;
let socket = null;
let allTasks = [];

// ── DOM Elements ───────────────────────────────────────
const repoUrlInput      = document.getElementById('repoUrlInput');
const linkRepoBtn       = document.getElementById('linkRepoBtn');
const linkedReposList   = document.getElementById('linkedReposList');
const selectedRepoDisplay = document.getElementById('selectedRepoDisplay');
const promptInput       = document.getElementById('prompt');
const runTaskBtn        = document.getElementById('runTaskBtn');
const tasksList         = document.getElementById('tasksList');
const taskDetail        = document.getElementById('taskDetail');
const emptyState        = document.getElementById('emptyState');
const taskContent       = document.getElementById('taskContent');
const taskMeta          = document.getElementById('taskMeta');
const logsBody          = document.getElementById('logsBody');
const prResult          = document.getElementById('prResult');
const prLink            = document.getElementById('prLink');
const liveIndicator     = document.getElementById('liveIndicator');
const refreshTasksBtn   = document.getElementById('refreshTasksBtn');
const providerDisplay   = document.getElementById('providerDisplay');
const toastContainer    = document.getElementById('toastContainer');

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    loadRepos();
    loadTasks();
    checkProviderStatus();
});

// ── Socket.IO ──────────────────────────────────────────
const initSocket = () => {
    socket = io(CONFIG.SOCKET_URL);

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });

    // Live log lines streamed from backend
    socket.on('agent:log', ({ taskId, message }) => {
        if (taskId === activeTaskId) {
            appendLog(message);
        }
        // Update task in local state
        const task = allTasks.find(t => t._id === taskId);
        if (task) {
            if (!task.logs) task.logs = [];
            task.logs.push(message);
        }
    });

    // Status updates
    socket.on('agent:status', ({ taskId, status }) => {
        const task = allTasks.find(t => t._id === taskId);
        if (task) task.status = status;

        // Update tab badge
        const tab = document.querySelector(`[data-task-id="${taskId}"] .badge`);
        if (tab) {
            tab.className = `badge badge-${status}`;
            tab.textContent = status;
        }

        // If active task — update detail view
        if (taskId === activeTaskId) {
            updateStatusInMeta(status);
            if (status === 'completed') {
                showPRResult(task);
                hideLiveIndicator();
                showToast('Task completed! PR has been raised.', 'success');
            }
            if (status === 'failed') {
                hideLiveIndicator();
                showToast('Task failed. Check logs for details.', 'error');
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
};

// ── Provider Status ────────────────────────────────────
const checkProviderStatus = async () => {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
        const data = await response.json();
        if (data.aiProvider) {
            providerDisplay.textContent = data.aiProvider;
        }
    } catch (e) {
        providerDisplay.textContent = 'offline';
        providerDisplay.style.background = 'rgba(239,68,68,0.15)';
        providerDisplay.style.color = 'var(--error)';
    }
};

// ── Repo Functions ─────────────────────────────────────
const loadRepos = async () => {
    try {
        const repos = await API.listRepos();
        renderRepos(repos);
    } catch (e) {
        showToast('Failed to load repositories', 'error');
    }
};

const renderRepos = (repos) => {
    linkedReposList.innerHTML = '';
    if (!repos.length) {
        linkedReposList.innerHTML = '<p class="text-muted" style="font-size:12px; padding: 4px 0;">No repos linked yet</p>';
        return;
    }
    repos.forEach(repo => {
        const item = document.createElement('div');
        item.className = 'repo-item';
        item.dataset.url = repo.repoUrl;
        item.innerHTML = `
            <div class="repo-dot"></div>
            <span>${repo.owner}/${repo.repoName}</span>
        `;
        item.addEventListener('click', () => selectRepo(repo.repoUrl, item));
        linkedReposList.appendChild(item);
    });
};

const selectRepo = (url, element) => {
    selectedRepoUrl = url;

    // Update active state on repo items
    document.querySelectorAll('.repo-item').forEach(r => r.classList.remove('active'));
    element.classList.add('active');

    // Update selected repo display
    const parts = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (parts) {
        selectedRepoDisplay.textContent = `${parts[1]}/${parts[2]}`;
        selectedRepoDisplay.classList.add('has-repo');
    }

    // Enable run button if prompt also has content
    checkRunButton();
};

linkRepoBtn.addEventListener('click', async () => {
    const url = repoUrlInput.value.trim();
    if (!url) return showToast('Please enter a GitHub repo URL', 'error');
    if (!url.includes('github.com')) return showToast('Please enter a valid GitHub URL', 'error');

    linkRepoBtn.disabled = true;
    linkRepoBtn.textContent = '...';

    try {
        const result = await API.linkRepo(url);
        if (result.error) {
            showToast(result.error, 'error');
        } else {
            showToast('Repository linked successfully', 'success');
            repoUrlInput.value = '';
            await loadRepos();
        }
    } catch (e) {
        showToast('Failed to link repository', 'error');
    } finally {
        linkRepoBtn.disabled = false;
        linkRepoBtn.textContent = 'Link';
    }
});

// ── Task Functions ─────────────────────────────────────
const loadTasks = async () => {
    try {
        const tasks = await API.getAllTasks();
        allTasks = tasks;
        renderTaskTabs(tasks);
    } catch (e) {
        console.error('Failed to load tasks:', e);
    }
};

const renderTaskTabs = (tasks) => {
    tasksList.innerHTML = '';
    if (!tasks.length) {
        tasksList.innerHTML = '<p class="text-muted" style="font-size:12px; line-height:56px; padding: 0 8px;">No tasks yet</p>';
        return;
    }
    tasks.forEach(task => {
        const tab = document.createElement('div');
        tab.className = `task-tab ${task._id === activeTaskId ? 'active' : ''}`;
        tab.dataset.taskId = task._id;
        tab.innerHTML = `
            <span class="badge badge-${task.status}">${task.status}</span>
            <span>${truncate(task.prompt, 30)}</span>
        `;
        tab.addEventListener('click', () => selectTask(task._id));
        tasksList.appendChild(tab);
    });
};

const selectTask = async (taskId) => {
    activeTaskId = taskId;

    // Update active tab
    document.querySelectorAll('.task-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`[data-task-id="${taskId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Load full task data
    try {
        const task = await API.getTask(taskId);
        // Update in local state
        const idx = allTasks.findIndex(t => t._id === taskId);
        if (idx !== -1) allTasks[idx] = task;
        renderTaskDetail(task);
    } catch (e) {
        showToast('Failed to load task details', 'error');
    }
};

const renderTaskDetail = (task) => {
    emptyState.classList.add('hidden');
    taskContent.classList.remove('hidden');

    // Meta
    taskMeta.innerHTML = `
        <div class="meta-item">
            <div class="meta-label">Status</div>
            <div class="meta-value">
                <span class="badge badge-${task.status}" id="statusBadge">${task.status}</span>
            </div>
        </div>
        <div class="meta-item">
            <div class="meta-label">AI Provider</div>
            <div class="meta-value">${task.aiProvider || 'claude'}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Repository</div>
            <div class="meta-value" style="font-size:12px">${task.repoUrl}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Branch</div>
            <div class="meta-value" style="font-size:12px">${task.branchName || '—'}</div>
        </div>
        <div class="meta-item" style="grid-column: 1 / -1">
            <div class="meta-label">Prompt</div>
            <div class="meta-value" style="font-weight:400; color: var(--text-secondary)">${task.prompt}</div>
        </div>
    `;

    // Logs
    logsBody.innerHTML = '';
    if (task.logs && task.logs.length) {
        task.logs.forEach(log => appendLog(log));
    } else {
        logsBody.innerHTML = '<span class="text-muted">Waiting for agent to start...</span>';
    }

    // PR Result
    if (task.status === 'completed' && task.prUrl) {
        showPRResult(task);
        hideLiveIndicator();
    } else {
        prResult.classList.add('hidden');
        if (task.status === 'running' || task.status === 'cloning') {
            showLiveIndicator();
        } else {
            hideLiveIndicator();
        }
    }

    // Scroll logs to bottom
    logsBody.scrollTop = logsBody.scrollHeight;
};

// ── Run Task ───────────────────────────────────────────
runTaskBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!selectedRepoUrl) return showToast('Please select a repository first', 'error');
    if (!prompt) return showToast('Please enter a task prompt', 'error');

    runTaskBtn.disabled = true;
    runTaskBtn.innerHTML = '<span class="spinner"></span> Running...';

    try {
        const result = await API.createTask(selectedRepoUrl, prompt);

        if (result.error) {
            showToast(result.error, 'error');
            return;
        }

        promptInput.value = '';
        showToast('Agent started successfully', 'success');

        // Add new task to local state
        const newTask = {
            _id: result.taskId,
            repoUrl: selectedRepoUrl,
            prompt: prompt,
            status: 'queued',
            aiProvider: result.aiProvider,
            logs: [],
            branchName: null,
            prUrl: null
        };
        allTasks.unshift(newTask);
        renderTaskTabs(allTasks);

        // Auto select the new task
        await selectTask(result.taskId);

    } catch (e) {
        showToast('Failed to start agent', 'error');
    } finally {
        runTaskBtn.disabled = false;
        runTaskBtn.innerHTML = '🚀 Run Agent';
        checkRunButton();
    }
});

// ── Helpers ────────────────────────────────────────────
const appendLog = (message) => {
    const line = document.createElement('span');
    line.className = 'log-line';

    if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        line.classList.add('error');
    } else if (message.toLowerCase().includes('success') || message.toLowerCase().includes('complete') || message.toLowerCase().includes('created')) {
        line.classList.add('success');
    } else if (message.toLowerCase().includes('===') || message.toLowerCase().includes('calling')) {
        line.classList.add('info');
    }

    line.textContent = `> ${message}`;
    logsBody.appendChild(line);
    logsBody.appendChild(document.createElement('br'));
    logsBody.scrollTop = logsBody.scrollHeight;
};

const updateStatusInMeta = (status) => {
    const badge = document.getElementById('statusBadge');
    if (badge) {
        badge.className = `badge badge-${status}`;
        badge.textContent = status;
    }
};

const showPRResult = (task) => {
    prResult.classList.remove('hidden');
    if (task && task.prUrl) {
        prLink.href = task.prUrl;
    }
};

const showLiveIndicator = () => liveIndicator.classList.remove('hidden');
const hideLiveIndicator = () => liveIndicator.classList.add('hidden');

const checkRunButton = () => {
    const hasRepo = !!selectedRepoUrl;
    const hasPrompt = promptInput.value.trim().length > 0;
    runTaskBtn.disabled = !(hasRepo && hasPrompt);
};

promptInput.addEventListener('input', checkRunButton);

refreshTasksBtn.addEventListener('click', async () => {
    await loadTasks();
    if (activeTaskId) await selectTask(activeTaskId);
    showToast('Refreshed', 'info');
});

const truncate = (str, len) => str.length > len ? str.slice(0, len) + '...' : str;

// ── Toast ──────────────────────────────────────────────
const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};
