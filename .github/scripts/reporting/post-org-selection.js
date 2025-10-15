module.exports = async ({ github, context }) => {
  const sourceInstance = process.env.SOURCE_INSTANCE;
  const sourceHostname = process.env.SOURCE_HOSTNAME;
  const sourceOrgs = JSON.parse(process.env.SOURCE_ORGS);
  
  const targetInstance = process.env.TARGET_INSTANCE;
  const targetHostname = process.env.TARGET_HOSTNAME;
  const targetOrgs = JSON.parse(process.env.TARGET_ORGS);
  
  let body = `## 📋 Step 2: Select Organizations\n\n`;
  body += `Hey @${context.payload.issue.user.login}! Based on your permissions:\n\n`;
  
  body += `### 📤 Source Organization\n\n`;
  body += `**${sourceInstance}** (\`${sourceHostname}\`)\n\n`;
  body += `Select **ONE** organization:\n\n`;
  sourceOrgs.forEach(org => {
    body += `- [ ] \`${org}\`\n`;
  });
  
  body += `\n### 📥 Target Organization\n\n`;
  body += `**${targetInstance}** (\`${targetHostname}\`)\n\n`;
  body += `Select **ONE** organization:\n\n`;
  targetOrgs.forEach(org => {
    body += `- [ ] \`${org}\`\n`;
  });
  
  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: body
  });
};