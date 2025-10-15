module.exports = async ({ github, context }) => {
  const body = `## 📋 Step 3: Provide Repository URLs

Reply to this issue with your repository URLs (one per line).

**Example:**

https://github.com/your-org/repo1
https://github.com/your-org/repo2
https://github.com/your-org/repo3

**Format Requirements:**
- One repository URL per line
- Full HTTPS URLs (e.g., \`https://github.com/org/repo\`)
- URLs must match your selected source organization

---

⏭️ **After posting your repository list, I'll automatically proceed to Step 4.**`;

  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: body
  });
};