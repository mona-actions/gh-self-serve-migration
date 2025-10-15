# 🚀 Running Migrations

This guide walks you through running repository migrations using the framework's 4-step guided workflow.

---

## 📋 Table of Contents

1. [Before You Start](#-before-you-start)
2. [Step 1: Create Migration Issue](#step-1️⃣-create-migration-issue-)
3. [Step 2: Select Organizations](#step-2️⃣-select-organizations-)
4. [Step 3: Provide Repository URLs](#step-3️⃣-provide-repository-urls-)
5. [Step 4: Execute Migration](#step-4️⃣-execute-migration-)
6. [Step 5: Monitor Progress](#step-5️⃣-monitor-progress-)
7. [Post-Migration Tasks](#-post-migration-tasks)
8. [Migration Commands Reference](#-migration-commands-reference)
9. [Common Scenarios](#-common-scenarios)
10. [Troubleshooting Migrations](#-troubleshooting-migrations)

---

## ✅ Before You Start

**Prerequisites:**
- ✅ Framework is fully set up (see [SETUP.md](SETUP.md))
- ✅ Self-hosted runners are online and idle
- ✅ You have access to source and target organizations (configured in `instances.json`)
- ✅ You know which repositories you want to migrate

**First-time users:** We recommend starting with a dry-run migration of 5-10 test repositories to familiarize yourself with the workflow.

---

## Step 1️⃣: Create Migration Issue 📝

### Create the Issue

1. Go to **Issues** → **New Issue**
2. Select **"🚀 Migrate Repositories to GitHub Enterprise Cloud"** template
3. **Fill out the form:**

| Field | Description | Example |
|-------|-------------|---------|
| **Source Instance** | Where you're migrating FROM | `GHES`, `GHEC` |
| **Target Instance** | Where you're migrating TO | `GHEC EMU` |
| **Target Repository Visibility** | Visibility for migrated repos | `Private`, `Internal`, or `Mirror` |
| **Migration Priority** | Urgency level (optional) | `High`, `Medium`, `Low` |
| **Migration Requirements** | What needs to be migrated | Check: LFS, Packages, Releases, etc. |

4. **Submit the issue**

### What Happens Next

The `prepare.yml` workflow automatically:
- ✅ Validates your access to the selected instances
- ✅ Filters organizations based on `instances.json` access control
- ✅ Posts a comment with organizations you can use

**If you don't have access:** You'll receive a message explaining why. Contact your admin to be added to the `allowedUsers` list in `instances.json`.

---

## Step 2️⃣: Select Organizations 🏢

### Automated Comment

After creating the issue, you'll receive an automated comment:

```markdown
## ✅ Step 2: Select Organizations

You have access to the following organizations:

### 🏠 Source Organizations (GHES)
- [ ] engineering
- [ ] platform
- [ ] research

### 🎯 Target Organizations (GHEC EMU)
- [ ] new-company-emu

**Instructions:**
1. Edit this comment (click the three dots → Edit)
2. Check ONE box from source organizations
3. Check ONE box from target organizations
4. Save the comment
```

### How to Select

1. Click the **three dots** (•••) in the top-right of the automated comment
2. Select **Edit**
3. Check **ONE** checkbox from **source** organizations
4. Check **ONE** checkbox from **target** organizations
5. Click **Update comment**

**Important:**
- ⚠️ You must select exactly ONE source and ONE target
- ⚠️ Selecting multiple will cause validation errors
- ✅ You can create multiple issues for different org pairs

### What Happens Next

The `on-checkbox-edit.yml` workflow:
- ✅ Validates your selections
- ✅ Posts Step 3 with instructions for providing repository URLs

---

## Step 3️⃣: Provide Repository URLs 📋

### Automated Instructions

After selecting organizations, you'll receive:

```markdown
## ✅ Step 3: Provide Repository URLs

Add a comment with the repositories you want to migrate.

**Format:**
https://ghes-prod.company.com/engineering/repo1
https://ghes-prod.company.com/engineering/repo2
https://ghes-prod.company.com/engineering/repo3

**Requirements:**
- One URL per line
- Must be from: ghes-prod.company.com/engineering/
- No trailing slashes
- URLs must be accessible
```

### How to Provide URLs

1. Create a **new comment** on the issue
2. List repository URLs (one per line)
3. Post the comment

**Example Comment:**
```
https://ghes.acme-corp.com/engineering/api-gateway
https://ghes.acme-corp.com/engineering/frontend-app
https://ghes.acme-corp.com/engineering/backend-services
https://ghes.acme-corp.com/engineering/data-pipeline
https://ghes.acme-corp.com/engineering/ml-models
```

**Tips:**
- 📋 You can migrate 1 to thousands of repositories
- ✅ URLs are validated against the selected source org
- 🔍 Invalid URLs will be reported before migration starts
- 📦 Large lists are automatically split into batches (250 repos each)

### What Happens Next

The `parse-repos.yml` workflow:
- ✅ Validates all URLs match the selected source organization
- ✅ Counts total repositories
- ✅ Calculates number of batches needed
- ✅ Posts Step 4 with migration commands

---

## Step 4️⃣: Execute Migration 🎬

### Ready to Migrate

After posting URLs, you'll receive:

```markdown
## ✅ Step 4: Ready to Migrate!

✅ Detected: 125 repositories
📦 Batches: 1 (250 repos per batch)
🎯 Target: new-company-emu

**Test first (recommended):**
/run-dry-run-migration

**Production migration:**
/run-production-migration
```

### Migration Commands

Add a **new comment** with one of these commands:

#### 🧪 Dry-Run Migration (Recommended First)

```
/run-dry-run-migration
```

**What it does:**
- ✅ Safe, non-destructive test
- ✅ Creates test repositories (GEI adds suffix like `-test`)
- ✅ Source repositories remain **unlocked** and unchanged
- ✅ Verifies the migration process works
- ✅ Identifies potential issues before production
- ✅ Can be cleaned up with `/delete-dry-run` command

**When to use:**
- 🎯 First time using the framework
- 🎯 Testing a new configuration
- 🎯 Validating repository list is correct
- 🎯 Before migrating critical production repositories

#### 🚀 Production Migration

```
/run-production-migration
```

**What it does:**
- ⚠️ **Locks source repositories** (prevents changes during migration)
- ✅ Creates production repositories with correct names
- ✅ Migrates all selected features (LFS, packages, releases, etc.)
- ✅ Applies user mappings if configured
- ⚠️ Cannot be easily undone

**When to use:**
- ✅ After successful dry-run validation
- ✅ During approved migration window
- ✅ When source repository locking is acceptable

### What Happens Next

The `trigger.yml` workflow:
- ✅ Validates setup and configuration
- ✅ Triggers the `orchestrator.yml` workflow
- ✅ Begins batch-by-batch migration execution

---

## Step 5️⃣: Monitor Progress 📊

### Real-Time Issue Updates

Watch progress updates posted automatically to your issue:

```
🚀 Migration Started

📊 Configuration:
├─ Mode: dry-run
├─ Source: GHES (ghes.acme-corp.com)
├─ Target: GHEC EMU (new-company-emu)
├─ Total Repositories: 625
├─ Batches: 3 (250 repos per batch)
├─ Parallel per batch: 10
└─ Target visibility: Private

---

🚀 Batch 1 of 3 Starting
📦 Repositories: 250
🔄 Processing with 10 parallel workers
➡️ Track progress: Actions tab → "Batch 1 - Migration" workflow

⏳ Estimated completion: 42 minutes

---

✅ Batch 1 of 3 Complete
🎉 Status: SUCCESS
⏱️ Duration: 41 minutes
📊 Results: 250 succeeded, 0 failed
🔗 View logs: https://github.com/YOUR-ORG/migraction/actions/runs/123456

---

🚀 Batch 2 of 3 Starting...
📦 Repositories: 250
🔄 Processing with 10 parallel workers
```

### Monitoring Locations

| Location | What You See | Best For |
|----------|--------------|----------|
| **Issue Comments** | High-level progress, batch status | Quick overview |
| **Actions Tab** | Workflow runs, detailed logs | Debugging issues |
| **Workflow Logs** | Individual repository status | Deep troubleshooting |
| **Target Org** | Migrated repositories appearing | Validation |

### Performance Expectations

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| **Repo migration time** | 1-5 minutes | Varies by size |
| **LFS migration time** | +10-60 minutes | Per repo with LFS |
| **Batch overhead** | ~2 minutes | Setup/teardown |
| **Parallel migrations** | 10 max | GEI hard limit |

### Checking Detailed Progress

**View specific batch:**
```
1. Go to Actions tab
2. Find "Batch X - Migration" workflow
3. Click to view detailed logs
4. Expand individual repository jobs
```

**Check runner status:**
```
Settings → Actions → Runners
- Verify runners show "Active" (running) or "Idle"
- Check runner utilization
```

---

## 🎉 Post-Migration Tasks

### Immediate Verification

After migration completes:

**1. Review Summary Report**
```markdown
🎉 Migration Complete!

📊 Final Results:
├─ Total Repositories: 625
├─ Succeeded: 625
├─ Failed: 0
├─ Duration: 2 hours 14 minutes
└─ Batches: 3 of 3 complete

✅ All repositories migrated successfully!

📋 Next Steps:
1. Verify repositories in target organization
2. Update placeholder secrets
3. Configure team access
4. Test CI/CD pipelines
```

**2. Verify Repositories**
- Visit target organization: `https://github.com/TARGET-ORG`
- Check repositories are visible
- Spot-check a few repos for completeness

**3. Update Secrets** ⚠️ **CRITICAL**
```
For each migrated repository:
1. Go to: https://github.com/TARGET-ORG/REPO/settings/secrets/actions
2. Update placeholder secrets with actual values
3. Verify variables migrated correctly
```

**Why?** GitHub API cannot read secret values (security), so placeholders are created. You must manually update them.

**4. Configure Access**
- Add teams to migrated repositories
- Set up branch protection rules
- Configure required reviewers

**5. Test CI/CD**
- Trigger a test workflow run
- Verify Actions secrets work
- Check deployment pipelines

### Post-Migration Cleanup

**Remove Dry-Run Test Repositories:**
```
/delete-dry-run
```
- ⚠️ Only use after validating dry-run results
- Removes all repositories with dry-run naming patterns
- Cannot be undone

**Cancel Ongoing Migration:**
```
/cancel-migration
```
- Posts cancellation notice to issue
- Workflows must be manually stopped in Actions tab
- In-progress migrations will complete

**Delete Specific Repositories:**
```
/delete-repositories
```
- ⚠️ **DANGEROUS** - Use with extreme caution
- Requires confirmation
- Permanently deletes repositories

---

## 📝 Migration Commands Reference

| Command | Purpose | Mode | Reversible |
|---------|---------|------|------------|
| `/run-dry-run-migration` | Test migration safely | Dry-run | ✅ Yes (use `/delete-dry-run`) |
| `/run-production-migration` | Execute production migration | Production | ❌ No (difficult to undo) |
| `/delete-dry-run` | Remove dry-run test repositories | Cleanup | ❌ No |
| `/delete-repositories` | Delete specific repositories | Cleanup | ❌ No |
| `/cancel-migration` | Stop ongoing migration | Control | Partial |

### Command Usage

**Post commands as new comments** on the migration issue:

```markdown
/run-dry-run-migration
```

**Commands are case-sensitive** and must be on their own line.

---

## 🎯 Common Scenarios

### Scenario 1: Small Test Migration (5-10 repos)

**Goal:** Test the framework with a few repositories

```
1. Create issue
2. Select organizations
3. Provide 5-10 repository URLs
4. Run: /run-dry-run-migration
5. Monitor progress (should complete in ~10 minutes)
6. Verify test repositories in target
7. Clean up: /delete-dry-run
```

### Scenario 2: Large Production Migration (1000+ repos)

**Goal:** Migrate entire organization

```
1. Create issue
2. Select organizations
3. Provide all repository URLs (system will batch into groups of 250)
4. Run: /run-dry-run-migration first
5. Validate dry-run results
6. Clean up: /delete-dry-run
7. Create new issue for production
8. Run: /run-production-migration
9. Monitor over several days
10. Verify all repositories
11. Update secrets for all repos
```

### Scenario 3: Incremental Migration (team by team)

**Goal:** Migrate repositories in controlled phases

```
1. Week 1: Create issue for Team A repositories (50 repos)
2. Run production migration for Team A
3. Week 2: Create issue for Team B repositories (75 repos)
4. Run production migration for Team B
5. Continue for all teams
```

### Scenario 4: LFS-Heavy Repositories

**Goal:** Migrate repositories with large LFS objects

```
1. Pre-cache LFS data (see SETUP.md)
2. Create issue with LFS repositories
3. Run dry-run migration
4. Expect longer duration (10-60 min per repo)
5. Monitor disk space on runners
6. Run production migration during off-hours
```

---

## 🛠️ Troubleshooting Migrations

### Migration Won't Start

**Symptoms:**
- No response after posting migration command
- Workflows don't trigger

**Solutions:**
1. Check you completed all 4 steps
2. Verify PAT tokens in secrets
3. Ensure secrets names match `instances.json`
4. Verify at least 1 self-hosted runner is online
5. Check Actions tab for workflow errors

**Debug:**
```bash
# Check secrets
gh secret list --repo YOUR-ORG/migraction

# Check runners
# Visit: https://github.com/YOUR-ORG/migraction/settings/actions/runners
```

### Batch Fails or Times Out

**Symptoms:**
- Batch workflow starts but doesn't complete
- "Job was cancelled" errors

**Solutions:**
1. Check Actions tab → Select failed workflow → Review logs
2. Verify runners are online (Settings → Actions → Runners)
3. Check runner logs on server: `cat ~/actions-runner-1/_diag/Runner_*.log`
4. Verify GEI CLI is installed: `gei --version`
5. Check API rate limits: `gh api rate_limit`
6. Re-run failed batch from Actions tab

### Some Repositories Failed

**Symptoms:**
- Batch completes but reports failed repositories
- Summary shows: "X succeeded, Y failed"

**Solutions:**
1. Check workflow logs for specific error messages
2. Common issues:
   - Repository too large
   - Network timeout
   - Insufficient permissions
   - Repository name conflict in target
3. Fix the issue
4. Create new migration issue for failed repositories only
5. Re-run migration

### Features Not Migrating

**Symptoms:**
- Main migration succeeds but LFS/packages/releases missing

**Solutions:**
1. Check if features were detected in batch processor logs
2. Verify `LOCAL_CACHE_DIR` exists: `ls -la /opt/migration/`
3. Check feature workflow triggering in Actions tab
4. Pre-cache data using `gh-migrate-*` tools
5. Re-run feature migration workflows manually if needed

### Placeholder Secrets Not Updated

**Symptoms:**
- Workflows fail due to invalid secrets
- Deployments fail

**Solution:**
This is expected behavior! You must manually update secrets:
1. Go to each repository settings
2. Navigate to: Settings → Secrets → Actions
3. Update each placeholder with actual secret value
4. This is a security requirement (GitHub API cannot read secret values)

---

## 📞 Need Help?

- 📖 **Setup Issues**: See [SETUP.md](SETUP.md)
- 🔄 **Framework Updates**: See [UPDATING.md](UPDATING.md)
- 🏗️ **Architecture Questions**: See [README.md](README.md)
- 🐛 **Report Bugs**: [GitHub Issues](https://github.com/cvega/migraction/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/cvega/migraction/discussions)

---

<div align="center">

**🚀 Happy Migrating!** | **Test with Dry-Runs** | **Monitor Progress**

*Last Updated: October 2025*

</div>
