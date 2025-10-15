module.exports = async ({ github, context, core }) => {
  const startTime = new Date();
  const timeout = 5 * 60 * 1000; // 5 minutes
  const checkInterval = 5000; // Check every 5 seconds

  console.log(`Waiting for confirmation from ${context.payload.comment.user.login}...`);

  while (new Date() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));

    // Get recent comments
    const comments = await github.rest.issues.listComments({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      since: startTime.toISOString()
    });

    // Check for confirmation from the same user who initiated
    const confirmComment = comments.data.find(comment =>
      comment.body.includes('/confirm-delete') &&
      comment.user.login === context.payload.comment.user.login
    );

    const cancelComment = comments.data.find(comment =>
      comment.body.includes('/cancel-delete') &&
      comment.user.login === context.payload.comment.user.login
    );

    if (cancelComment) {
      core.setOutput('confirmed', 'false');
      await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '### ❌ Deletion Cancelled\n\nRepository deletion has been cancelled by user request.'
      });
      return;
    }

    if (confirmComment) {
      core.setOutput('confirmed', 'true');
      console.log('Deletion confirmed by user');
      return;
    }
  }

  // Timeout reached
  core.setOutput('confirmed', 'timeout');
  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: `### ⏱️ Deletion Request Expired

The 5-minute confirmation window has expired. Please run \`/delete-repositories\` again if you still want to delete the repositories.`
  });
};