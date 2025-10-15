/**
 * Unified Validation Module
 * Handles all validation tasks for the migration framework
 */

const fs = require('fs');
const path = require('path');

/**
 * Validates the instances.json configuration file
 * Can be run standalone via: node validate.js
 */
function validateConfig() {
  try {
    const configPath = path.join(__dirname, 'instances.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log('✓ Configuration file is valid JSON');
    
    // Check structure
    if (!config.sources || !config.targets) {
      throw new Error('Missing sources or targets');
    }
    
    console.log(`✓ Sources: ${Object.keys(config.sources).length}`);
    console.log(`✓ Targets: ${Object.keys(config.targets).length}`);
    
    // Validate each source
    for (const [instanceName, instanceConfig] of Object.entries(config.sources)) {
      if (!instanceConfig.hostname) {
        throw new Error(`Source ${instanceName} missing hostname`);
      }
      if (!instanceConfig.tokenSecret) {
        throw new Error(`Source ${instanceName} missing tokenSecret`);
      }
      if (!instanceConfig.orgs || Object.keys(instanceConfig.orgs).length === 0) {
        throw new Error(`Source ${instanceName} has no orgs`);
      }
      
      console.log(`  ✓ ${instanceName}: ${Object.keys(instanceConfig.orgs).length} orgs`);
    }
    
    // Validate each target
    for (const [instanceName, instanceConfig] of Object.entries(config.targets)) {
      if (!instanceConfig.hostname) {
        throw new Error(`Target ${instanceName} missing hostname`);
      }
      if (!instanceConfig.tokenSecret) {
        throw new Error(`Target ${instanceName} missing tokenSecret`);
      }
      if (!instanceConfig.orgs || Object.keys(instanceConfig.orgs).length === 0) {
        throw new Error(`Target ${instanceName} has no orgs`);
      }
      
      console.log(`  ✓ ${instanceName}: ${Object.keys(instanceConfig.orgs).length} orgs`);
    }
    
    console.log('\n✅ Configuration is valid!');
    return true;
    
  } catch (error) {
    console.error('❌ Configuration error:', error.message);
    return false;
  }
}

/**
 * Validates checkbox selection from org selection comment
 * Used by on-checkbox-edit.yml workflow
 */
async function validateCheckboxSelection({ github, context, core }) {
  const { parseOrgSelections } = require('../utils/common.js');
  
  const commentBody = context.payload.comment.body;
  const commentUser = context.payload.comment.user;
  const actor = context.actor;
  
  console.log('=== VALIDATION START ===');
  console.log('Comment author:', commentUser.login, '(type:', commentUser.type + ')');
  console.log('Event triggered by:', actor);
  console.log('Comment length:', commentBody.length);
  
  // Skip if the EVENT was triggered by a bot
  if (actor.includes('[bot]') || actor === 'github-actions') {
    console.log('⏭️ Skipping - event triggered by bot');
    core.setOutput('is_org_comment', 'false');
    return;
  }
  
  console.log('Has 📤:', commentBody.includes('📤 Source Organization'));
  console.log('Has 📥:', commentBody.includes('📥 Target Organization'));
  
  if (!commentBody.includes('📤 Source Organization') || 
      !commentBody.includes('📥 Target Organization')) {
    console.log('❌ Not an org selection comment');
    core.setOutput('is_org_comment', 'false');
    return;
  }
  
  console.log('✅ Is org selection comment');
  core.setOutput('is_org_comment', 'true');
  
  const selections = parseOrgSelections(commentBody);
  
  console.log('Parsed selections:', JSON.stringify(selections, null, 2));
  console.log('Source checked:', selections.sourceChecked);
  console.log('Target checked:', selections.targetChecked);
  
  const isValid = selections.sourceChecked === 1 && selections.targetChecked === 1;
  
  console.log('Is valid?', isValid);
  core.setOutput('is_valid', isValid.toString());
  
  if (!isValid) {
    if (selections.sourceChecked === 0 || selections.targetChecked === 0) {
      console.log('❌ No selections made');
      core.setOutput('error_type', 'none_selected');
    } else {
      console.log('❌ Multiple selections made');
      core.setOutput('error_type', 'multiple_selected');
    }
    return;
  }
  
  // Extract hostnames from comment
  const sourceHostnameMatch = commentBody.match(/📤[\s\S]*?\(`([^`]+)`\)/);
  const targetHostnameMatch = commentBody.split('📥')[1]?.match(/\(`([^`]+)`\)/);
  
  console.log('Source hostname:', sourceHostnameMatch?.[1]);
  console.log('Target hostname:', targetHostnameMatch?.[1]);
  
  core.setOutput('source_instance', selections.sourceInstance);
  core.setOutput('source_org', selections.sourceOrg);
  core.setOutput('source_hostname', sourceHostnameMatch?.[1] || 'unknown');
  core.setOutput('target_instance', selections.targetInstance);
  core.setOutput('target_org', selections.targetOrg);
  core.setOutput('target_hostname', targetHostnameMatch?.[1] || 'unknown');
  
  console.log('✅ Valid selection - outputs set');
  console.log('=== VALIDATION END ===');
}

/**
 * Validates complete migration setup (org selection + repo list)
 * Used by trigger.yml workflow
 */
async function validateCompleteSetup({ github, context, core }) {
  const { loadConfig, extractJson } = require('../utils/common.js');
  
  console.log('=== Validating Complete Migration Setup ===');
  
  const comments = await github.rest.issues.listComments({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo
  });
  
  // Find org state
  const stateComment = comments.data.find(c => 
    c.body.includes('✅ Organizations Selected') &&
    c.body.includes('📊 Configuration Data')
  );
  
  if (!stateComment) {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: `### ❌ Setup Incomplete\n\nPlease complete Step 2.`
    });
    core.setFailed('No org selection found');
    return;
  }
  
  const state = extractJson(stateComment.body);
  if (!state) {
    core.setFailed('Could not parse state JSON');
    return;
  }
  
  console.log(`Selected: ${state.sourceInstance}/${state.sourceOrg} → ${state.targetInstance}/${state.targetOrg}`);
  
  // Find repo list
  const repoComment = comments.data.find(c => 
    c.body.includes('✅ Repository List Received')
  );
  
  if (!repoComment) {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: `### ⚠️ Repository List Missing\n\nPlease complete Step 3.`
    });
    core.setFailed('No repository list');
    return;
  }
  
  const repoState = extractJson(repoComment.body);
  if (!repoState) {
    core.setFailed('Could not parse repo JSON');
    return;
  }
  
  const repos = repoState.repositories;
  console.log(`Found ${repos.length} repositories`);
  
  // Validate repos
  const config = loadConfig();
  const sourceConfig = config.sources[state.sourceInstance];
  
  if (!sourceConfig) {
    core.setFailed(`Unknown source instance: ${state.sourceInstance}`);
    return;
  }
  
  const expectedPrefix = `https://${sourceConfig.hostname}/${state.sourceOrg}/`;
  const invalidRepos = repos.filter(url => !url.startsWith(expectedPrefix));
  
  if (invalidRepos.length > 0) {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: `### ❌ Repository Mismatch\n\nRepos must start with: \`${expectedPrefix}\`\n\n${invalidRepos.map(u => `- ${u}`).join('\n')}`
    });
    core.setFailed('Invalid repos');
    return;
  }
  
  console.log('✅ All validations passed');
  
  core.setOutput('source_instance', state.sourceInstance);
  core.setOutput('source_org', state.sourceOrg);
  core.setOutput('target_instance', state.targetInstance);
  core.setOutput('target_org', state.targetOrg);
  core.setOutput('repository_urls', JSON.stringify(repos));
  core.setOutput('repository_count', repos.length.toString());
}

// Export functions for workflow usage
module.exports = {
  validateConfig,
  validateCheckboxSelection,
  validateCompleteSetup
};

// Allow standalone execution for config validation
if (require.main === module) {
  const success = validateConfig();
  process.exit(success ? 0 : 1);
}
