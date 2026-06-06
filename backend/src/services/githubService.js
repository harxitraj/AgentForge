const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const parseRepoUrl = (repoUrl) => {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    return {
        owner: match[1],
        repo: match[2].replace('.git', '')
    };
};

const createBranch = async (repoUrl, branchName) => {
    const { owner, repo } = parseRepoUrl(repoUrl);

    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: refData } = await octokit.git.getRef({
        owner, repo,
        ref: `heads/${defaultBranch}`
    });

    await octokit.git.createRef({
        owner, repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha
    });

    return defaultBranch;
};

const pushFiles = async (repoUrl, branchName, files, commitMessage) => {
    const { owner, repo } = parseRepoUrl(repoUrl);

    for (const file of files) {
        let sha = undefined;
        try {
            const { data } = await octokit.repos.getContent({
                owner, repo,
                path: file.path,
                ref: branchName
            });
            sha = data.sha;
        } catch (e) {
            // File does not exist yet — creating fresh
        }

        await octokit.repos.createOrUpdateFileContents({
            owner, repo,
            path: file.path,
            message: commitMessage,
            content: Buffer.from(file.content).toString('base64'),
            branch: branchName,
            ...(sha && { sha })
        });
    }
};

const createPR = async (repoUrl, branchName, baseBranch, title, description) => {
    const { owner, repo } = parseRepoUrl(repoUrl);

    const { data } = await octokit.pulls.create({
        owner, repo,
        title,
        body: description,
        head: branchName,
        base: baseBranch
    });

    return data.html_url;
};

module.exports = { parseRepoUrl, createBranch, pushFiles, createPR };
