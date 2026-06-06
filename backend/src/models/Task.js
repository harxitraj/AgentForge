const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    repoUrl: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'cloning', 'running', 'completed', 'failed'],
        default: 'queued'
    },
    aiProvider: {
        type: String,
        default: null
    },
    branchName: {
        type: String,
        default: null
    },
    prUrl: {
        type: String,
        default: null
    },
    logs: [{ type: String }],
    error: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
