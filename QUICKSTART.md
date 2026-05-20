# Quick Start Guide

## Installation & Setup

```bash
cd ~/Development/github/solenopsis/sf-precise-deploy

# Install dependencies (already done)
npm install

# Build the project (already done)
npm run build

# Link plugin to SF CLI
sf plugins link .

# Verify installation
sf precise --help
```

## Available Commands

### 1. `sf precise delta` - Directory Comparison
Analyzes field-level changes between two directories.

```bash
sf precise delta \
  --source-dir test-data/source \
  --target-dir test-data/target \
  --output-dir delta-output
```

**What it does:**
- Compares local source (what you want to deploy) vs target (current org state)
- Detects added/deleted fields, validation rules, workflows, etc.
- Generates `destructiveChanges.xml` with field-level deletions

**Try it now:**
```bash
sf precise delta -s test-data/source -t test-data/target -o delta-output
cat delta-output/destructiveChanges.xml
```

---

### 2. `sf precise git-delta` - Git Comparison
Analyzes changes between git refs.

```bash
sf precise git-delta \
  --from origin/main \
  --to HEAD \
  --output-dir delta-output
```

**What it does:**
- Uses git history to find changed files
- Performs field-level analysis on modified metadata
- Generates `destructiveChanges.xml` for field deletions
- Faster than retrieving from org

**Example:**
```bash
# Compare against previous commit
sf precise git-delta --from HEAD~1

# Compare against main branch
sf precise git-delta --from origin/main --to HEAD
```

---

### 3. `sf precise deploy` - Deploy with Field-Level Delta
Deploys to Salesforce with field-level delta detection.

```bash
# Deploy using git comparison
sf precise deploy \
  --target-org myOrg \
  --git-ref origin/main

# Deploy using directory comparison
sf precise deploy \
  --target-org myOrg \
  --source-dir force-app/main/default \
  --target-dir retrieved/main/default

# Validation-only (check-only)
sf precise deploy \
  --target-org myOrg \
  --git-ref origin/main \
  --check-only
```

**What it does:**
- Analyzes field-level changes (git or directory mode)
- Generates field-level destructive changes
- Deploys to Salesforce using Metadata API
- Supports test execution, check-only mode, etc.

---

## Test with Sample Data

We've created sample metadata in `test-data/` to demonstrate field-level diff:

```bash
# Run field-level analysis
sf precise delta -s test-data/source -t test-data/target -o delta-output

# Expected output:
# - Added fields: 1 (Account.NewField__c)
# - Deleted fields: 6 (various)
# - Modified files: 3 (Account.object, Account.workflow, Account_Approval.flow-meta.xml)
```

**View the results:**
```bash
cat delta-output/destructiveChanges.xml
```

Should show field-level deletions like:
```xml
<types>
    <members>Account.OldField__c</members>
    <name>CustomField</name>
</types>
<types>
    <members>Account.Old_Validation_Rule</members>
    <name>ValidationRule</name>
</types>
```

---

## Supported Metadata Types

The parser currently supports field-level analysis for:

### Objects (`.object`)
- CustomField
- ValidationRule
- RecordType
- BusinessProcess
- ListView
- NamedFilter
- WebLink
- ActionOverride
- CompactLayout
- FieldSet
- SharingReason

### Workflows (`.workflow`)
- WorkflowAlert
- WorkflowFieldUpdate
- WorkflowRule
- WorkflowTask
- WorkflowOutboundMessage

### Flows (`.flow-meta.xml`)
- FlowDecision
- FlowFormula
- FlowVariable
- FlowAssignment
- FlowRecordLookup/Create/Update/Delete
- FlowScreen
- FlowLoop
- FlowSubflow

### Profiles & Permission Sets
- Field Permissions
- Object Permissions
- User Permissions
- Class/Page Access
- Layout Assignments
- Record Type Visibility

### Custom Metadata (`.md-meta.xml`)
- CustomMetadataValue

---

## Development Workflow

### 1. Make changes to your code
```bash
# Edit source files in src/
vim src/lib/metadata-parser.ts
```

### 2. Build
```bash
npm run build
```

### 3. Test
```bash
# Run unit tests
npm test

# Test command manually
sf precise delta -s test-data/source -t test-data/target
```

### 4. Lint
```bash
npm run lint
```

---

## Common Use Cases

### Use Case 1: Deploy changes from feature branch
```bash
# 1. Compare your branch against main
sf precise git-delta --from origin/main --to HEAD

# 2. Review destructiveChanges.xml
cat delta/destructiveChanges.xml

# 3. Deploy to sandbox
sf precise deploy --target-org mySandbox --git-ref origin/main

# 4. If validation passes, deploy to production
sf precise deploy --target-org production --git-ref origin/main --test-level RunLocalTests
```

### Use Case 2: Audit org drift
```bash
# 1. Pull from org
sf project retrieve start --target-org qa --manifest manifest/package.xml --output-dir retrieved

# 2. Compare against local source
sf precise delta --source-dir force-app/main/default --target-dir retrieved

# 3. Review what changed in the org vs your codebase
```

### Use Case 3: Field-level cleanup
```bash
# You deleted a field from Account.object locally
# Instead of deploying the entire object (200+ fields):

sf precise delta --source-dir force-app --target-dir retrieved

# Generated destructiveChanges.xml contains ONLY:
# <members>Account.DeletedField__c</members>
# <name>CustomField</name>
```

---

## What Makes This Different?

| Tool | Detection Level | Destructive Changes |
|------|----------------|-------------------|
| `sf project deploy` | File-level | Manual XML creation |
| `sfdx-git-delta` | File-level | Auto-generated (files only) |
| **`sf-precise-deploy`** | **Field-level** | **Auto-generated (fields + files)** |

**Key Advantage:** Delete one field without touching 200 others in the object.

---

## Next Steps

1. ✅ **Test it**: Run the commands against `test-data/`
2. ✅ **Link it**: `sf plugins link .`
3. ⬜ **Real data**: Try with actual Salesforce metadata
4. ⬜ **Contribute**: Add more metadata type support
5. ⬜ **Feedback**: Report issues or suggestions

See `DEVELOPMENT.md` for architecture details and contributing guidelines.
