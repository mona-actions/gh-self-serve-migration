module.exports = async ({ github, context, core }) => {
    const issueNumber = context.issue.number;
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    // Get all comments from the issue
    const comments = await github.rest.issues.listComments({
        issue_number: issueNumber,
        owner: context.repo.owner,
        repo: context.repo.repo,
        since: startTime.toISOString(),
        per_page: 100
    });

    // Parse comments to find LFS, packages, releases, variables/secrets, and environments migrations
    const features = {
        lfs: { started: [], completed: [], failed: [] },
        packages: { started: [], completed: [], failed: [] },
        releases: { started: [], completed: [], failed: [] },
        variablesSecrets: { started: [], completed: [], failed: [] },
        environments: { started: [], completed: [], failed: [] }
    };

    comments.data.forEach(comment => {
        const body = comment.body;

        // Check for LFS migrations
        if (body.includes('LFS Migration')) {
            const repoMatch = body.match(/\*\*Repository:\*\* `([^`]+)`/);
            const repo = repoMatch ? repoMatch[1] : 'unknown';

            if (body.includes('LFS Migration Starting')) {
                features.lfs.started.push(repo);
            } else if (body.includes('✅ LFS Migration completed successfully')) {
                features.lfs.completed.push(repo);
            } else if (body.includes('❌ LFS Migration failed')) {
                features.lfs.failed.push(repo);
            }
        }

        // Check for Package migrations
        if (body.includes('Package Migration')) {
            const repoMatch = body.match(/\*\*Repository:\*\* `([^`]+)`/);
            const repo = repoMatch ? repoMatch[1] : 'unknown';

            if (body.includes('Package Migration Starting')) {
                features.packages.started.push(repo);
            } else if (body.includes('✅ Package Migration completed successfully')) {
                features.packages.completed.push(repo);
            } else if (body.includes('❌ Package Migration failed')) {
                features.packages.failed.push(repo);
            }
        }

        // Check for Releases migrations
        if (body.includes('Releases Migration')) {
            const repoMatch = body.match(/\*\*Repository:\*\* `([^`]+)`/);
            const repo = repoMatch ? repoMatch[1] : 'unknown';

            if (body.includes('Releases Migration Starting')) {
                features.releases.started.push(repo);
            } else if (body.includes('✅ Releases Migration completed successfully')) {
                features.releases.completed.push(repo);
            } else if (body.includes('❌ Releases Migration failed')) {
                features.releases.failed.push(repo);
            }
        }

        // Check for Variables/Secrets migrations
        if (body.includes('Variables/Secrets Migration')) {
            const repoMatch = body.match(/\*\*Repository:\*\* `([^`]+)`/);
            const repo = repoMatch ? repoMatch[1] : 'unknown';

            if (body.includes('Variables/Secrets Migration Starting')) {
                features.variablesSecrets.started.push(repo);
            } else if (body.includes('✅ Variables/Secrets Migration completed successfully')) {
                features.variablesSecrets.completed.push(repo);
            } else if (body.includes('⚠️ Variables/Secrets Migration completed with warnings')) {
                // Count partial success as completed but track separately if needed
                features.variablesSecrets.completed.push(repo);
            } else if (body.includes('❌ Variables/Secrets Migration failed')) {
                features.variablesSecrets.failed.push(repo);
            }
        }

        // Check for Environments migrations
        if (body.includes('Environments Migration')) {
            const repoMatch = body.match(/\*\*Repository:\*\* `([^`]+)`/);
            const repo = repoMatch ? repoMatch[1] : 'unknown';

            if (body.includes('Environments Migration Starting')) {
                features.environments.started.push(repo);
            } else if (body.includes('✅ Environments Migration completed successfully')) {
                features.environments.completed.push(repo);
            } else if (body.includes('⚠️ Environments Migration completed with errors')) {
                // Count partial success as completed but track separately if needed
                features.environments.completed.push(repo);
            } else if (body.includes('❌ Environments Migration failed')) {
                features.environments.failed.push(repo);
            }
        }
    });

    // Generate summary
    let summaryBody = `## 📊 Special Features Migration Summary\n\n`;
    let hasAnyFeatures = false;

    // Variables/Secrets Summary
    if (features.variablesSecrets.started.length > 0) {
        hasAnyFeatures = true;
        summaryBody += `### 🔐 Variables/Secrets Migrations\n`;
        summaryBody += `| Status | Count | Repositories |\n`;
        summaryBody += `|--------|-------|-------------|\n`;
        summaryBody += `| ✅ Completed | ${features.variablesSecrets.completed.length} | ${features.variablesSecrets.completed.join(', ') || 'None'} |\n`;
        summaryBody += `| ❌ Failed | ${features.variablesSecrets.failed.length} | ${features.variablesSecrets.failed.join(', ') || 'None'} |\n`;
        summaryBody += `| ⏳ In Progress | ${features.variablesSecrets.started.length - features.variablesSecrets.completed.length - features.variablesSecrets.failed.length} | - |\n\n`;

        // Add note about manual secret updates
        if (features.variablesSecrets.completed.length > 0) {
            summaryBody += `> **Note:** Placeholder secrets have been created. Please update them with actual values in the target repositories.\n\n`;
        }
    }

    // LFS Summary
    if (features.lfs.started.length > 0) {
        hasAnyFeatures = true;
        summaryBody += `### 📦 Git LFS Migrations\n`;
        summaryBody += `| Status | Count | Repositories |\n`;
        summaryBody += `|--------|-------|-------------|\n`;
        summaryBody += `| ✅ Completed | ${features.lfs.completed.length} | ${features.lfs.completed.join(', ') || 'None'} |\n`;
        summaryBody += `| ❌ Failed | ${features.lfs.failed.length} | ${features.lfs.failed.join(', ') || 'None'} |\n`;
        summaryBody += `| ⏳ In Progress | ${features.lfs.started.length - features.lfs.completed.length - features.lfs.failed.length} | - |\n\n`;
    }

    // Packages Summary
    if (features.packages.started.length > 0) {
        hasAnyFeatures = true;
        summaryBody += `### 📦 Package Migrations\n`;
        summaryBody += `| Status | Count | Repositories |\n`;
        summaryBody += `|--------|-------|-------------|\n`;
        summaryBody += `| ✅ Completed | ${features.packages.completed.length} | ${features.packages.completed.join(', ') || 'None'} |\n`;
        summaryBody += `| ❌ Failed | ${features.packages.failed.length} | ${features.packages.failed.join(', ') || 'None'} |\n`;
        summaryBody += `| ⏳ In Progress | ${features.packages.started.length - features.packages.completed.length - features.packages.failed.length} | - |\n\n`;
    }

    // Releases Summary
    if (features.releases.started.length > 0) {
        hasAnyFeatures = true;
        summaryBody += `### 🏷️ Releases Migrations\n`;
        summaryBody += `| Status | Count | Repositories |\n`;
        summaryBody += `|--------|-------|-------------|\n`;
        summaryBody += `| ✅ Completed | ${features.releases.completed.length} | ${features.releases.completed.join(', ') || 'None'} |\n`;
        summaryBody += `| ❌ Failed | ${features.releases.failed.length} | ${features.releases.failed.join(', ') || 'None'} |\n`;
        summaryBody += `| ⏳ In Progress | ${features.releases.started.length - features.releases.completed.length - features.releases.failed.length} | - |\n\n`;
    }

    // Environments Summary
    if (features.environments.started.length > 0) {
        hasAnyFeatures = true;
        summaryBody += `### 🌍 Environments Migrations\n`;
        summaryBody += `| Status | Count | Repositories |\n`;
        summaryBody += `|--------|-------|-------------|\n`;
        summaryBody += `| ✅ Completed | ${features.environments.completed.length} | ${features.environments.completed.join(', ') || 'None'} |\n`;
        summaryBody += `| ❌ Failed | ${features.environments.failed.length} | ${features.environments.failed.join(', ') || 'None'} |\n`;
        summaryBody += `| ⏳ In Progress | ${features.environments.started.length - features.environments.completed.length - features.environments.failed.length} | - |\n\n`;
    }

    // Calculate totals
    if (hasAnyFeatures) {
        const totalStarted = features.variablesSecrets.started.length +
            features.lfs.started.length +
            features.packages.started.length +
            features.releases.started.length +
            features.environments.started.length;

        const totalCompleted = features.variablesSecrets.completed.length +
            features.lfs.completed.length +
            features.packages.completed.length +
            features.releases.completed.length +
            features.environments.completed.length;

        const totalFailed = features.variablesSecrets.failed.length +
            features.lfs.failed.length +
            features.packages.failed.length +
            features.releases.failed.length +
            features.environments.failed.length;

        summaryBody += `---\n\n`;
        summaryBody += `### 📈 Overall Summary\n\n`;
        summaryBody += `| Feature | Started | Completed | Failed |\n`;
        summaryBody += `|---------|---------|-----------|--------|\n`;
        summaryBody += `| Variables/Secrets | ${features.variablesSecrets.started.length} | ${features.variablesSecrets.completed.length} | ${features.variablesSecrets.failed.length} |\n`;
        summaryBody += `| Git LFS | ${features.lfs.started.length} | ${features.lfs.completed.length} | ${features.lfs.failed.length} |\n`;
        summaryBody += `| Packages | ${features.packages.started.length} | ${features.packages.completed.length} | ${features.packages.failed.length} |\n`;
        summaryBody += `| Releases | ${features.releases.started.length} | ${features.releases.completed.length} | ${features.releases.failed.length} |\n`;
        summaryBody += `| Environments | ${features.environments.started.length} | ${features.environments.completed.length} | ${features.environments.failed.length} |\n`;
        summaryBody += `| **Total** | **${totalStarted}** | **${totalCompleted}** | **${totalFailed}** |\n\n`;

        // Add completion rate
        const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;
        summaryBody += `**Completion Rate:** ${completionRate}% (${totalCompleted}/${totalStarted})\n`;
    }

    // Post summary if any special features were migrated
    if (hasAnyFeatures) {
        await github.rest.issues.createComment({
            issue_number: issueNumber,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: summaryBody
        });

        return true;
    }

    return false;
};