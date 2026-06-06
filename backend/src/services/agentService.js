const Task = require('../models/Task');
const { generateCode } = require('./aiService');
const { createBranch, pushFiles, createPR, parseRepoUrl } = require('./githubService');
const { runSandbox } = require('./dockerService');

const runTask = async (taskId, io) => {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');

    await Task.findByIdAndUpdate(taskId, {
        aiProvider: process.env.AI_PROVIDER || 'claude'
    });

    const emitLog = async (message) => {
        console.log(`[Task ${taskId}] ${message}`);
        await Task.findByIdAndUpdate(taskId, { $push: { logs: message } });
        io.emit('agent:log', { taskId, message });
    };

    const emitStatus = async (status) => {
        await Task.findByIdAndUpdate(taskId, { status });
        io.emit('agent:status', { taskId, status });
    };

    try {
        // ── Step 1: Get repo info ──────────────────────────────
        const { owner, repo } = parseRepoUrl(task.repoUrl);
        await emitLog(`Task started for repository: ${owner}/${repo}`);

        // ── Step 2: Call AI to generate code ──────────────────
        await emitStatus('running');
        const providerName = process.env.AI_PROVIDER || 'claude';
        await emitLog(`Calling ${providerName} to analyze task and generate code...`);

        const repoContext = `Owner: ${owner}, Repository: ${repo}, URL: ${task.repoUrl}`;
        const agentOutput = await generateCode(task.prompt, repoContext);

        await emitLog(`AI generated ${agentOutput.files.length} file(s).`);
        agentOutput.files.forEach(f => emitLog(`  → ${f.action}: ${f.path}`));
        await emitLog(`Commit message: "${agentOutput.commitMessage}"`);

        // ── Step 3: Run sandbox — clone repo and write files ──
        await emitStatus('cloning');
        await emitLog('Launching sandbox environment...');

        await runSandbox(
            taskId,
            task.repoUrl,
            agentOutput.files,
            emitLog
        );

        // ── Step 4: Create branch on GitHub ───────────────────
        await emitStatus('running');
        const branchName = `agentforge/task-${taskId.toString().slice(-6)}-${Date.now()}`;
        await emitLog(`Creating branch: ${branchName}`);

        const baseBranch = await createBranch(task.repoUrl, branchName);
        await Task.findByIdAndUpdate(taskId, { branchName });
        await emitLog(`Branch created from: ${baseBranch}`);

        // ── Step 5: Push AI generated files to GitHub ─────────
        await emitLog(`Pushing ${agentOutput.files.length} file(s) to GitHub...`);
        await pushFiles(
            task.repoUrl,
            branchName,
            agentOutput.files,
            agentOutput.commitMessage
        );
        await emitLog('Files pushed to GitHub successfully.');

        // ── Step 6: Create Pull Request ───────────────────────
        await emitLog('Creating Pull Request...');
        const prUrl = await createPR(
            task.repoUrl,
            branchName,
            baseBranch,
            agentOutput.prTitle,
            agentOutput.prDescription
        );

        await Task.findByIdAndUpdate(taskId, {
            prUrl,
            status: 'completed'
        });

        await emitLog(`Pull Request created successfully.`);
        await emitLog(`PR URL: ${prUrl}`);
        await emitStatus('completed');

    } catch (error) {
        await emitLog(`Task failed: ${error.message}`);
        await Task.findByIdAndUpdate(taskId, {
            status: 'failed',
            error: error.message
        });
        io.emit('agent:status', { taskId, status: 'failed' });
    }
};

module.exports = { runTask };
