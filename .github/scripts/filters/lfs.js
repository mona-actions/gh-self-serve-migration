import fs from 'fs';
import path from 'path';

function checkLFS() {
    // Get command from arguments (check or extract)
    const command = process.argv[2] || 'check';

    // Get inputs
    const csvPath = process.env.LFS_CSV_PATH || 'lfs-repos.csv';
    const targetURL = process.env.CLONE_URL;

    if (!targetURL) {
        console.error('Error: CLONE_URL environment variable is required');
        console.log('found=false');
        process.exit(1);
    }

    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
        console.error(`Error: CSV file not found at ${csvPath}`);
        console.log('found=false');
        process.exit(1);
    }

    // Read and parse the CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    const header = lines[0];

    // Find column indices
    const columns = header.split(',');
    const cloneURLIndex = columns.indexOf('CloneURL');
    const repoIndex = columns.indexOf('Repository');

    // Find the matching line
    let matchingLine = null;
    let repoName = null;

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');

        if (values[cloneURLIndex] === targetURL) {
            matchingLine = lines[i];
            repoName = values[repoIndex];
            break;
        }
    }

    // Handle based on command
    if (command === 'check') {
        // Just check if it exists
        console.log(matchingLine ? 'found=true' : 'found=false');

    } else if (command === 'extract') {
        // Extract and write file
        if (!matchingLine) {
            console.log('found=false');
            console.error(`No match found for URL: ${targetURL}`);
            process.exit(0);
        }

        console.log('found=true');
        const output = header + '\n' + matchingLine;
        const outputFile = `${repoName}.csv`;
        fs.writeFileSync(outputFile, output);

        console.error(`✓ Wrote ${outputFile}`);
        console.error(`  Repository: ${repoName}`);
    }
}

// Run it
checkLFS();