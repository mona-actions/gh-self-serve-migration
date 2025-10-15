module.exports = async ({ github, context }) => {
    const batchCount = process.env.BATCH_COUNT || '0';
    const migrationType = process.env.MIGRATION_TYPE || 'unknown';

    console.log('Debug - batchCount:', batchCount);
    console.log('Debug - migrationType:', migrationType);

    const isDryRun = migrationType === 'dry-run';
    const typeEmoji = isDryRun ? '🧪' : '🚀';
    const typeTitle = isDryRun ? 'Dry-Run' : 'Production';

    let body = `# ${typeEmoji} ${typeTitle} Migration Complete!\n\n`;

    // Summary Box
    body += `> ### 📊 Migration Summary\n`;
    body += `> **Total Batches Processed:** ${batchCount}\n`;
    body += `> **Migration Type:** ${typeTitle}\n`;
    body += `> **Processing Method:** Sequential (one batch at a time)\n\n`;

    body += `---\n\n`;

    // Results Section
    body += `## 📈 Batch Results\n\n`;
    body += `All ${batchCount} batch${batchCount !== '1' ? 'es' : ''} have completed processing. `;
    body += `Each batch ran as a separate workflow with detailed logs.\n\n`;
    body += `🔍 **[View all batch workflows →](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions?query=event%3Arepository_dispatch)**\n\n`;

    body += `---\n\n`;

    // Next Steps Section
    if (isDryRun) {
        body += `## 🎯 Next Steps\n\n`;
        body += `Your dry-run migration has completed! Here are your options:\n\n`;

        body += `### Option 1: Run Production Migration\n`;
        body += `If the dry-run results look good, proceed with the actual migration:\n\n`;
        body += `\`\`\`\n/run-production-migration\n\`\`\`\n\n`;

        body += `### Option 2: Clean Up Test Repositories\n`;
        body += `Remove the dry-run repositories from the target organization:\n\n`;
        body += `\`\`\`\n/delete-dry-run\n\`\`\`\n\n`;

        body += `### Option 3: Review and Adjust\n`;
        body += `If you encountered issues, you can:\n`;
        body += `- Review the batch logs for errors\n`;
        body += `- Adjust your repository list or settings\n`;
        body += `- Run another dry-run with different parameters\n\n`;
    } else {
        body += `## ✅ Migration Complete!\n\n`;
        body += `Your production migration has finished. Please verify:\n\n`;
        body += `- ✓ All repositories are accessible in \`${process.env.TARGET_ORG || 'target organization'}\`\n`;
        body += `- ✓ Repository settings and permissions are correct\n`;
        body += `- ✓ CI/CD pipelines are updated if needed\n`;
        body += `- ✓ Team members have appropriate access\n\n`;

        body += `### 🧹 Optional: Clean Up\n`;
        body += `If you want to remove any repositories:\n\n`;
        body += `\`\`\`\n/delete-repositories\n\`\`\`\n\n`;
    }

    body += `---\n\n`;

    // Troubleshooting Section
    body += `## 🔧 Troubleshooting\n\n`;

    body += `<details>\n`;
    body += `<summary><b>❌ If any batches failed</b></summary>\n\n`;
    body += `You have several options for handling failed migrations:\n\n`;
    body += `1. **Re-run specific batches**: Trigger the batch-processor workflow manually with the failed batch data\n`;
    body += `2. **Create a new issue**: Include only the failed repositories\n`;
    body += `3. **Manual migration**: Use GEI CLI directly for problematic repositories\n\n`;
    body += `Check the workflow logs for specific error messages and solutions.\n`;
    body += `</details>\n\n`;

    body += `<details>\n`;
    body += `<summary><b>📝 View migration details</b></summary>\n\n`;
    body += `- **Workflow Run**: [#${context.runId}](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})\n`;
    body += `- **Issue**: #${context.issue.number}\n`;
    body += `- **Migration ID**: \`${process.env.MIGRATION_ID || `${context.runId}-${context.runNumber}`}\`\n`;
    body += `- **Timestamp**: ${new Date().toISOString()}\n`;
    body += `</details>\n\n`;

    // Footer
    body += `---\n\n`;
    body += `<div align="center">\n\n`;

    if (isDryRun) {
        body += `💡 **Tip**: Always review dry-run results before running production migrations\n\n`;
    } else {
        body += `🎉 **Congratulations on completing your migration!**\n\n`;
    }

    body += `[Documentation](https://docs.github.com/en/migrations) | `;
    body += `[Support](https://support.github.com) | `;
    body += `[GEI CLI](https://github.com/github/gh-gei)\n\n`;
    body += `</div>`;

    await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body
    });
};