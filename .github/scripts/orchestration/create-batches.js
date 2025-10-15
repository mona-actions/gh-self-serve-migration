module.exports = async ({ context, core }) => {
    const reposInput = process.env.REPOS.trim();
    
    let repos;
    
    // Check if input is JSON array or text
    if (reposInput.startsWith('[')) {
        // Input is JSON array
        console.log('Parsing repos from JSON array');
        repos = JSON.parse(reposInput);
    } else {
        // Input is text with newlines
        console.log('Parsing repos from text');
        const cleanedText = reposInput
            .replace(/<details[^>]*>/gi, '')
            .replace(/<\/details>/gi, '')
            .replace(/<summary[^>]*>/gi, '')
            .replace(/<\/summary>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');

        repos = cleanedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (!line) return false;
                if (line.includes('<') && line.includes('>')) return false;
                if (line.startsWith('#') && !line.includes('://')) return false;
                return line.includes('://') || line.includes('github.');
            });
    }

    console.log(`Total repositories: ${repos.length}`);

    const batchSize = parseInt(process.env.BATCH_SIZE) || 5;
    const batchCount = Math.ceil(repos.length / batchSize);
    const batches = [];

    for (let i = 0; i < batchCount; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, repos.length);
        const batch = repos.slice(start, end);

        const batchData = {
            batchNumber: i + 1,
            repositories: batch,
            migrationId: process.env.MIGRATION_ID,
            issueNumber: context.issue.number,
            migrationType: process.env.MIGRATION_TYPE,
            sourceOrganization: process.env.SOURCE_ORG,
            targetOrganization: process.env.TARGET_ORG,
            sourceInstance: process.env.SOURCE_INSTANCE,
            targetInstance: process.env.TARGET_INSTANCE,
            targetRepositoryVisibility: process.env.VISIBILITY,
            installPrereqs: process.env.INSTALL_PREREQS,
            batchId: `batch-${i + 1}-${Date.now()}`,
            totalBatches: batchCount,
            totalRepos: repos.length
        };

        batches.push(batchData);
    }

    core.setOutput('batches', JSON.stringify(batches));
    core.setOutput('batch_count', batchCount);
    core.setOutput('total_repos', repos.length);
    console.log(`Created ${batchCount} batches for ${repos.length} repositories`);
};