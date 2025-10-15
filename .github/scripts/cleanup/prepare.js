module.exports = async ({ github, context, core }) => {
  const repoData = JSON.parse(process.env.REPOSITORIES_JSON);
  const targetOrg = process.env.TARGET_ORG;
  const isDryRun = process.env.IS_DRY_RUN === 'true';

  // Extract repository field - handle different possible field names
  const repositories = repoData._repositories ||
    repoData._repositories_to_migrate ||
    repoData.repositories || '';

  // Parse repositories from the text
  const cleanedText = repositories
    .replace(/<details[^>]*>/gi, '')
    .replace(/<\/details>/gi, '')
    .replace(/<summary[^>]*>/gi, '')
    .replace(/<\/summary>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const repoUrls = cleanedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      if (line.includes('<') && line.includes('>')) return false;
      if (line.startsWith('#') && !line.includes('://')) return false;
      return line.includes('://') || line.includes('github.');
    });

  // Extract repository names from URLs
  const repoNames = repoUrls.map(url => {
    const parts = url.split('/');
    return parts[parts.length - 1].replace(/\.git$/, ''); // Remove .git if present
  });

  // If dry-run, filter to only repos with -dry-run suffix
  const reposToDelete = isDryRun
    ? repoNames.map(name => `${name}`)
    : repoNames;

  // Set outputs for next steps - MUST BE STRINGS
  core.setOutput('repo_count', reposToDelete.length.toString());
  core.setOutput('repo_names', JSON.stringify(reposToDelete));
  core.setOutput('confirm_timestamp', new Date().toISOString());

  console.log(`Repos to delete: ${reposToDelete.length}`);
  console.log(`Type: ${isDryRun ? 'dry-run' : 'production'}`);

  if (reposToDelete.length === 0) {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: `### ⚠️ No Repositories to Delete

No ${isDryRun ? 'dry-run ' : ''}repositories found to delete. Please check:
- The repositories were successfully migrated
- The repository names are correct
- For dry-run deletions, repositories should have \`-dry-run\` suffix`
    });
    return;
  }

  // Create confirmation message
  const repoType = isDryRun ? 'dry-run repositories' : 'repositories';
  const warningLevel = isDryRun ? '⚠️' : '🚨';

  const body = `### ${warningLevel} Confirm Repository Deletion

**You are about to delete ${reposToDelete.length} ${repoType} from \`${targetOrg}\`**

<details>
<summary><b>📋 Repositories to be deleted</b></summary>

${reposToDelete.map((repo, index) => `${index + 1}. \`${targetOrg}/${repo}\``).join('\n')}

</details>

---

**${warningLevel} WARNING:** This action is **IRREVERSIBLE**. ${isDryRun
      ? 'These are test repositories from your dry-run migration.'
      : '⚠️ These are PRODUCTION repositories. All data will be permanently lost!'
    }

To confirm deletion, reply with:
\`\`\`
/confirm-delete
\`\`\`

To cancel, reply with:
\`\`\`
/cancel-delete
\`\`\`

⏱️ This request will expire in 5 minutes.`;

  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body
  });
};