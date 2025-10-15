module.exports = async ({ core }) => {
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('.github/scripts/config/instances.json', 'utf8'));
  
  const sourceInstance = process.env.SOURCE_INSTANCE;
  const targetInstance = process.env.TARGET_INSTANCE;
  
  console.log(`Resolving tokens for: ${sourceInstance} → ${targetInstance}`);
  
  // Lookup source config
  const sourceConfig = config.sources[sourceInstance];
  if (!sourceConfig) {
    core.setFailed(`Unknown source instance: ${sourceInstance}`);
    return;
  }
  
  // Lookup target config
  const targetConfig = config.targets[targetInstance];
  if (!targetConfig) {
    core.setFailed(`Unknown target instance: ${targetInstance}`);
    return;
  }
  
  const sourceTokenName = sourceConfig.tokenSecret;
  const targetTokenName = targetConfig.tokenSecret;
  
  console.log(`Source token: ${sourceTokenName}`);
  console.log(`Target token: ${targetTokenName}`);
  
  // Get actual token values from environment
  const sourceToken = process.env[sourceTokenName];
  const targetToken = process.env[targetTokenName];
  
  if (!sourceToken) {
    core.setFailed(
      `Secret not found: ${sourceTokenName}\n` +
      `Please create this secret for source instance: ${sourceInstance}`
    );
    return;
  }
  
  if (!targetToken) {
    core.setFailed(
      `Secret not found: ${targetTokenName}\n` +
      `Please create this secret for target instance: ${targetInstance}`
    );
    return;
  }
  
  // Mask tokens in logs
  core.setSecret(sourceToken);
  core.setSecret(targetToken);
  
  console.log(`✅ Tokens resolved successfully`);
  
  // Set outputs
  core.setOutput('source_token', sourceToken);
  core.setOutput('target_token', targetToken);
  core.setOutput('source_hostname', sourceConfig.hostname);
  core.setOutput('target_hostname', targetConfig.hostname);
};