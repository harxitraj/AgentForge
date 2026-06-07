// ─────────────────────────────────────────────
// All API calls to AgentForge backend
// ─────────────────────────────────────────────

const API = {

    // ── Repo ──────────────────────────────────
    linkRepo: async (repoUrl) => {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/repo/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl })
        });
        return response.json();
    },

    listRepos: async () => {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/repo/list`);
        return response.json();
    },

    // ── Agent Tasks ───────────────────────────
    createTask: async (repoUrl, prompt) => {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/agent/task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, prompt })
        });
        return response.json();
    },

    getTask: async (taskId) => {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/agent/task/${taskId}`);
        return response.json();
    },

    getAllTasks: async () => {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/agent/tasks`);
        return response.json();
    }
};
