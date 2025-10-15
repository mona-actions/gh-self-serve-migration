const fs = require('fs');

/**
 * Load instances.json config
 */
function loadConfig() {
  return JSON.parse(fs.readFileSync('.github/scripts/config/instances.json', 'utf8'));
}

/**
 * Parse repository URLs from text
 * Used ONLY in parse-repos.yml when user posts URLs
 */
function parseRepoUrls(text) {
  const cleanedText = text
    .replace(/<details[^>]*>/gi, '')
    .replace(/<\/details>/gi, '')
    .replace(/<summary[^>]*>/gi, '')
    .replace(/<\/summary>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  return cleanedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      if (line.includes('<') && line.includes('>')) return false;
      if (line.startsWith('#') && !line.includes('://')) return false;
      return line.includes('://') || line.includes('github.');
    });
}

/**
 * Parse org selections from checkbox markdown
 * Used ONLY in validate-checkbox-selection.js (ONE TIME to create JSON)
 */
function parseOrgSelections(commentBody) {
  const sourceSection = commentBody.match(/📤[\s\S]*?📥/)?.[0] || '';
  const targetSection = commentBody.split('📥')[1] || '';
  
  const sourceChecked = (sourceSection.match(/- \[[xX✓✔]\]/g) || []).length;
  const targetChecked = (targetSection.match(/- \[[xX✓✔]\]/g) || []).length;
  
  // Extract source
  let sourceInstance = null, sourceOrg = null, currentInstance = null;
  const sourceLines = sourceSection.split('\n');
  for (const line of sourceLines) {
    if (line.startsWith('**') && line.includes('**')) {
      const match = line.match(/\*\*([^*]+)\*\*/);
      if (match) currentInstance = match[1];
    } else if (line.match(/- \[[xX✓✔]\]/)) {
      const orgMatch = line.match(/`([^`]+)`/);
      if (orgMatch && currentInstance) {
        sourceInstance = currentInstance;
        sourceOrg = orgMatch[1];
      }
    }
  }
  
  // Extract target
  currentInstance = null;
  let targetInstance = null, targetOrg = null;
  const targetLines = targetSection.split('\n');
  for (const line of targetLines) {
    if (line.startsWith('**') && line.includes('**')) {
      const match = line.match(/\*\*([^*]+)\*\*/);
      if (match) currentInstance = match[1];
    } else if (line.match(/- \[[xX✓✔]\]/)) {
      const orgMatch = line.match(/`([^`]+)`/);
      if (orgMatch && currentInstance) {
        targetInstance = currentInstance;
        targetOrg = orgMatch[1];
      }
    }
  }
  
  return {
    sourceChecked,
    targetChecked,
    sourceInstance,
    sourceOrg,
    targetInstance,
    targetOrg
  };
}

/**
 * Extract JSON from markdown code block
 * Used everywhere AFTER state is created
 */
function extractJson(commentBody) {
  const match = commentBody.match(/```json\n([\s\S]*?)\n```/);
  return match ? JSON.parse(match[1]) : null;
}

module.exports = {
  loadConfig,
  parseRepoUrls,
  parseOrgSelections,
  extractJson
};