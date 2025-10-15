# 🔄 Keeping Your Migration Framework Updated

This guide explains how to maintain your migration framework instance with the latest features, fixes, and improvements from the upstream repository.

---

## 📋 Table of Contents

1. [Understanding the Update Model](#-understanding-the-update-model)
2. [Template Repository Setup](#-template-repository-setup)
3. [Quick Update](#-quick-update)
4. [Checking for Updates](#-checking-for-updates)
5. [Detailed Update Process](#-detailed-update-process)
6. [Handling Conflicts](#-handling-conflicts)
7. [Update Rollback](#-update-rollback)
8. [Version Tracking](#-version-tracking)
9. [Automated Update Checks](#-automated-update-checks)

---

## 🎯 Understanding the Update Model

### Repository Structure

```
YOUR-ORG/migraction (your repository)
├── .github/scripts/config/instances.json  ← YOUR configuration (protected)
├── .github/scripts/**/*.js                ← Framework code (auto-updates)
├── .github/workflows/*.yml                ← Framework workflows (auto-updates)
└── README.md                              ← Framework docs (auto-updates)

cvega/migraction (upstream)
└── Latest framework updates
```

### Merge Strategy

Your `.gitattributes` file protects your customizations:
- **Your files** (instances.json): Always kept during updates
- **Framework files** (scripts, workflows): Always updated from upstream
- **Documentation**: Merged intelligently

---

## 📦 Template Repository Setup

This framework uses a **template repository model** to make it easy for you to maintain your own instance while receiving updates.

### Initial Setup

**Step 1: Create from Template**

**Via GitHub UI:**
```bash
# 1. Go to: https://github.com/cvega/migraction
# 2. Click the green "Use this template" button
# 3. Select "Create a new repository"
# 4. Configure:
#    - Owner: YOUR-ORG
#    - Repository name: migraction
#    - Visibility: Private (recommended)
# 5. Click "Create repository"

# 6. Clone your new repository
git clone https://github.com/YOUR-ORG/migraction.git
cd migraction
```

**Via GitHub CLI:**
```bash
gh repo create YOUR-ORG/migraction \
  --template cvega/migraction \
  --private \
  --clone

cd migraction
```

**Step 2: Add Upstream Remote**

```bash
# Add upstream remote to track framework updates
git remote add upstream https://github.com/cvega/migraction.git

# Verify remotes
git remote -v
# origin    https://github.com/YOUR-ORG/migraction.git (your copy)
# upstream  https://github.com/cvega/migraction.git (framework source)

# Fetch upstream
git fetch upstream
```

**Step 3: Configure Merge Strategy**

This protects your configuration files during updates:

```bash
# Create .gitattributes to handle merge conflicts intelligently
cat > .gitattributes << 'EOF'
# Always keep our version of configuration files during merges
.github/scripts/config/instances.json merge=ours

# Always take upstream version of framework files
.github/scripts/**/*.js merge=theirs
.github/workflows/*.yml merge=theirs
README.md merge=theirs

# Normal merge for documentation you might customize
SETUP.md merge=union
EOF

# Configure git merge drivers
git config merge.ours.driver true
git config merge.theirs.driver "git merge-file --theirs %O %A %B %A"

# Commit the configuration
git add .gitattributes
git commit -m "Configure merge strategy for framework updates"
git push origin main
```

**Step 4: Verify Setup**

```bash
# Verify remotes are configured
git remote -v

# Verify .gitattributes exists
cat .gitattributes

# Test fetch from upstream
git fetch upstream
```

---

## ⚡ Quick Update

**One-Command Update:**
```bash
cd migraction
git fetch upstream && git merge upstream/main && git push origin main
```

**What This Does:**
1. ✅ Fetches latest framework changes
2. ✅ Merges updates (your config stays safe)
3. ✅ Pushes to your repository
4. ✅ Triggers any workflow updates

**Expected Output:**
```
Fetching upstream...
From https://github.com/cvega/migraction
 * branch            main       -> FETCH_HEAD
Merge made by the 'recursive' strategy.
 .github/scripts/migration/gei-migrate.js | 45 +++++++++++++++++-
 .github/workflows/batch-processor.yml    | 12 +++--
 2 files changed, 52 insertions(+), 5 deletions(-)
```

---

## 🔍 Checking for Updates

### Check If Updates Are Available

```bash
# Fetch latest upstream changes
git fetch upstream

# Count available updates
git rev-list HEAD..upstream/main --count

# If output is 0, you're up to date
# If output is > 0, that many updates are available
```

### View What Changed

```bash
# See commit messages for available updates
git log HEAD..upstream/main --oneline

# Example output:
# a1b2c3d Fix batch processing timeout issue
# d4e5f6g Add support for advanced security features  
# g7h8i9j Improve error handling in releases migration
```

### Detailed Change Summary

```bash
# See detailed changelog
git log HEAD..upstream/main --pretty=format:"%h - %s (%cr) <%an>" --abbrev-commit

# See file changes
git diff HEAD..upstream/main --stat

# Example output:
# .github/scripts/migration/gei-migrate.js     | 45 +++++++++++++++++--
# .github/workflows/batch-processor.yml        | 12 +++---
# README.md                                    | 89 +++++++++++++++++++++++++++++++++---
# 3 files changed, 132 insertions(+), 14 deletions(-)
```

### View Specific File Changes

```bash
# See changes to a specific file
git diff HEAD..upstream/main -- .github/workflows/batch-processor.yml

# See changes to all workflows
git diff HEAD..upstream/main -- .github/workflows/
```

---

## 📝 Detailed Update Process

### Step 1: Backup Current State (Recommended)

```bash
# Create a backup branch
git branch backup-$(date +%Y%m%d) HEAD
git push origin backup-$(date +%Y%m%d)

# Or create a tag
git tag -a v1.0-pre-update -m "Snapshot before update on $(date +%Y-%m-%d)"
git push origin v1.0-pre-update
```

### Step 2: Fetch Latest Changes

```bash
# Fetch from upstream
git fetch upstream

# Verify what you're about to merge
git log HEAD..upstream/main --oneline --graph
```

### Step 3: Review Changes

```bash
# Check release notes if available
curl -s https://api.github.com/repos/cvega/migraction/releases/latest | jq -r '.body'

# Review major changes
git log HEAD..upstream/main --grep="BREAKING" --oneline
git log HEAD..upstream/main --grep="security" --oneline
```

### Step 4: Merge Updates

```bash
# Merge upstream changes
git merge upstream/main

# If no conflicts (common):
# Auto-merging .github/workflows/batch-processor.yml
# Merge made by the 'recursive' strategy.

# If there are conflicts:
# See "Handling Conflicts" section below
```

### Step 5: Verify Update

```bash
# Check status
git status

# Verify workflows are valid
node .github/scripts/config/validate.js

# Check that your instances.json is intact
cat .github/scripts/config/instances.json | jq .
```

### Step 6: Test Locally (Optional)

```bash
# Test configuration validation
node .github/scripts/config/validate.js

# Test filter scripts
node .github/scripts/config/test-filter.js

# Run any unit tests if they exist
npm test 2>/dev/null || echo "No tests configured"
```

### Step 7: Push to Your Repository

```bash
# Push the merge
git push origin main

# Verify in GitHub Actions
# Go to: https://github.com/YOUR-ORG/migraction/actions
# Ensure workflows are still valid
```

---

## 🔧 Handling Conflicts

### Common Conflict: instances.json

**Scenario:** Framework updated the example config structure.

```bash
# Conflict message:
# CONFLICT (content): Merge conflict in .github/scripts/config/instances.json

# Keep your version (recommended):
git checkout --ours .github/scripts/config/instances.json
git add .github/scripts/config/instances.json

# Continue merge:
git commit -m "Merge upstream updates, keeping local instances.json"
```

### Common Conflict: Custom Workflows

**Scenario:** You added custom workflows that conflict.

```bash
# List conflicted files
git status | grep "both modified"

# For custom workflows you added:
git checkout --ours .github/workflows/custom-workflow.yml
git add .github/workflows/custom-workflow.yml

# For framework workflows:
git checkout --theirs .github/workflows/batch-processor.yml
git add .github/workflows/batch-processor.yml

# Continue merge
git commit -m "Merge updates: keep custom workflows, update framework workflows"
```

### Manual Conflict Resolution

```bash
# Open conflicted file
code .github/scripts/config/instances.json

# Look for conflict markers:
# <<<<<<< HEAD
# Your version
# =======
# Upstream version
# >>>>>>> upstream/main

# Edit to keep what you need, remove markers

# Mark as resolved
git add .github/scripts/config/instances.json

# Continue merge
git commit
```

### Abort Merge

```bash
# If things go wrong, abort and try again
git merge --abort

# Restore to pre-merge state
git reset --hard HEAD
```

---

## ⏮️ Update Rollback

### Rollback to Previous State

**Option 1: Revert the Merge Commit**
```bash
# Find the merge commit
git log --oneline -5

# Revert it
git revert -m 1 <merge-commit-hash>
git push origin main
```

**Option 2: Reset to Backup**
```bash
# Find your backup
git branch -a | grep backup

# Reset to backup (CAUTION: loses changes)
git reset --hard backup-20241014
git push origin main --force-with-lease
```

**Option 3: Restore from Tag**
```bash
# List tags
git tag -l

# Reset to tag
git reset --hard v1.0-pre-update
git push origin main --force-with-lease
```

### Verify Rollback

```bash
# Verify workflows still work
git log -1

# Test configuration
node .github/scripts/config/validate.js

# Check Actions UI
# https://github.com/YOUR-ORG/migraction/actions
```

---

## 🏷️ Version Tracking

### Tag Before Each Update

```bash
# Create descriptive tag before updating
git tag -a v1.0-company-$(date +%Y%m%d) -m "Stable version before framework update"
git push origin v1.0-company-$(date +%Y%m%d)
```

### Track Framework Version

```bash
# Create a version tracking file
cat > .framework-version << EOF
Framework Version: $(git ls-remote https://github.com/cvega/migraction.git HEAD | cut -f1)
Last Updated: $(date +%Y-%m-%d)
Updated By: $(git config user.name)
EOF

git add .framework-version
git commit -m "Track framework version"
git push origin main
```

### View Update History

```bash
# See all updates from upstream
git log --oneline --grep="upstream" --all

# See your update tags
git tag -l | grep company

# View specific update
git show v1.0-company-20241014
```

---

## 🤖 Automated Update Checks

### Check for Updates Manually

```bash
# Fetch upstream changes
git fetch upstream

# Count available updates
git rev-list HEAD..upstream/main --count

# View recent changes if updates available
git log HEAD..upstream/main --oneline --max-count=10
```

### Schedule Automated Checks

**Via Cron (Linux/Mac):**
```bash
# Edit crontab
crontab -e

# Add weekly check every Monday at 9 AM
0 9 * * 1 cd /path/to/migraction && ./scripts/check-updates.sh
```

**Via Task Scheduler (Windows):**
```powershell
# Create scheduled task to run check-updates.sh weekly
$action = New-ScheduledTaskAction -Execute "bash.exe" -Argument "C:\path\to\migraction\scripts\check-updates.sh"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "CheckMigrationUpdates"
```

### GitHub Action for Update Notifications (Optional)

Create `.github/workflows/check-updates.yml`:

```yaml
name: Check for Framework Updates

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  check-updates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Add upstream remote
        run: |
          git remote add upstream https://github.com/cvega/migraction.git || true
          git fetch upstream
      
      - name: Check for updates
        id: check
        run: |
          UPDATES=$(git rev-list HEAD..upstream/main --count)
          echo "count=$UPDATES" >> $GITHUB_OUTPUT
          
          if [ "$UPDATES" -gt 0 ]; then
            echo "## 📦 Framework Updates Available" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "$UPDATES update(s) available:" >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
            git log HEAD..upstream/main --oneline --max-count=10 >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
          fi
      
      - name: Create issue if updates available
        if: steps.check.outputs.count > 0
        uses: actions/github-script@v7
        with:
          script: |
            const updates = ${{ steps.check.outputs.count }};
            const logs = await exec.getExecOutput('git', [
              'log', 
              'HEAD..upstream/main', 
              '--pretty=format:- %s (%cr)', 
              '--max-count=15'
            ]);
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `📦 Framework Updates Available (${updates} commits)`,
              body: `New updates are available from the upstream framework.\n\n## Recent Changes\n${logs.stdout}\n\n## How to Update\n\nRun the following command:\n\`\`\`bash\ngit merge upstream/main\n\`\`\`\n\nSee [UPDATING.md](UPDATING.md) for detailed instructions.`,
              labels: ['maintenance', 'framework-update']
            });
```

---

## 📊 Update Best Practices

### Before Updating

- ✅ Create a backup tag or branch
- ✅ Review the changelog
- ✅ Check for breaking changes
- ✅ Ensure no active migrations are running
- ✅ Notify team members

### After Updating

- ✅ Validate configuration (`node .github/scripts/config/validate.js`)
- ✅ Test with a dry-run migration on 1-2 repos
- ✅ Review GitHub Actions runs
- ✅ Update team documentation if needed
- ✅ Tag the new stable version

### Recommended Update Schedule

| Frequency | Action | Purpose |
|-----------|--------|---------|
| **Weekly** | Check for updates | Stay aware of changes |
| **Bi-weekly** | Apply non-breaking updates | Get fixes and improvements |
| **Monthly** | Review breaking changes | Plan for major updates |
| **Quarterly** | Major version updates | Coordinate larger changes |

---

## 🆘 Troubleshooting Updates

### Issue: Merge Conflicts Every Time

**Solution:**
```bash
# Verify .gitattributes exists
cat .gitattributes

# Reconfigure merge drivers if needed
git config merge.ours.driver true
git config merge.theirs.driver "git merge-file --theirs %O %A %B %A"

# Verify configuration
git config --list | grep merge
```

### Issue: Lost Custom Changes

**Solution:**
```bash
# Check if file is marked for "theirs" strategy
grep "your-file.js" .gitattributes

# If you want to keep custom changes, update .gitattributes:
echo ".github/scripts/custom/your-file.js merge=ours" >> .gitattributes
git add .gitattributes
git commit -m "Protect custom file from auto-merge"
```

### Issue: Workflow Fails After Update

**Solution:**
```bash
# Check workflow syntax
gh workflow list

# View recent workflow runs
gh run list --limit 5

# Check specific workflow
gh run view <run-id>

# Rollback if needed
git revert -m 1 HEAD
git push origin main
```

### Issue: Can't Fetch Upstream

**Solution:**
```bash
# Verify remote configuration
git remote -v

# Re-add upstream if missing
git remote remove upstream 2>/dev/null || true
git remote add upstream https://github.com/cvega/migraction.git
git fetch upstream
```

### Issue: Configuration File Got Overwritten

**Solution:**
```bash
# Restore from your backup
git checkout backup-20241014 -- .github/scripts/config/instances.json

# Or restore from previous commit
git log -- .github/scripts/config/instances.json
git checkout <commit-hash> -- .github/scripts/config/instances.json

# Commit the restoration
git add .github/scripts/config/instances.json
git commit -m "Restore instances.json configuration"
git push origin main
```

---

## 📞 Getting Help

Need assistance with updates?

- 📖 **Framework Overview**: [README.md](README.md)
- 🛠️ **Setup Guide**: [SETUP.md](SETUP.md)
- 🚀 **Migration Guide**: [USAGE.md](USAGE.md)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/cvega/migraction/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/cvega/migraction/discussions)

**When reporting update issues, include:**
- Current framework version: `git rev-parse --short HEAD`
- Upstream version: `git rev-parse --short upstream/main`
- Conflict details: `git status` output
- Error messages from merge attempt

---

<div align="center">

**🔄 Keep Your Framework Updated** | **Stay Secure** | **Get New Features**

*Last Updated: October 2025*

</div>
