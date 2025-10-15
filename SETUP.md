# 🛠️ Migration Framework Setup Guide

This guide walks you through setting up the migration framework from initial repository creation to running your first migration.

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Repository Setup](#-repository-setup)
3. [Configure instances.json](#-configure-instancesjson)
4. [Configure GitHub Secrets](#-configure-github-secrets)
5. [Configure GitHub Variables](#-configure-github-variables)
6. [Set Up Self-Hosted Runners](#-set-up-self-hosted-runners)
7. [Configure Storage Backend](#-configure-storage-backend)
8. [Optional: Pre-Cache Tools](#-optional-pre-cache-tools)
9. [Validation & Testing](#-validation--testing)
10. [First Migration](#-first-migration)

---

## 🚀 Quick Setup Checklist

Before diving into detailed steps, here's the high-level setup process:

```
1️⃣ Create repository from template
   └─ Use "Use this template" button on GitHub

2️⃣ Configure instances.json
   └─ Define your GitHub instances, orgs, and user access

3️⃣ Add GitHub Secrets
   └─ PAT tokens for each instance + storage credentials

4️⃣ Add GitHub Variables  
   └─ INSTALL_PREREQS=true, LOCAL_CACHE_DIR=/opt/migration

5️⃣ Set up self-hosted runners
   └─ Install 11 runners on Ubuntu 24.04 server(s) for full concurrency
      (1 orchestrator + 10 batch processors)

6️⃣ Configure storage backend
   └─ Azure Blob Storage OR AWS S3

7️⃣ Validate & test
   └─ Run validation scripts, test with dry-run migration
```

**Estimated setup time:** 2-4 hours for first-time setup

---

## 🎯 Prerequisites

Before starting, ensure you have:

### Access & Permissions
- [ ] **Admin access** to source GitHub instance (GHES or GHEC)
- [ ] **Admin access** to target GitHub Enterprise Cloud organization
- [ ] Ability to create **Personal Access Tokens (PATs)** on both source and target
- [ ] Ability to create and manage **GitHub Actions runners**

### Infrastructure
- [ ] **Linux server(s)** for self-hosted runners (Ubuntu 24.04 LTS recommended)
  - Minimum: 1 server with 16 cores, 32GB RAM, 500GB SSD
  - Recommended: 1 server with 32 cores, 64GB RAM, 1TB SSD
- [ ] **Cloud storage** account (Azure Blob Storage or AWS S3)
- [ ] **Network access** from runners to:
  - Source GitHub instance
  - Target GitHub instance (github.com)
  - Cloud storage (Azure/AWS)

### Tools on Your Local Machine
- [ ] **Git** installed
- [ ] **GitHub CLI** (`gh`) installed: https://cli.github.com/
- [ ] **Node.js** (v22+) for validation scripts
- [ ] **SSH access** to runner server(s)
- [ ] **Text editor** for configuration files

---

## 📦 Repository Setup

### Step 1: Use as Template Repository

**Using Template (Recommended for Easy Updates)**
```bash
# 1. Use this repository as a template via GitHub UI
#    Go to: https://github.com/cvega/migraction
#    Click "Use this template" → "Create a new repository"
#    Select your organization and name it (e.g., "migraction")

# 2. Clone your new repository
git clone https://github.com/YOUR-ORG/migraction.git
cd migraction

# 3. Add upstream for receiving framework updates
git remote add upstream https://github.com/cvega/migraction.git
git fetch upstream
```

📘 **Using this as a template?** See [UPDATING.md](UPDATING.md) for how to keep your framework up-to-date with the latest features and fixes.

**Alternative: Fork the Repository**
```bash
# 1. Fork this repository to your organization via GitHub UI
#    Go to: https://github.com/cvega/migraction
#    Click "Fork" → Select your organization

# 2. Clone your fork
git clone https://github.com/YOUR-ORG/migraction.git
cd migraction
```

**Alternative: Clone and Push to New Repo**
```bash
# 1. Clone the repository
git clone https://github.com/cvega/migraction.git
cd migraction

# 2. Create new repository in your org via GitHub UI or CLI
gh repo create YOUR-ORG/migraction --public --source=. --remote=origin --push
```

### Step 2: Verify Repository Structure

```bash
# Check that all directories and files exist
ls -la .github/scripts/config/instances.json
ls -la .github/workflows/
ls -la .github/ISSUE_TEMPLATE/

# You should see:
# ✅ .github/scripts/config/instances.json
# ✅ .github/workflows/*.yml (multiple workflow files)
# ✅ .github/ISSUE_TEMPLATE/gei-batch-migrations.yml
```

---

## 🔧 Configure instances.json

This is the **most critical configuration file**. It defines all GitHub instances, organizations, and user access control.

### Step 1: Open the Configuration File

```bash
# Edit the file
nano .github/scripts/config/instances.json

# Or use your preferred editor
code .github/scripts/config/instances.json
```

### Step 2: Configure Your Instances

**Template Structure:**
```json
{
  "sources": {
    "INSTANCE-KEY": {
      "hostname": "github-hostname.com",
      "tokenSecret": "SECRET_NAME",
      "orgs": {
        "org-name": {
          "allowedUsers": ["username1", "username2"]
        }
      }
    }
  },
  "targets": {
    "INSTANCE-KEY": {
      "hostname": "github.com",
      "tokenSecret": "SECRET_NAME",
      "orgs": {
        "org-name": {
          "allowedUsers": ["username1", "username2"]
        }
      }
    }
  }
}
```

**Example Configuration:**
```json
{
  "sources": {
    "GHES Production": {
      "hostname": "ghes.acme-corp.com",
      "tokenSecret": "GHES_PROD_TOKEN",
      "orgs": {
        "engineering": {
          "allowedUsers": ["alice", "bob", "migration-admin"]
        },
        "platform": {
          "allowedUsers": ["alice", "migration-admin"]
        },
        "finance": {
          "allowedUsers": ["charlie", "migration-admin"]
        }
      }
    },
    "GHEC Legacy": {
      "hostname": "github.com",
      "tokenSecret": "GHEC_LEGACY_TOKEN",
      "orgs": {
        "old-acme-org": {
          "allowedUsers": ["alice", "bob", "charlie", "migration-admin"]
        }
      }
    }
  },
  "targets": {
    "GHEC EMU Production": {
      "hostname": "github.com",
      "tokenSecret": "GHEC_EMU_TOKEN",
      "orgs": {
        "acme-emu": {
          "allowedUsers": ["alice", "bob", "charlie", "migration-admin"]
        }
      }
    }
  }
}
```

### Step 3: Configuration Field Reference

| Field | Purpose | Example | Notes |
|-------|---------|---------|-------|
| **INSTANCE-KEY** | Name shown in issue dropdown | `"GHES Production"` | User-facing, can include spaces |
| **hostname** | GitHub instance URL | `"ghes.company.com"` or `"github.com"` | No `https://` prefix |
| **tokenSecret** | Name of GitHub secret | `"GHES_PROD_TOKEN"` | Must match secret name exactly |
| **orgs** | Organizations on this instance | `{"engineering": {...}}` | One or more organizations |
| **allowedUsers** | Authorized GitHub usernames | `["alice", "bob"]` | Lowercase usernames |

### Step 4: Validate Your Configuration

```bash
# Run the validation script
node .github/scripts/config/validate.js

# Expected output:
# ✓ Configuration file is valid JSON
# ✓ Sources: 2
# ✓ Targets: 1
#   ✓ GHES Production: 3 orgs
#   ✓ GHEC Legacy: 1 orgs
#   ✓ GHEC EMU Production: 1 orgs
# ✅ Configuration is valid!
```

### Step 5: Commit Your Configuration

```bash
# Add and commit the configuration
git add .github/scripts/config/instances.json
git commit -m "Configure instances and organizations"
git push origin main
```

---

## 🔐 Configure GitHub Secrets

Secrets store sensitive tokens that workflows use to authenticate.

### Step 1: Create Personal Access Tokens (PATs)

**For Each Instance in instances.json:**

1. **Navigate to token creation page:**
   - GHES: `https://YOUR-GHES-HOSTNAME/settings/tokens`
   - GHEC: `https://github.com/settings/tokens`

2. **Click "Generate new token" → "Generate new token (classic)"**

3. **Configure the token:**
   - **Note**: `Migration Framework - [INSTANCE-NAME]`
   - **Expiration**: 90 days (recommended) or custom
   - **Scopes**: Select the following:
     ```
     ✅ repo (Full control of private repositories)
        ✅ repo:status
        ✅ repo_deployment
        ✅ public_repo
        ✅ repo:invite
     ✅ admin:org (Full control of orgs and teams)
        ✅ write:org
        ✅ read:org
     ✅ workflow (Update GitHub Action workflows)
     ```

4. **Generate and copy the token** (starts with `ghp_` or `gho_`)

5. **Save securely** - you'll need these in the next step

**Tokens You Need:**

Based on your `instances.json`, create PATs for each instance defined:
- ✅ Each source instance (`tokenSecret` value from instances.json)
- ✅ Each target instance (`tokenSecret` value from instances.json)

**Example Token List:**
```
✅ GHES_PROD_TOKEN        (from GHES instance)
✅ GHEC_LEGACY_TOKEN      (from github.com)
✅ GHEC_EMU_TOKEN         (from github.com EMU org)
```

### Step 2: Add Secrets to GitHub Repository

**Important:** These secrets are accessed by the `batch-processor.yml` workflow, which dynamically resolves tokens based on your `instances.json` configuration.

1. **Navigate to repository settings:**
   ```
   https://github.com/YOUR-ORG/migraction/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add each token:**

   | Secret Name | Value | Purpose |
   |-------------|-------|---------|
   | `GHES_PROD_TOKEN` | `ghp_xxxxx...` | Source instance access (from instances.json) |
   | `GHEC_LEGACY_TOKEN` | `ghp_xxxxx...` | GHEC org access (from instances.json) |
   | `GHEC_EMU_TOKEN` | `ghp_xxxxx...` | Target EMU access (from instances.json) |

   **✅ Critical:** Secret names must match **exactly** with the `tokenSecret` values in your `instances.json` configuration.

4. **Verify secrets are added:**
   - You should see all secret names listed (values are hidden)
   - Names must match exactly with `tokenSecret` in `instances.json`

**How It Works:**
- The `batch-processor.yml` workflow reads these secrets at the job level
- Token resolution happens once in `batch-processor.yml` 
- Resolved tokens are passed to feature workflows (LFS, releases, packages, etc.)
- Feature workflows never directly access these secrets

### Step 3: Test Token Permissions

```bash
# Test each token has correct permissions
# Replace TOKEN with actual token value

# Test source token
gh auth login --hostname ghes.acme-corp.com --with-token < GHES_PROD_TOKEN
gh api /user
gh api /orgs/engineering

# Test target token
gh auth login --with-token < GHEC_EMU_TOKEN
gh api /user
gh api /orgs/acme-emu

# If any fail, recreate the token with correct scopes
```

### Adding New Instances

When you add a new instance to `instances.json`:

1. **Create the PAT** for the new instance (Step 1 above)
2. **Add the secret** to GitHub repository (Step 2 above)
3. **Update the reusable workflow** that resolves tokens:

   **Critical:** Update `.github/workflows/resolve-tokens-reusable.yml`
   
   Add your new token to the `secrets` section and the `env` section:
   ```yaml
   secrets:
     GHEC_CLOUD_TOKEN:
       required: false
     GHES_PROD_TOKEN:
       required: false
     GHEC_EMU_TOKEN:
       required: false
     NEW_INSTANCE_TOKEN:  # ← Add this
       required: false
   ```
   
   And in the `env` section of the resolve step:
   ```yaml
   env:
     GHEC_CLOUD_TOKEN: ${{ secrets.GHEC_CLOUD_TOKEN }}
     GHES_PROD_TOKEN: ${{ secrets.GHES_PROD_TOKEN }}
     GHEC_EMU_TOKEN: ${{ secrets.GHEC_EMU_TOKEN }}
     NEW_INSTANCE_TOKEN: ${{ secrets.NEW_INSTANCE_TOKEN }}  # ← Add this
   ```

4. **Update batch-processor.yml** job-level env:
   
   Since batch-processor uses matrix strategy and can't call reusable workflows, update its job-level `env` section:
   ```yaml
   env:
     # ... other env vars ...
     GHEC_CLOUD_TOKEN: ${{ secrets.GHEC_CLOUD_TOKEN }}
     GHES_PROD_TOKEN: ${{ secrets.GHES_PROD_TOKEN }}
     GHEC_EMU_TOKEN: ${{ secrets.GHEC_EMU_TOKEN }}
     NEW_INSTANCE_TOKEN: ${{ secrets.NEW_INSTANCE_TOKEN }}  # ← Add this
   ```

5. **Commit and push** the workflow changes

**Why two places?** 
- `resolve-tokens-reusable.yml` is used by `delete.yml` and other simple workflows
- `batch-processor.yml` can't use reusable workflows due to its matrix strategy, so it needs its own token list
- Both use the same `resolve-tokens.js` script for consistent token resolution logic

---

## ⚙️ Configure GitHub Variables

Variables store non-sensitive configuration that workflows use.

### Step 1: Navigate to Variables Settings

```
https://github.com/YOUR-ORG/migraction/settings/variables/actions
```

### Step 2: Add Required Variables

Click "New repository variable" for each:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `INSTALL_PREREQS` | `true` | Auto-install GEI CLI and dependencies on runners |
| `LOCAL_CACHE_DIR` | `/opt/migration` | Local cache directory path (can be customized) |

### Step 3: Add Storage Backend Variables (Choose One)

**Option A: AWS S3**
| Variable Name | Example Value |
|---------------|---------------|
| `AWS_REGION` | `us-east-1` |
| `AWS_BUCKET_NAME` | `acme-gh-migrations` |

**Option B: Azure Blob**
- No additional variables needed (connection string is in secrets)

---

## 🖥️ Set Up Self-Hosted Runners

Self-hosted runners are **required** for orchestration, batch processing, and feature migrations.

### Step 1: Prepare Runner Server

**System Requirements:**
- **OS**: Ubuntu 24.04 LTS
- **CPU**: 16-32 cores (for 11 runners: 1 orchestrator + 10 batch processors)
- **RAM**: 32-64 GB
- **Disk**: 500GB-1TB SSD
- **Network**: High-speed connection to GitHub

**Runner Count for Full Concurrency:** 11 total
- 1 runner: Orchestrator (batch creation, sequencing)
- 10 runners: Batch processing (max 10 concurrent migrations)
- Additional runners: Optional for feature migrations (can share with batch processors)

**Connect to your server:**
```bash
ssh user@runner-server.acme-corp.com
```

### Step 2: Install System Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y \
  git \
  curl \
  wget \
  unzip \
  jq \
  build-essential \
  libssl-dev \
  libffi-dev \
  python3 \
  python3-pip

# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh -y

# Install GEI CLI
wget https://github.com/github/gh-gei/releases/latest/download/gei-linux-amd64
sudo install -o root -g root -m 0755 gei-linux-amd64 /usr/local/bin/gei
rm gei-linux-amd64

# Verify installations
git --version
gh --version
gei --version
```

### Step 3: Create Local Cache Directory

```bash
# Create cache directory
sudo mkdir -p /opt/migration

# Set ownership (replace 'ubuntu' with your runner user)
sudo chown -R ubuntu:ubuntu /opt/migration
sudo chmod -R 755 /opt/migration

# Verify
ls -la /opt/migration
```

### Step 4: Install GitHub Actions Runners

**Get Runner Registration Token:**
```bash
# On your local machine, not the server
gh api -H "Accept: application/vnd.github+json" \
  /repos/YOUR-ORG/migraction/actions/runners/registration-token \
  --jq '.token'

# Copy the token (valid for 1 hour)
```

**Install First Runner:**
```bash
# On the runner server
# Create directory for first runner
mkdir -p ~/actions-runner-1 && cd ~/actions-runner-1

# Download latest runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure runner
./config.sh \
  --url https://github.com/YOUR-ORG/migraction \
  --token YOUR-REGISTRATION-TOKEN \
  --name gh-migration-runner-1 \
  --labels self-hosted,Linux,X64 \
  --work _work \
  --unattended

# Install as service
sudo ./svc.sh install ubuntu  # Replace 'ubuntu' with your username

# Start service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

**Install Additional Runners (2-11):**
```bash
# For each additional runner, repeat with different directory and name
cd ~

for i in {2..11}; do
  echo "Installing runner $i..."
  
  mkdir -p ~/actions-runner-$i
  cd ~/actions-runner-$i
  
  # Download and extract
  curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
    https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
  tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
  
  # Get new token for each runner (tokens expire after 1 hour)
  # Run this on your local machine:
  # gh api /repos/YOUR-ORG/migraction/actions/runners/registration-token --jq '.token'
  
  # Configure (use fresh token each time)
  ./config.sh \
    --url https://github.com/YOUR-ORG/migraction \
    --token YOUR-NEW-REGISTRATION-TOKEN \
    --name gh-migration-runner-$i \
    --labels self-hosted,Linux,X64 \
    --work _work \
    --unattended
  
  # Install and start service
  sudo ./svc.sh install ubuntu
  sudo ./svc.sh start
  
  echo "Runner $i installed ✅"
done
```

### Step 5: Verify Runners

**Check on GitHub:**
```
https://github.com/YOUR-ORG/migraction/settings/actions/runners
```

**Expected Status:**
```
✅ gh-migration-runner-1 - Idle (green dot)
✅ gh-migration-runner-2 - Idle (green dot)
✅ gh-migration-runner-3 - Idle (green dot)
...
✅ gh-migration-runner-11 - Idle (green dot)
```

**Check on Server:**
```bash
# Check all runner services
for i in {1..11}; do
  echo "Runner $i:"
  sudo systemctl status actions.runner.YOUR-ORG-migraction.gh-migration-runner-$i.service | grep Active
done

# All should show: Active: active (running)
```

---

## ☁️ Configure Storage Backend

GEI requires cloud storage for temporary migration data.

### Option A: Azure Blob Storage

**Step 1: Create Storage Account**
```bash
# Via Azure Portal:
# 1. Go to portal.azure.com
# 2. Create Resource → Storage Account
# 3. Configure:
#    - Name: acmeghmigrationstorage
#    - Region: Same as your runners
#    - Performance: Standard
#    - Redundancy: LRS (Locally-redundant storage)
```

**Step 2: Get Connection String**
```bash
# In Azure Portal:
# Storage Account → Access Keys → Show keys
# Copy "Connection string" for key1
```

**Step 3: Add to GitHub Secrets**
```bash
# Go to: https://github.com/YOUR-ORG/migraction/settings/secrets/actions
# New repository secret:
# Name: AZURE_STORAGE_CONNECTION_STRING
# Value: DefaultEndpointsProtocol=https;AccountName=...
```

### Option B: AWS S3

**Step 1: Create S3 Bucket**
```bash
# Via AWS Console:
# 1. Go to S3 service
# 2. Create bucket
# 3. Name: acme-gh-migrations
# 4. Region: us-east-1 (or your region)
# 5. Enable versioning (optional but recommended)
# 6. Create bucket
```

**Step 2: Create IAM User**
```bash
# Via AWS Console:
# 1. Go to IAM service
# 2. Users → Add user
# 3. Username: gh-migration-user
# 4. Access type: Programmatic access
# 5. Attach policies:
#    - AmazonS3FullAccess (or custom policy for specific bucket)
# 6. Copy Access Key ID and Secret Access Key
```

**Step 3: Add to GitHub Secrets**
```bash
# Go to: https://github.com/YOUR-ORG/migraction/settings/secrets/actions

# Secret 1:
# Name: AWS_ACCESS_KEY_ID
# Value: AKIAIOSFODNN7EXAMPLE

# Secret 2:
# Name: AWS_SECRET_ACCESS_KEY
# Value: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Step 4: Add Variables (Already Done)**
```bash
# Verify these variables exist:
# - AWS_REGION
# - AWS_BUCKET_NAME
```

**Step 5: Test Access**
```bash
# On your local machine or runner
export AWS_ACCESS_KEY_ID="your-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Test
aws s3 ls s3://acme-gh-migrations/
# Should list empty bucket or return no error
```

---

## 📦 Optional: Pre-Cache Tools & Package Managers

For large-scale migrations (1000+ repos), pre-caching data improves performance and reduces API calls during migration.

### Install Migration Tools

The framework uses several migration tools for different asset types. Install these on a machine with access to your source instance.

```bash
# On your local machine or a dedicated migration management machine

# 1. Install releases migration tool
gh extension install mona-actions/gh-migrate-releases

# 2. Install LFS migration tool
gh extension install mona-actions/gh-migrate-lfs

# 3. Install packages migration tool
gh extension install mona-actions/gh-migrate-packages

# 4. Install environments migration tool
gh extension install mona-actions/gh-migrate-environments

# Verify installations
gh extensions list
```

**Tool Reference:**

| Tool | Purpose | Repository | Required For |
|------|---------|------------|--------------|
| `gh-migrate-releases` | Export/migrate releases and assets | [mona-actions/gh-migrate-releases](https://github.com/mona-actions/gh-migrate-releases) | Repositories with GitHub Releases |
| `gh-migrate-lfs` | Export/migrate Git LFS objects | [mona-actions/gh-migrate-lfs](https://github.com/mona-actions/gh-migrate-lfs) | Repositories with LFS files |
| `gh-migrate-packages` | Export/migrate packages | [mona-actions/gh-migrate-packages](https://github.com/mona-actions/gh-migrate-packages) | Repositories with packages |
| `gh-migrate-environments` | Export/migrate deployment environments | [mona-actions/gh-migrate-environments](https://github.com/mona-actions/gh-migrate-environments) | Repositories with environments |

### Install Package Manager Tools (For Package Migration)

If you're migrating repositories with packages, install the relevant package managers on your runner servers.

**On each runner server:**

```bash
# SSH to runner server
ssh ubuntu@runner-server

# 1. NPM (Node.js packages) - Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v22.x.x
npm --version

# 2. NuGet (.NET packages)
sudo apt-get install -y mono-complete
wget https://dist.nuget.org/win-x86-commandline/latest/nuget.exe
sudo mkdir -p /usr/local/bin
sudo mv nuget.exe /usr/local/bin/
echo 'alias nuget="mono /usr/local/bin/nuget.exe"' >> ~/.bashrc
source ~/.bashrc

# 3. Maven (Java packages)
sudo apt-get install -y maven
mvn --version

# 4. Gradle (Java/Android packages)
wget https://services.gradle.org/distributions/gradle-8.4-bin.zip
sudo mkdir /opt/gradle
sudo unzip -d /opt/gradle gradle-8.4-bin.zip
echo 'export PATH=$PATH:/opt/gradle/gradle-8.4/bin' >> ~/.bashrc
source ~/.bashrc
gradle --version

# 5. RubyGems (Ruby packages)
sudo apt-get install -y ruby-full
gem --version

# 6. Docker (Container packages)
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify Docker
docker --version
```

**Package Manager Summary:**

| Package Type | Tool | Command to Verify | Used For |
|--------------|------|-------------------|----------|
| **npm** | Node.js & npm | `npm --version` | JavaScript/Node.js packages |
| **NuGet** | NuGet CLI | `nuget` | .NET packages |
| **Maven** | Apache Maven | `mvn --version` | Java packages (Maven) |
| **Gradle** | Gradle | `gradle --version` | Java/Android packages (Gradle) |
| **RubyGems** | gem | `gem --version` | Ruby gems |
| **Docker** | Docker Engine | `docker --version` | Container images |

**Note:** Only install the package managers you need based on your repositories. The migration workflow will automatically detect which packages exist and use the appropriate tools.

### Export Data to Cache

Pre-export data to the local cache to speed up migrations.

**Example: Export Releases**
```bash
# Authenticate to source instance
gh auth login --hostname ghes.acme-corp.com

# Export releases for all repos in an org
gh migrate-releases export \
  --source-org engineering \
  --cache-dir /tmp/migration-cache \
  --token $GHES_PROD_TOKEN

# Copy to runner server(s)
rsync -avz /tmp/migration-cache/ ubuntu@runner-server:/opt/migration/

# Verify on runner
ssh ubuntu@runner-server "ls -la /opt/migration/releases/"
```

**Example: Export LFS Objects**
```bash
# Export LFS data
gh migrate-lfs export \
  --source-org engineering \
  --cache-dir /tmp/migration-cache \
  --token $GHES_PROD_TOKEN

# This generates: /tmp/migration-cache/engineering_lfs.csv
# CSV format: CloneURL,Repository,[additional columns...]

# Copy to runner (including the generated engineering_lfs.csv)
rsync -avz /tmp/migration-cache/ ubuntu@runner-server:/opt/migration/
```

**LFS CSV File Location:**
- **Path:** `${LOCAL_CACHE_DIR}/${ORG}_lfs.csv` (e.g., `/opt/migration/engineering_lfs.csv`)
- **Generated by:** `gh migrate-lfs export` command
- **Required for:** Repositories with Git LFS objects
- **Format:**
  ```csv
  CloneURL,Repository
  https://github.com/org/repo1.git,repo1
  https://github.com/org/repo2.git,repo2
  ```

The framework automatically detects LFS repos by checking this CSV file during migration.

**Example: Export Packages**
```bash
# Export package metadata
gh migrate-packages export \
  --source-org engineering \
  --cache-dir /tmp/migration-cache \
  --token $GHES_PROD_TOKEN

# This creates CSV files with package information
# Copy to runner
rsync -avz /tmp/migration-cache/packages/ ubuntu@runner-server:/opt/migration/packages/
```

**Example: Export Environments**
```bash
# Export deployment environments
gh migrate-environments export \
  --source-org engineering \
  --cache-dir /tmp/migration-cache \
  --token $GHES_PROD_TOKEN

# Creates: engineering_environments.csv
# Copy to runner
rsync -avz /tmp/migration-cache/*.csv ubuntu@runner-server:/opt/migration/
```

### Verify Cache on Runner

```bash
# SSH to runner server
ssh ubuntu@runner-server

# Check cache structure
ls -la /opt/migration/

# Expected structure:
# drwxr-xr-x packages/
# │   └── export/
# │       └── *.csv (package metadata)
# drwxr-xr-x releases/
# │   └── engineering/
# │       └── repo-name/ (release data)
# -rw-r--r-- engineering_environments.csv
# -rw-r--r-- engineering_lfs.csv (if LFS repos exist)
# drwxr-xr-x lfs/ (if LFS data exported)

# Check disk space
df -h /opt/migration
```

**Benefits of Pre-Caching:**
- ⚡ 3-5x faster migrations (data already local)
- 🔄 Reduced API rate limit pressure
- 📊 Parallel processing without export bottleneck
- 🎯 Validate data integrity before migration starts
- 🔍 Identify issues early (missing assets, corrupted data)

---

## ✅ Validation & Testing

### Step 1: Validate Configuration

```bash
# On your local machine, in the repo directory
node .github/scripts/config/validate.js
```

**Expected Output:**
```
✓ Configuration file is valid JSON
✓ Sources: 2
✓ Targets: 1
  ✓ GHES Production: 3 orgs
  ✓ GHEC Legacy: 1 orgs
  ✓ GHEC EMU Production: 1 orgs

✅ Configuration is valid!
```

### Step 2: Verify Secrets

```bash
# List secrets (values are hidden)
gh secret list --repo YOUR-ORG/migraction

# Expected output:
# GHES_PROD_TOKEN        Updated 2024-01-15
# GHEC_LEGACY_TOKEN      Updated 2024-01-15
# GHEC_EMU_TOKEN         Updated 2024-01-15
# AZURE_STORAGE_CONNECTION_STRING  Updated 2024-01-15
```

### Step 3: Verify Variables

```bash
# List variables
gh variable list --repo YOUR-ORG/migraction

# Expected output:
# INSTALL_PREREQS       true
# LOCAL_CACHE_DIR       /opt/migration
# AWS_REGION           us-east-1 (if using AWS)
# AWS_BUCKET_NAME      acme-gh-migrations (if using AWS)
```

### Step 4: Verify Runners

```
# Visit: https://github.com/YOUR-ORG/migraction/settings/actions/runners

# Check:
✅ All runners show "Idle" status
✅ Labels include: self-hosted, Linux, X64
✅ Runner version is recent
```

### Step 5: Test Workflow

```bash
# Trigger a simple workflow to test runners
# Go to: https://github.com/YOUR-ORG/migraction/actions

# Manual trigger test workflow (if available) or:
# Create a test issue to trigger prepare.yml
```

---

## 🚀 First Migration

### Step 1: Prepare Test Repositories

```bash
# Create 2-3 small test repositories in your source org
# These will be used for dry-run testing

# Example:
# - test-repo-1 (simple repo with a few commits)
# - test-repo-2 (repo with README and some files)
# - test-repo-3 (repo with branches)
```

### Step 2: Create Migration Issue

1. **Navigate to Issues:**
   ```
   https://github.com/YOUR-ORG/migraction/issues/new/choose
   ```

2. **Select Template:**
   - Click "🚀 Migrate Repositories to GitHub Enterprise Cloud"

3. **Fill Out Form:**
   - **Source Instance**: Select your source (e.g., "GHES Production")
   - **Target Instance**: Select your target (e.g., "GHEC EMU Production")
   - **Visibility**: Private
   - **Priority**: Normal
   - Click "Submit new issue"

### Step 3: Follow the 4-Step Workflow

**Step 1: Issue Created** ✅
- System validates your access

**Step 2: Select Organizations**
- Wait for automated comment with checkboxes
- Edit the comment
- Check ONE source org
- Check ONE target org
- Save comment

**Step 3: Provide Repository URLs**
- Wait for automated comment
- Create new comment with test repo URLs:
  ```
  https://ghes.acme-corp.com/engineering/test-repo-1
  https://ghes.acme-corp.com/engineering/test-repo-2
  https://ghes.acme-corp.com/engineering/test-repo-3
  ```

**Step 4: Run Dry-Run**
- Wait for automated comment with commands
- Post comment: `/run-dry-run-migration`

### Step 4: Monitor Migration

1. **Watch Issue Comments:**
   - Real-time progress updates
   - Batch status
   - Completion notification

2. **Check Actions Tab:**
   ```
   https://github.com/YOUR-ORG/migraction/actions
   ```
   - Click on running workflow
   - View detailed logs

3. **Verify in Target Org:**
   ```
   https://github.com/acme-emu
   ```
   - Check for test repositories (GEI adds suffix for dry-run)
   - Verify commits and files migrated

### Step 5: Clean Up Test Migration

```bash
# In the issue, post comment:
/delete-dry-run

# This removes all dry-run test repositories
```

### Step 6: Production Migration

Once dry-run succeeds:

1. **Create new issue** for production migration
2. **Follow same steps** but use:
   ```
   /run-production-migration
   ```
3. **Note**: Production mode locks source repositories

---

## 🎉 Setup Complete!

You've successfully set up the migration framework! 

### Next Steps:

- 📖 Read the main [README.md](README.md) for detailed usage
- 🔍 Review [Troubleshooting](README.md#-troubleshooting) section
- 📊 Plan your migration batches
- 👥 Add additional users to `instances.json` as needed
- 🔄 Set calendar reminders to rotate tokens every 90 days

### Maintenance Checklist:

**Weekly:**
- [ ] Check runner status
- [ ] Monitor disk space on runner server
- [ ] Review completed migrations

**Monthly:**
- [ ] Review and update `allowedUsers` in `instances.json`
- [ ] Clean up old data in `/opt/migration`
- [ ] Review cloud storage costs

**Quarterly:**
- [ ] Rotate all PATs
- [ ] Review and update token scopes
- [ ] Audit migration logs

---

## 📞 Need Help?

- 📖 **Documentation**: [README.md](README.md)
- 🐛 **Issues**: Create an issue in this repository
- 💬 **Discussions**: Use GitHub Discussions for questions

**Quick Links:**
- [GEI Documentation](https://docs.github.com/en/migrations/using-github-enterprise-importer)
- [GitHub Actions Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Managing PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

---

<div align="center">

**🎯 Setup Complete!** | **Ready to Migrate** | **Go Build Something Amazing**

</div>
