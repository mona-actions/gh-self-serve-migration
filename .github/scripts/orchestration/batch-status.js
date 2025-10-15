module.exports = async ({ github, context }) => {
    const fs = require('fs');
    const path = require('path');
    const batchInfo = JSON.parse(process.env.BATCH_INFO);

    let successfulRepos = [];
    let failedRepos = [];
    const dir = `batch-${batchInfo.batchNumber}-status`;

    if (fs.existsSync(`./${dir}`)) {
        fs.readdirSync(`./${dir}`).forEach(file => {
            if (path.extname(file) === '.txt') {
                let [repo, status] = fs.readFileSync(`${dir}/${file}`, 'utf-8').split(',');
                if (status.trim() === 'success') {
                    successfulRepos.push(repo);
                } else {
                    failedRepos.push(repo);
                }
            }
        });
    }

    const batchStatus = {
        batchNumber: batchInfo.batchNumber,
        totalBatches: batchInfo.totalBatches,
        successful: successfulRepos,
        failed: failedRepos,
        totalProcessed: successfulRepos.length + failedRepos.length,
        migrationId: batchInfo.migrationId,
        migrationType: batchInfo.migrationType
    };

    fs.writeFileSync(`batch-${batchInfo.batchNumber}-status.json`, JSON.stringify(batchStatus, null, 2));
}