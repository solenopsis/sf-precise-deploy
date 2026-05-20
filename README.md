# sf-precise-deploy

[![CI](https://github.com/solenopsis/sf-precise-deploy/actions/workflows/ci.yml/badge.svg)](https://github.com/solenopsis/sf-precise-deploy/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40flossware%2Fsf-precise-deploy.svg)](https://www.npmjs.com/package/@flossware/sf-precise-deploy)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Salesforce CLI plugin for surgical deployments with field-level delta detection.

## Why?

Modern Salesforce deployment tools (SF CLI, sfdx-git-delta) detect changes at the **file level**. If you modify one field in an object with 200 fields, you deploy the entire object file.

**sf-precise-deploy** analyzes metadata at the **field level**, enabling surgical deployments:
- 🎯 Deploy only the fields that changed
- 🔪 Generate field-level destructive changes
- ⚡ Reduce deployment conflicts and time
- 🔄 Git-based or directory-based comparison
- 🛡️ Comprehensive error handling

## Features

### 🎯 Field-Level Delta Detection
Parses metadata XML to detect changes within files:
- CustomField
- ValidationRule
- RecordType
- WorkflowRule
- And more...

### 🔪 Surgical Destructive Changes
Auto-generates `destructiveChanges.xml` with individual field deletions instead of entire objects.

### 🔄 Pre-Deploy Transformations
Apply transformations to metadata before deployment:
- Variable substitution
- Environment-specific modifications
- Profile/permission set sanitization

### 📊 Smart Comparison
Three modes to fit your workflow:
- **Git-only**: Fast, uses git history (file-level)
- **Smart**: Retrieves only changed files, field-level diffs
- **Full audit**: Complete org comparison

## Installation

```bash
sf plugins install @flossware/sf-precise-deploy
```

## Quick Start

### Compare Directories (Field-Level)
```bash
sf precise delta \
  --source-dir force-app/main/default \
  --target-dir retrieved/main/default
```

### Compare Git Refs (Field-Level)
```bash
sf precise git-delta --from origin/main --to HEAD
```

### Deploy with Field-Level Delta
```bash
# Git-based
sf precise deploy --target-org myOrg --git-ref origin/main

# Directory-based
sf precise deploy \
  --target-org myOrg \
  --source-dir force-app \
  --target-dir retrieved
```

## Commands

| Command | Description |
|---------|-------------|
| `sf precise delta` | Analyze field-level changes between directories |
| `sf precise git-delta` | Analyze field-level changes between git refs |
| `sf precise deploy` | Deploy with field-level delta detection |

Run `sf precise <command> --help` for detailed options.

## Supported Metadata Types

**40+ metadata child element types across:**
- Objects (fields, validation rules, record types, etc.)
- Workflows (alerts, field updates, rules)
- Flows (decisions, formulas, variables, etc.)
- Profiles & Permission Sets
- Custom Metadata

See [DEVELOPMENT.md](DEVELOPMENT.md) for the complete list.

## Comparison

| Feature | SF CLI | sfdx-git-delta | sf-precise-deploy |
|---------|--------|----------------|-------------------|
| Git integration | ❌ | ✅ | ✅ |
| Auto destructiveChanges.xml | ❌ | ✅ Files | ✅ **Fields** |
| Field-level detection | ❌ | ❌ | ✅ |
| Modern TypeScript | ✅ | ✅ | ✅ |
| Error handling | ✅ | ✅ | ✅ |

**Key Differentiator:** Field-level destructive changes - nobody else does this.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development

```bash
git clone https://github.com/solenopsis/sf-precise-deploy
cd sf-precise-deploy
npm install
npm run build
npm test
sf plugins link .
```

## Testing

```bash
npm test                    # Run all tests (40+ tests)
npm run lint                # Lint code
npm run build               # Compile TypeScript
```

## Inspired By

This plugin preserves the field-level diff capabilities of [Solenopsis](https://github.com/solenopsis/Solenopsis), a pioneering Salesforce deployment tool, while modernizing the implementation for the SF CLI ecosystem.

## License

GPL-3.0 - Same as Solenopsis

## Author

Scot P. Floess

---

**Star this repo** if you find it useful! ⭐
