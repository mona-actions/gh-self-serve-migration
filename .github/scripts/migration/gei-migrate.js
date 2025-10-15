#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    visibility: 'private', // default
    skipReleases: true,
    queueOnly: true
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--repository':
      case '--source-repo':
        params.repository = args[++i];
        break;
      case '--target-org':
      case '--target-organization':
        params.targetOrganization = args[++i];
        break;
      case '--visibility':
        params.visibility = args[++i].toLowerCase();
        break;
      case '--migration-type':
        params.migrationType = args[++i];
        break;
      case '--batch-number':
        params.batchNumber = args[++i];
        break;
      case '--total-batches':
        params.totalBatches = args[++i];
        break;
      case '--source-hostname':
        params.sourceHostname = args[++i];
        break;
      case '--lock-source':
        params.lockSource = true;
        break;
      case '--no-skip-releases':
        params.skipReleases = false;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  return params;
}

function showHelp() {
  console.log(`
Usage: node migrate-repo.js [options]

Options:
  --repository <url>           Source repository URL
  --target-org <name>          Target organization name
  --visibility <type>          Repository visibility (private|internal|public) [default: private]
  --migration-type <type>      Migration type (dry-run|production)
  --batch-number <n>           Current batch number
  --total-batches <n>          Total number of batches
  --source-hostname <host>     Custom GHES hostname (overrides URL parsing)
  --lock-source                Lock source repository during migration
  --no-skip-releases           Include releases in migration
  --help                       Show this help message
`);
}

// Execute command and stream output
function exec(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      stdout += text;
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      stderr += text;
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve({ stdout, stderr, code });
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start process: ${err.message}`));
    });
  });
}

async function execAndGetMigrationID(command, args) {
  try {
    const { stdout } = await exec(command, args);

    // Extract migration ID
    const match = stdout.match(/\(ID: (.+)\)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const params = parseArgs();

  // Validate required parameters
  if (!params.repository) {
    console.error('Error: --repository is required');
    showHelp();
    process.exit(1);
  }

  if (!params.targetOrganization) {
    console.error('Error: --target-org is required');
    showHelp();
    process.exit(1);
  }

  console.log('Processing repository:', params.repository);
  if (params.batchNumber && params.totalBatches) {
    console.log(`Batch: ${params.batchNumber} of ${params.totalBatches}`);
  }

  // Parse repository URL
  const parts = params.repository.split('/');
  const repoName = parts[parts.length - 1];
  const repoOrg = parts[parts.length - 2];
  const repoHost = parts[2];

  console.log('Repo:', params.repository);
  console.log('Visibility:', params.visibility);

  // Build GEI command arguments
  const geiArgs = [
    'migrate-repo',
    '--source-repo', repoName,
    '--target-repo', repoName,
    '--github-source-org', repoOrg,
    '--github-target-org', params.targetOrganization,
    '--target-repo-visibility', params.visibility
  ];

  // Add optional storage configuration
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    geiArgs.push('--azure-storage-connection-string', process.env.AZURE_STORAGE_CONNECTION_STRING);
  }

  if (process.env.AWS_ACCESS_KEY_ID) {
    geiArgs.push(
      '--aws-access-key', process.env.AWS_ACCESS_KEY_ID,
      '--aws-secret-key', process.env.AWS_SECRET_ACCESS_KEY
    );
    if (process.env.AWS_REGION) {
      geiArgs.push('--aws-region', process.env.AWS_REGION);
    }
    if (process.env.AWS_BUCKET_NAME) {
      geiArgs.push('--aws-bucket-name', process.env.AWS_BUCKET_NAME);
    }
  }

  // Handle GHES vs GitHub.com
  // Use provided hostname if available, otherwise fall back to URL parsing
  const ghesHost = params.sourceHostname || (repoHost !== 'github.com' ? repoHost : null);
  if (ghesHost) {
    geiArgs.push('--ghes-api-url', `https://${ghesHost}/api/v3`);
    console.log('Using GHES API URL:', `https://${ghesHost}/api/v3`);
  } else {
    console.log('Using GitHub.com API');
  }

  // Add migration type specific flags
  if (params.migrationType === 'production' || params.lockSource) {
    geiArgs.push('--lock-source-repo');
  }

  if (params.skipReleases) {
    geiArgs.push('--skip-releases');
  }

  if (params.queueOnly) {
    geiArgs.push('--queue-only');
  }

  try {
    // Queue the migration
    const migrationId = await execAndGetMigrationID('gei', geiArgs);

    if (migrationId) {
      console.log(`Queued migration of repository ${repoName} with ID ${migrationId}`);
      console.log('Waiting for migration to complete...');

      // Wait for migration to complete
      await exec('gei', ['wait-for-migration', '--migration-id', migrationId]);
      console.log('Migration completed successfully');

      // Set output for GitHub Actions (if running in Actions)
      if (process.env.GITHUB_OUTPUT) {
        const fs = require('fs');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `migration-id=${migrationId}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=success\n`);
      }
    } else {
      console.error(`Failed to queue migration for repository ${repoName}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error processing repository ${params.repository}:`, error.message);

    // Set failure output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = require('fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=failed\n`);
    }

    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { exec, execAndGetMigrationID };