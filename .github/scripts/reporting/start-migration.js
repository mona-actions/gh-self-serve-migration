module.exports = async ({ github, context }) => {
    const migrationType = process.env.MIGRATION_TYPE;
    const batchCount = process.env.BATCH_COUNT;
    const batchSize = process.env.BATCH_SIZE;
    const totalRepos = process.env.TOTAL_REPOS;
    const targetOrg = process.env.TARGET_ORG;
    
    const isDryRun = migrationType === 'dry-run';
    const typeEmoji = isDryRun ? '🧪' : '🚀';
    const typeTitle = isDryRun ? 'Dry-Run' : 'Production';
    
    let body = `# ${typeEmoji} ${typeTitle} Migration Starting!\n\n`;
    
    // Status box
    body += `> ### 📋 Migration Configuration\n`;
    body += `> **Type:** ${typeTitle} Migration\n`;
    body += `> **Target Organization:** \`${targetOrg}\`\n`;
    body += `> **Total Repositories:** ${totalRepos}\n`;
    body += `> **Total Batches:** ${batchCount}\n`;
    body += `> **Batch Size:** Up to ${batchSize} repositories per batch\n`;
    body += `> **Processing:** Sequential (one batch at a time)\n`;
    body += `> **Status:** 🟢 Initializing...\n\n`;
    
    body += `---\n\n`;
    
    // Progress tracking section
    body += `## 📊 Track Progress\n\n`;
    body += `Monitor your migration in real-time through these links:\n\n`;
    body += `| Link | Description |\n`;
    body += `|------|-------------|\n`;
    body += `| 🔗 **[Live Progress](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})** | Watch this migration run |\n`;
    body += `| 📈 **[All Batches](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions?query=event%3Arepository_dispatch)** | View individual batch workflows |\n`;
    body += `| 💬 **[This Issue](#${context.issue.number})** | Migration updates will appear here |\n\n`;
    
    body += `---\n\n`;
    
    // What to expect section
    body += `## 🎯 What to Expect\n\n`;
    
    if (isDryRun) {
        body += `### This is a Test Migration\n\n`;
        body += `**What WILL happen:**\n`;
        body += `- ✅ Repositories will be validated\n`;
        body += `- ✅ Test repositories created with \`-dry-run\` suffix\n`;
        body += `- ✅ Issues and errors will be identified\n`;
        body += `- ✅ Full migration process will be simulated\n\n`;
        
        body += `**What WON'T happen:**\n`;
        body += `- ❌ Source repositories will NOT be locked\n`;
        body += `- ❌ Production data will NOT be affected\n`;
        body += `- ❌ Users can continue working normally\n\n`;
        
        body += `> 💡 **Tip:** This is the perfect time to verify your migration setup!\n\n`;
    } else {
        body += `### This is a Production Migration\n\n`;
        body += `**⚠️ Important: Production Impact**\n\n`;
        body += `**What WILL happen:**\n`;
        body += `- 🔒 Source repositories WILL be locked\n`;
        body += `- 📦 All repository data will be migrated\n`;
        body += `- 👥 Contributors will be mapped\n`;
        body += `- 🏷️ Issues, PRs, and metadata will transfer\n\n`;
        
        body += `**Impact on users:**\n`;
        body += `- ⛔ Users cannot push to source repos during migration\n`;
        body += `- ⏱️ Each repository may be locked for 10-15 minutes\n`;
        body += `- 📧 Ensure your team has been notified\n\n`;
        
        body += `> ⚠️ **Warning:** Only proceed if you've completed a successful dry-run!\n\n`;
    }
    
    body += `---\n\n`;
    
    // Timeline section with realistic estimates
    body += `## ⏱️ Estimated Timeline\n\n`;
    
    const reposPerBatch = Math.min(parseInt(batchSize), parseInt(totalRepos));
    
    // Updated realistic estimates based on actual observations
    const estimatedMinutesPerRepo = isDryRun ? 8 : 10;  // 8 min for dry-run, 10 min for production
    
    // For parallel processing within a batch (max-parallel: 10)
    const parallelFactor = Math.min(10, reposPerBatch);
    const estimatedMinutesPerBatch = Math.ceil((reposPerBatch / parallelFactor) * estimatedMinutesPerRepo);
    const totalEstimatedMinutes = estimatedMinutesPerBatch * parseInt(batchCount);
    
    // Add buffer for overhead (setup, teardown, reporting)
    const overheadMinutes = parseInt(batchCount) * 2;  // 2 minutes overhead per batch
    const totalWithOverhead = totalEstimatedMinutes + overheadMinutes;
    
    body += `Based on ${totalRepos} repositories in ${batchCount} batch${batchCount !== '1' ? 'es' : ''}:\n\n`;
    body += `| Phase | Estimated Time |\n`;
    body += `|-------|---------------|\n`;
    body += `| Per Repository | ~${estimatedMinutesPerRepo} minutes |\n`;
    body += `| Per Batch (${Math.min(parallelFactor, reposPerBatch)} parallel) | ~${estimatedMinutesPerBatch} minutes |\n`;
    body += `| Setup/Reporting | ~${overheadMinutes} minutes total |\n`;
    body += `| **Total Migration** | **~${totalWithOverhead} minutes** (${(totalWithOverhead/60).toFixed(1)} hours) |\n\n`;
    
    // Add notes about timing variability
    body += `> ⏱️ **Note: Times vary based on:**\n`;
    body += `> - Repository size and history depth\n`;
    body += `> - Number of issues, PRs, and releases\n`;
    body += `> - Network conditions and API rate limits\n`;
    body += `> - Git LFS data and package migrations\n\n`;
    
    body += `---\n\n`;
    
    // Control section
    body += `## 🎮 Migration Controls\n\n`;
    body += `### Need to Cancel?\n\n`;
    body += `You have two options to stop this migration:\n\n`;
    body += `1. **Via GitHub Actions UI:**\n`;
    body += `   - Click [here](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})\n`;
    body += `   - Click the "Cancel workflow" button\n\n`;
    body += `2. **Via Issue Comment:**\n`;
    body += `   \`\`\`\n   /cancel-migration\n   \`\`\`\n\n`;
    
    body += `> 📝 **Note:** Cancellation will stop processing new batches. Any in-progress migrations will complete.\n\n`;
    
    body += `---\n\n`;
    
    // Updates section
    body += `## 📬 Status Updates\n\n`;
    body += `You'll receive automated updates here as the migration progresses:\n\n`;
    body += `- 🚀 When each batch starts\n`;
    body += `- ✅ When each batch completes\n`;
    body += `- ⏱️ Progress updates for long-running batches\n`;
    body += `- 📊 Final summary upon completion\n\n`;
    
    if (isDryRun) {
        body += `<details>\n`;
        body += `<summary><b>📚 After the Dry-Run</b></summary>\n\n`;
        body += `Once this test migration completes, you can:\n\n`;
        body += `1. **Review the results** - Check for any errors or warnings\n`;
        body += `2. **Verify test repositories** - Inspect the created \`-dry-run\` repos\n`;
        body += `3. **Run production migration** - Use \`/run-production-migration\`\n`;
        body += `4. **Clean up test repos** - Use \`/delete-dry-run\`\n`;
        body += `5. **Adjust and retry** - Modify your configuration if needed\n\n`;
        body += `</details>\n\n`;
    }
    
    // Footer
    body += `---\n\n`;
    body += `<div align="center">\n\n`;
    body += `**${typeEmoji} ${typeTitle} Migration #${context.issue.number} has begun!**\n\n`;
    body += `Started at ${new Date().toLocaleString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short' 
    })}\n\n`;
    body += `</div>`;

    await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body
    });
};