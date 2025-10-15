module.exports = async ({ github, context, core }) => {
  const fs = require('fs');
  
  // Load configuration
  const config = JSON.parse(fs.readFileSync('.github/scripts/config/instances.json', 'utf8'));
  
  // Get user who created the issue
  const username = context.payload.issue.user.login;
  console.log(`Filtering for user: ${username}`);
  
  // Get dropdown selections from issue
  const sourceInstance = process.env.SOURCE_INSTANCE;
  const targetInstance = process.env.TARGET_INSTANCE;
  
  console.log(`Source instance selected: ${sourceInstance}`);
  console.log(`Target instance selected: ${targetInstance}`);
  
  // Validate source instance exists
  const sourceConfig = config.sources[sourceInstance];
  if (!sourceConfig) {
    core.setFailed(`Unknown source instance: ${sourceInstance}`);
    return;
  }
  
  // Validate target instance exists
  const targetConfig = config.targets[targetInstance];
  if (!targetConfig) {
    core.setFailed(`Unknown target instance: ${targetInstance}`);
    return;
  }
  
  // Filter source orgs by user permissions
  const accessibleSourceOrgs = [];
  for (const [orgName, orgConfig] of Object.entries(sourceConfig.orgs)) {
    if (orgConfig.allowedUsers.includes(username)) {
      accessibleSourceOrgs.push(orgName);
      console.log(`✓ User has access to source: ${sourceInstance}/${orgName}`);
    }
  }
  
  // Filter target orgs by user permissions
  const accessibleTargetOrgs = [];
  for (const [orgName, orgConfig] of Object.entries(targetConfig.orgs)) {
    if (orgConfig.allowedUsers.includes(username)) {
      accessibleTargetOrgs.push(orgName);
      console.log(`✓ User has access to target: ${targetInstance}/${orgName}`);
    }
  }
  
  // Check if user has at least one source and one target
  const hasAccess = accessibleSourceOrgs.length > 0 && accessibleTargetOrgs.length > 0;
  
  if (!hasAccess) {
    console.log(`✗ User ${username} has no valid source/target combination`);
  }
  
  // Set outputs
  core.setOutput('has_access', hasAccess.toString());
  core.setOutput('source_instance', sourceInstance);
  core.setOutput('source_hostname', sourceConfig.hostname);
  core.setOutput('source_orgs', JSON.stringify(accessibleSourceOrgs));
  core.setOutput('target_instance', targetInstance);
  core.setOutput('target_hostname', targetConfig.hostname);
  core.setOutput('target_orgs', JSON.stringify(accessibleTargetOrgs));
  
  console.log(`\nSummary for ${username}:`);
  console.log(`  Source orgs: ${accessibleSourceOrgs.length}`);
  console.log(`  Target orgs: ${accessibleTargetOrgs.length}`);
  console.log(`  Has access: ${hasAccess}`);
};