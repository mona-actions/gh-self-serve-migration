module.exports = async ({ github, context }) => {
    // Handle visibility formatting
    const visibility = process.env.VISIBILITY === 'None' ? 'Private' : process.env.VISIBILITY;
    const targetOrg = process.env.TARGET_ORG || 'target-organization';
    const sourceOrg = process.env.SOURCE_ORG || 'source-organization';

    // Get and parse repositories
    const repoText = process.env.REPOSITORIES || '';

    console.log('=== DEBUG REPOSITORIES ===');
    console.log('REPOSITORIES exists:', !!process.env.REPOSITORIES);
    console.log('Length:', repoText.length);
    console.log('First 500 chars:', repoText.substring(0, 500));
    console.log('=== END DEBUG ===');

    // Clean HTML tags from repository text
    const cleanedText = repoText
        .replace(/<details[^>]*>/gi, '')
        .replace(/<\/details>/gi, '')
        .replace(/<summary[^>]*>/gi, '')
        .replace(/<\/summary>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

    // Extract valid repository URLs
    const repoLines = cleanedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
            if (!line) return false;
            if (line.includes('<') && line.includes('>')) return false;
            if (line.startsWith('#') && !line.includes('://')) return false;
            return line.includes('://') || line.includes('github.');
        });

    const numberOfRepositories = repoLines.length;

    // Log parsing results
    console.log(`Total valid repositories found: ${numberOfRepositories}`);

    // Build welcome message
    const commentBody = buildWelcomeMessage({
        numberOfRepositories,
        targetOrg,
        sourceOrg,
        visibility,
        context
    });

    // Check if this is a large batch migration
    const labelsResponse = await github.rest.issues.listLabelsOnIssue({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo
    });

    const labels = labelsResponse.data.map(label => label.name);
    const isGEIMigration = labels.some(label => label.includes('gei'));
    const isLargeBatch = numberOfRepositories > 200;

    // Add batch processing info if needed
    const finalComment = isGEIMigration && isLargeBatch
        ? appendBatchInfo(commentBody, numberOfRepositories)
        : commentBody;

    // Post the comment
    await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: finalComment
    });
}

// Helper function to build the main welcome message
function buildWelcomeMessage({ numberOfRepositories, targetOrg, sourceOrg, visibility, context }) {
    return `## 🚀 Step 4: Ready to Migrate!

Your migration is fully configured and ready to execute.

### 📊 Migration Summary

| Item | Details |
|------|---------|
| **Source organization** | \`${sourceOrg}\` |
| **Target organization** | \`${targetOrg}\` |
| **Repositories to migrate** | ${numberOfRepositories} |
| **Repository visibility** | \`${visibility}\` |
| **Migration ID** | #${context.issue.number} |

<details>
<summary>⚠️ <b>Parsed different number of repositories?</b></summary>

If the number above doesn't match your expectation:
- Ensure each repository URL is on its own line
- Remove any comments or extra text between URLs
- URLs must match your selected source organization

</details>

---

## 🚀 Choose Your Migration Path

### Option 1: Test Migration (Recommended First)
Start with a **dry-run** to validate the migration without affecting your source repositories.

\`\`\`
/run-dry-run-migration
\`\`\`

**✅ Benefits:**
- No repository locking
- Users can continue working
- Validates migration process
- Identifies potential issues
- Creates test repositories with \`-dry-run\` suffix

### Option 2: Production Migration
Once you've validated the dry-run, proceed with the production migration.

\`\`\`
/run-production-migration
\`\`\`

**⚠️ Important:**
- **Will lock** source repositories during migration
- Users cannot push changes during migration
- Ensure team is notified
- Run dry-run first to validate

---

### 📚 Need Help?

- [Migration Best Practices](https://docs.github.com/en/migrations/using-github-enterprise-importer/understanding-github-enterprise-importer/migration-best-practices)
- [Troubleshooting Guide](https://docs.github.com/en/migrations/using-github-enterprise-importer/completing-your-migration-with-github-enterprise-importer/troubleshooting-your-migration)
- Reply to this issue with questions

---

### ⚡ Available Commands

| Command | Description |
|---------|-------------|
| \`/run-dry-run-migration\` | Start a test migration (recommended first) |
| \`/run-production-migration\` | Start the actual migration |
| \`/cancel-migration\` | Stop an in-progress migration |
| \`/delete-repositories\` | Delete migrated repositories |

---

*I'll post updates here as your migration progresses. You can cancel anytime with \`/cancel-migration\`*`;
}

// Helper function to append batch processing information
function appendBatchInfo(commentBody, numberOfRepositories) {
    const batches = Math.ceil(numberOfRepositories / 200);

    return `${commentBody}

---

## 📦 Large Migration Detected

Since you're migrating **${numberOfRepositories} repositories**, they'll be processed in **${batches} sequential batches** of up to 200 repositories each.

**Why batches?**
- Ensures reliable migration
- Prevents timeouts
- Better error handling
- Progress tracking per batch

You'll receive updates as each batch completes.`;
}