module.exports = async ({ github, context, core }) => {
  const targetOrg = process.env.TARGET_ORG;
  const repoNames = JSON.parse(process.env.REPO_NAMES);
  const isDryRun = process.env.IS_DRY_RUN === 'true';
  const token = process.env.TARGET_TOKEN;

  console.log(`Starting deletion of ${repoNames.length} repositories from ${targetOrg}`);
  console.log(`Repository type: ${isDryRun ? 'dry-run' : 'production'}`);

  const results = {
    successful: [],
    failed: [],
    notFound: []
  };

  // Process deletions using fetch API directly
  // This avoids dependency issues in GitHub Actions
  for (const repoName of repoNames) {
    try {
      console.log(`Attempting to delete ${targetOrg}/${repoName}...`);

      // First check if repo exists
      const checkResponse = await fetch(`https://api.github.com/repos/${targetOrg}/${repoName}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Actions'
        }
      });

      if (checkResponse.status === 404) {
        console.log(`Repository ${repoName} not found`);
        results.notFound.push(repoName);
        continue;
      }

      if (!checkResponse.ok) {
        throw new Error(`Failed to check repository: ${checkResponse.status} ${checkResponse.statusText}`);
      }

      // Delete the repository
      const deleteResponse = await fetch(`https://api.github.com/repos/${targetOrg}/${repoName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Actions'
        }
      });

      if (deleteResponse.status === 204) {
        console.log(`Successfully deleted ${repoName}`);
        results.successful.push(repoName);
      } else {
        const errorText = await deleteResponse.text();
        throw new Error(`Delete failed: ${deleteResponse.status} - ${errorText}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Failed to delete ${repoName}:`, error.message);
      results.failed.push({
        repo: repoName,
        error: error.message
      });
    }
  }

  // Generate summary report
  const totalAttempted = repoNames.length;
  const successCount = results.successful.length;
  const failCount = results.failed.length;
  const notFoundCount = results.notFound.length;

  console.log(`Deletion complete: ${successCount} successful, ${failCount} failed, ${notFoundCount} not found`);

  let summaryBody = `## 🗑️ Repository Deletion Complete

### Summary
| Status | Count |
|--------|-------|
| ✅ Successfully deleted | ${successCount} |
| ❌ Failed to delete | ${failCount} |
| 🔍 Not found | ${notFoundCount} |
| **Total attempted** | **${totalAttempted}** |

Type: **${isDryRun ? 'Dry-run' : 'Production'}** repositories`;

  if (results.successful.length > 0) {
    summaryBody += `\n\n<details>
<summary><b>✅ Successfully Deleted (${successCount})</b></summary>

${results.successful.map(repo => `- \`${targetOrg}/${repo}\``).join('\n')}

</details>`;
  }

  if (results.failed.length > 0) {
    summaryBody += `\n\n<details>
<summary><b>❌ Failed Deletions (${failCount})</b></summary>

${results.failed.map(item => `- \`${targetOrg}/${item.repo}\`: ${item.error}`).join('\n')}

</details>

### 🔧 Troubleshooting Failed Deletions

Common reasons for deletion failures:
- Insufficient permissions (token needs \`delete_repo\` scope)
- Repository has branch protection rules
- Repository is archived (unarchive first)
- API rate limiting

You may need to manually delete these repositories or fix the issues and retry.`;
  }

  if (results.notFound.length > 0) {
    summaryBody += `\n\n<details>
<summary><b>🔍 Not Found (${notFoundCount})</b></summary>

These repositories were not found in \`${targetOrg}\`:

${results.notFound.map(repo => `- \`${repo}\``).join('\n')}

</details>`;
  }

  // Add next steps
  if (isDryRun && successCount > 0) {
    summaryBody += `\n\n---\n\n### ✅ Next Steps

Your dry-run repositories have been cleaned up. You can now:
- Run the production migration with \`/run-production-migration\`
- Run another dry-run to test different settings`;
  }

  // Post the summary
  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: summaryBody
  });

  // Set outputs for workflow - MUST BE STRINGS
  core.setOutput('deleted_count', successCount.toString());
  core.setOutput('failed_count', failCount.toString());
  core.setOutput('not_found_count', notFoundCount.toString());

  // Fail the workflow if there were failures
  if (failCount > 0) {
    core.setFailed(`Failed to delete ${failCount} repositories`);
  }
};