const mongoose = require('mongoose');

const repoSchema = new mongoose.Schema({
    repoUrl: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: String,
        required: true
    },
    repoName: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Repo', repoSchema);
