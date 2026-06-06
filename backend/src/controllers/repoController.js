const Repo = require('../models/Repo');

const linkRepo = async (req, res) => {
    try {
        const { repoUrl } = req.body;
        if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });

        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) return res.status(400).json({ error: 'Invalid GitHub repository URL' });

        const repo = await Repo.findOneAndUpdate(
            { repoUrl },
            { repoUrl, owner: match[1], repoName: match[2].replace('.git', '') },
            { upsert: true, new: true }
        );

        res.status(201).json(repo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const listRepos = async (req, res) => {
    try {
        const repos = await Repo.find().sort({ createdAt: -1 });
        res.json(repos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { linkRepo, listRepos };
