const express = require('express');
const router = express.Router();
const { createTask, getTask, getAllTasks } = require('../controllers/agentController');

router.post('/task', createTask);
router.get('/task/:taskId', getTask);
router.get('/tasks', getAllTasks);

module.exports = router;
