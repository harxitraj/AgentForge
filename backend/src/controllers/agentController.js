const Task = require('../models/Task');
const { runTask } = require('../services/agentService');

const createTask = async (req, res) => {
    try {
        const { repoUrl, prompt } = req.body;

        if (!repoUrl || !prompt) {
            return res.status(400).json({ error: 'repoUrl and prompt are required' });
        }

        const task = await Task.create({ repoUrl, prompt });
        const io = req.app.get('io');

        // Fire and forget — runs in background
        runTask(task._id.toString(), io).catch(console.error);

        res.status(201).json({
            message: 'Task created and agent started',
            taskId: task._id,
            status: task.status,
            aiProvider: process.env.AI_PROVIDER || 'claude'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createTask, getTask, getAllTasks };
