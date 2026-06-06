const Docker = require('dockerode');
const path = require('path');

const docker = new Docker({ socketPath: '//./pipe/dockerDesktopLinuxEngine' });

const runSandbox = async (taskId, repoUrl, generatedFiles, onLog) => {
    onLog('Creating sandbox environment...');

    const containerName = `agentforge-${taskId}`;

    // Build the shell script that runs inside the container
    // Step 1: clone the repo
    // Step 2: write each generated file into the cloned repo
    // Step 3: verify files are written
    const writeFileCommands = generatedFiles.map(file => {
        // Create directory if needed and write file content
        const dir = path.posix.dirname(file.path);
        const escapedContent = file.content
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "'\\''");
        return `mkdir -p /workspace/${dir} && cat > /workspace/${file.path} << 'AGENTFORGE_EOF'
${file.content}
AGENTFORGE_EOF`;
    }).join('\n');

    const shellScript = `
set -e
echo "=== Cloning repository ==="
git clone https://x-access-token:${process.env.GITHUB_TOKEN}@${repoUrl.replace('https://', '')} /workspace
echo "=== Repository cloned successfully ==="
cd /workspace
echo "=== Writing AI generated files ==="
${writeFileCommands}
echo "=== All files written successfully ==="
echo "=== Verifying files ==="
${generatedFiles.map(f => `ls -la /workspace/${f.path} && echo "Verified: ${f.path}"`).join('\n')}
echo "=== Sandbox task complete ==="
`;

    let container;
    try {
        container = await docker.createContainer({
            Image: 'agentforge-sandbox',
            Cmd: ['sh', '-c', shellScript],
            WorkingDir: '/',
            HostConfig: {
                Memory: 512 * 1024 * 1024,
                NetworkMode: 'bridge',
                AutoRemove: false
            },
            name: containerName
        });

        await container.start();
        onLog('Sandbox started. Cloning repository...');

        // Stream logs from container
        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true
        });

        await new Promise((resolve, reject) => {
            logStream.on('data', (chunk) => {
                const text = chunk
                    .toString('utf8')
                    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
                    .trim();
                if (text) onLog(text);
            });
            logStream.on('end', resolve);
            logStream.on('error', reject);
        });

        // Wait for container to finish
        await container.wait();
        onLog('Sandbox task completed successfully.');

    } finally {
        // Always cleanup the container
        if (container) {
            try {
                await container.remove({ force: true });
                onLog('Sandbox environment destroyed.');
            } catch (e) {
                // Container may have already been removed
            }
        }
    }
};

module.exports = { runSandbox };
