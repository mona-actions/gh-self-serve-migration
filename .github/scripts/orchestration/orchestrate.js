module.exports = async ({ github, context }) => {
    const fs = require('fs');
    const batches = JSON.parse(process.env.BATCHES);

    // Resolve target token from TARGET_INSTANCE
    const targetInstance = process.env.TARGET_INSTANCE;
    const config = JSON.parse(fs.readFileSync('.github/scripts/config/instances.json', 'utf8'));
    const targetConfig = config.targets[targetInstance];
    
    if (!targetConfig) {
        throw new Error(`Unknown target instance: ${targetInstance}`);
    }
    
    const targetTokenName = targetConfig.tokenSecret;
    const targetToken = process.env[targetTokenName];
    
    if (!targetToken) {
        throw new Error(`Token ${targetTokenName} not found for target instance ${targetInstance}`);
    }
    
    console.log(`Using token ${targetTokenName} for target instance ${targetInstance}`);

    // Function to check if workflow is being cancelled
    async function isWorkflowCancelled() {
        try {
            const { data: currentRun } = await github.rest.actions.getWorkflowRun({
                owner: context.repo.owner,
                repo: context.repo.repo,
                run_id: context.runId
            });

            return currentRun.status === 'cancelled' || currentRun.conclusion === 'cancelled';
        } catch (error) {
            console.log('Error checking cancellation status:', error.message);
            return false;
        }
    }

    // Function to check for cancel command in issue comments
    async function hasCancelCommand(issueNumber, sinceTime) {
        try {
            const comments = await github.rest.issues.listComments({
                issue_number: issueNumber,
                owner: context.repo.owner,
                repo: context.repo.repo,
                since: sinceTime.toISOString()
            });

            return comments.data.some(comment => {
                // Skip bot comments (they might contain instructions with /cancel-migration)
                if (comment.user.type === 'Bot' || comment.user.login === 'github-actions[bot]') {
                    return false;
                }

                // This avoids matching when /cancel-migration is just mentioned in text
                const trimmedBody = comment.body.trim();
                return trimmedBody === '/cancel-migration' ||
                    trimmedBody.startsWith('/cancel-migration\n') ||
                    trimmedBody.startsWith('/cancel-migration ');
            });
        } catch (error) {
            console.log('Error checking for cancel command:', error.message);
            return false;
        }
    }

    // Function to cancel all running batch workflows
    async function cancelRunningBatches(fromBatchNumber) {
        console.log(`Cancelling all running workflows from batch ${fromBatchNumber} onwards...`);

        try {
            const runs = await github.rest.actions.listWorkflowRuns({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'batch-processor.yml',
                event: 'repository_dispatch',
                status: 'queued'
            });

            const inProgressRuns = await github.rest.actions.listWorkflowRuns({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'batch-processor.yml',
                event: 'repository_dispatch',
                status: 'in_progress'
            });

            const allRuns = [...runs.data.workflow_runs, ...inProgressRuns.data.workflow_runs];

            for (const run of allRuns) {
                await github.rest.actions.cancelWorkflowRun({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    run_id: run.id
                });
                console.log(`Cancelled workflow run ${run.id}`);
            }
        } catch (error) {
            console.log('Error cancelling batch workflows:', error.message);
        }
    }

    // Function to find workflow run by batch ID
    async function findWorkflowByBatchId(batchId) {
        try {
            // Get recent workflow runs
            const runs = await github.rest.actions.listWorkflowRuns({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'batch-processor.yml',
                event: 'repository_dispatch',
                per_page: 20
            });

            // Find the run with our batch ID in the name
            const targetRun = runs.data.workflow_runs.find(run =>
                run.name && run.name.includes(`ID:${batchId}`)
            );

            return targetRun;
        } catch (error) {
            console.log('Error finding workflow by batch ID:', error.message);
            return null;
        }
    }

    const startTime = new Date();
    console.log(`Starting orchestration at ${startTime.toISOString()}`);
    console.log(`Will check for cancellation commands issued after this time only`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = batch.batchNumber;
        const batchId = batch.batchId;
        const dispatchTime = new Date();

        // CHECK FOR CANCELLATION BEFORE EACH BATCH
        const workflowCancelled = await isWorkflowCancelled();
        const hasCancel = await hasCancelCommand(batch.issueNumber, startTime);

        console.log(`Batch ${batchNumber} - Workflow cancelled: ${workflowCancelled}, Cancel command found: ${hasCancel}`);

        if (workflowCancelled || hasCancel) {
            console.log('Cancellation detected! Stopping batch processing...');

            await github.rest.issues.createComment({
                issue_number: batch.issueNumber,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `### 🛑 Migration Cancelled

**Stopped at:** Batch ${batchNumber} of ${batches.length}

| Status | Count |
|--------|-------|
| ✅ Completed batches | ${i} |
| ⏭️ Remaining batches | ${batches.length - i} |
| 🔄 Currently running | Will complete |

> **Note:** Any migrations currently in progress will continue to completion. Check the [Actions tab](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions) for running workflows.`
            });

            await cancelRunningBatches(batchNumber);
            process.exit(0);
        }

        console.log(`\n=== Dispatching Batch ${batchNumber} of ${batches.length} ===`);
        console.log(`Batch ID: ${batchId}`);
        console.log(`Repositories: ${batch.repositories.length}`);

        // Post batch start comment
        await github.rest.issues.createComment({
            issue_number: batch.issueNumber,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `### 🚀 Batch ${batchNumber} of ${batches.length} Starting

📦 **Repositories in this batch:** ${batch.repositories.length}
🔄 **Migration type:** ${batch.migrationType}
🎯 **Target organization:** \`${batch.targetOrganization}\`

<details>
<summary><b>📋 Repositories being migrated</b></summary>

${batch.repositories.map((repo, index) => `${index + 1}. \`${repo}\``).join('\n')}

</details>

---

**[📊 Track batch progress →](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions?query=event%3Arepository_dispatch)**`
        });

        // Dispatch the batch workflow
        try {
            const dispatchPayload = {
                event_type: 'migration-batch',
                client_payload: {
                    batch: batch,
                    orchestrator_run_id: context.runId
                }
            };

            console.log('Dispatching batch with ID:', batchId);

            // Use fetch directly instead of octokit
            const response = await fetch(`https://api.github.com/repos/${context.repo.owner}/${context.repo.repo}/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${targetToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'GitHub Actions'
                },
                body: JSON.stringify(dispatchPayload)
            });

            if (response.ok) {
                console.log(`Successfully dispatched batch ${batchNumber} with ID ${batchId}`);
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

        } catch (error) {
            console.log(`Failed to dispatch batch ${batchNumber}: ${error.message}`);

            // Post failure comment
            await github.rest.issues.createComment({
                issue_number: batch.issueNumber,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `### ❌ Failed to Dispatch Batch ${batchNumber}

**Error:** ${error.message}

<details>
<summary><b>🔧 Troubleshooting Steps</b></summary>

1. Check your GitHub token permissions
2. Verify the repository dispatch settings
3. Try manually triggering the workflow with this batch data
4. Check the [Actions settings](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/settings/actions)

</details>

**💡 Workaround:** Manually trigger the migration-batch-processor workflow with batch data.`
            });

            // Continue with next batch instead of failing completely
            continue;
        }

        // WAIT FOR THIS SPECIFIC BATCH TO COMPLETE
        console.log(`Waiting for batch ${batchNumber} (ID: ${batchId}) to complete...`);
        let batchCompleted = false;
        let completedRun = null;
        let attempts = 0;
        const maxAttempts = 1440; // 12 hours (30-second intervals)
        let foundWorkflow = false;

        // Initial wait for workflow to be created
        console.log('Waiting 20 seconds for workflow to be created...');
        await new Promise(resolve => setTimeout(resolve, 20000));

        while (!batchCompleted && attempts < maxAttempts) {
            attempts++;

            // Check for cancellation every 5 iterations (2.5 minutes)
            if (attempts % 5 === 0) {
                const workflowCancelled = await isWorkflowCancelled();
                const hasCancel = await hasCancelCommand(batch.issueNumber, startTime);

                if (workflowCancelled || hasCancel) {
                    console.log('Cancellation detected during batch wait!');

                    await github.rest.issues.createComment({
                        issue_number: batch.issueNumber,
                        owner: context.repo.owner,
                        repo: context.repo.repo,
                        body: `### 🛑 Migration Cancelled During Batch ${batchNumber}

**Status:** Batch was in progress when cancellation was requested

> **Note:** Currently running migrations in this batch will continue to completion. Check the [Actions tab](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions) for details.`
                    });

                    await cancelRunningBatches(batchNumber);
                    process.exit(0);
                }
            }

            // Wait 30 seconds before checking
            await new Promise(resolve => setTimeout(resolve, 30000));

            // Find the workflow run by batch ID
            const workflowRun = await findWorkflowByBatchId(batchId);

            if (workflowRun) {
                foundWorkflow = true;

                // Debug logging
                if (attempts % 10 === 0 || attempts === 1) {
                    console.log(`Batch ${batchNumber} workflow status: ${workflowRun.status}, conclusion: ${workflowRun.conclusion}`);
                }

                // Check if completed
                if (workflowRun.status === 'completed') {
                    completedRun = workflowRun;
                    batchCompleted = true;
                    console.log(`Batch ${batchNumber} completed with conclusion: ${workflowRun.conclusion}`);
                    console.log(`Workflow URL: ${workflowRun.html_url}`);
                }
            } else {
                // Workflow not found yet
                if (!foundWorkflow && attempts > 6) {
                    console.log(`WARNING: Workflow for batch ${batchNumber} (ID: ${batchId}) not found after ${attempts * 30} seconds`);
                    if (attempts > 10) {
                        console.log(`ERROR: Workflow not found after 5+ minutes. Moving to next batch.`);
                        batchCompleted = true;
                    }
                }
            }

            // Status logging
            if (!batchCompleted && attempts % 20 === 0) { // Every 10 minutes
                const minutes = Math.round(attempts * 30 / 60);
                const status = foundWorkflow ?
                    `workflow ${workflowRun.status}` :
                    'waiting for workflow to start';
                console.log(`Batch ${batchNumber} still running... (${minutes} minutes, ${status})`);

                if (attempts % 120 === 0) { // Every 60 minutes
                    await github.rest.issues.createComment({
                        issue_number: batch.issueNumber,
                        owner: context.repo.owner,
                        repo: context.repo.repo,
                        body: `### ⏳ Batch ${batchNumber} Still Processing

**Elapsed time:** ${minutes} minutes
**Status:** ${status}

<details>
<summary><b>Why is this taking so long?</b></summary>

Large repositories or those with extensive history may take longer to migrate. This is normal for:
- Repositories with many commits
- Repositories with large files or Git LFS
- Network latency between source and target

</details>

💡 **Tip:** You can cancel this migration by commenting \`/cancel-migration\` (as a standalone command, not in a sentence)`
                    });
                }
            }
        }

        // Post completion comment
        if (completedRun) {
            const statusIcon = completedRun.conclusion === 'success' ? '✅' : '❌';
            const statusEmoji = completedRun.conclusion === 'success' ? '🎉' : '⚠️';
            const duration = Math.round((new Date() - dispatchTime) / 60000);

            await github.rest.issues.createComment({
                issue_number: batch.issueNumber,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `### ${statusIcon} Batch ${batchNumber} of ${batches.length} Complete

${statusEmoji} **Status:** ${completedRun.conclusion.toUpperCase()}
⏱️ **Duration:** ${duration} minutes
🔗 **[View detailed results →](${completedRun.html_url})**

${batchNumber < batches.length ? `\n📥 **Next:** Preparing batch ${batchNumber + 1}...\n` : '\n🏁 **This was the final batch!**\n'}`
            });
        } else if (batchCompleted) {
            // Completed without finding a specific run
            await github.rest.issues.createComment({
                issue_number: batch.issueNumber,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `### ⚠️ Batch ${batchNumber} Status Unknown

The batch workflow could not be tracked properly.

**Batch ID:** \`${batchId}\`

<details>
<summary><b>🔍 Troubleshooting Steps</b></summary>

1. Check the [Actions tab](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions) for any running workflows
2. Look for a workflow named "Migration Batch ${batchNumber} - ID:${batchId}"
3. If found, wait for it to complete
4. If not found, the batch may need to be re-run manually

</details>

${batchNumber < batches.length ? `\n⏭️ **Continuing to next batch...**` : ''}`
            });
        } else {
            // Timed out
            console.log(`WARNING: Batch ${batchNumber} timed out after 12 hours`);
            await github.rest.issues.createComment({
                issue_number: batch.issueNumber,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `### ⚠️ Batch ${batchNumber} Timed Out

The batch exceeded the maximum wait time of 12 hours.

**What this means:**
- The batch may still be running
- The workflow tracking timed out
- Migration will continue with the next batch

**Action required:** Check the [Actions tab](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions) for the actual status.

${batchNumber < batches.length ? `⏭️ **Proceeding to batch ${batchNumber + 1}...**` : '🏁 **This was the final batch.**'}`
            });
        }

        // Short delay before next batch
        if (i < batches.length - 1) {
            console.log('Waiting 30 seconds before starting next batch...');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    console.log('\n=== All Batches Dispatched ===');
}