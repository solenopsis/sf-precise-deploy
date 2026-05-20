# Development Guide for sf-precise-deploy

## What We've Built

A modern Salesforce CLI plugin that brings field-level delta detection to SF CLI deployments, inspired by Solenopsis's unique capabilities.

### Project Structure

```
sf-precise-deploy/
├── src/
│   ├── commands/
│   │   └── precise/
│   │       └── delta.ts          # Main command: sf precise delta
│   ├── lib/
│   │   ├── metadata-parser.ts           # Parses metadata XML
│   │   ├── field-diff-engine.ts         # Field-level diff logic
│   │   └── destructive-changes-generator.ts  # Generates XML
│   └── index.ts                  # Public exports
├── messages/
│   └── precise.delta.md          # Command help messages
├── test/
│   └── lib/
│       └── metadata-parser.test.ts  # Unit tests
└── lib/                          # Compiled JavaScript (generated)
```

## Core Components

### 1. MetadataParser
**File**: `src/lib/metadata-parser.ts`

Parses Salesforce metadata XML files to extract field-level components:
- CustomField
- ValidationRule
- RecordType
- BusinessProcess
- WorkflowRule
- WorkflowFieldUpdate
- ListView, NamedFilter, WebLink, ActionOverride

Based on Solenopsis's XPath parsing logic, modernized with `fast-xml-parser`.

### 2. FieldDiffEngine
**File**: `src/lib/field-diff-engine.ts`

Compares two directories (source vs target) and detects:
- Added fields
- Deleted fields
- Modified files
- Added/deleted files

This is the **core differentiator** - nobody else does field-level diffs.

### 3. DestructiveChangesGenerator
**File**: `src/lib/destructive-changes-generator.ts`

Generates `destructiveChanges.xml` with field-level precision:
```xml
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>Account.OldField__c</members>
        <name>CustomField</name>
    </types>
    <version>61.0</version>
</Package>
```

### 4. Command: sf precise delta
**File**: `src/commands/precise/delta.ts`

CLI command that orchestrates the analysis:
```bash
sf precise delta \
  --source-dir force-app/main/default \
  --target-dir retrieved/main/default \
  --output-dir delta \
  --api-version 61.0
```

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Clean build artifacts
npm run clean

# Run tests
npm test

# Lint code
npm run lint

# Link plugin for local testing
npm link
sf plugins link .
```

## Testing the Plugin Locally

1. **Build the plugin**:
   ```bash
   npm run build
   ```

2. **Link to SF CLI**:
   ```bash
   sf plugins link .
   ```

3. **Verify it's installed**:
   ```bash
   sf plugins
   sf precise --help
   ```

4. **Test with sample metadata**:
   ```bash
   # Create test directories
   mkdir -p test-data/source/objects
   mkdir -p test-data/target/objects

   # Add sample object files
   # (create Account.object in both with different fields)

   # Run the command
   sf precise delta \
     --source-dir test-data/source \
     --target-dir test-data/target \
     --output-dir delta-output
   ```

## Next Steps

### Phase 1: Core Functionality (Current)
- [x] Project scaffolding
- [x] Metadata parser
- [x] Field diff engine
- [x] Destructive changes generator
- [x] Basic CLI command
- [ ] Comprehensive unit tests
- [ ] Integration tests

### Phase 2: Enhanced Features
- [ ] Support more metadata types (Flows, CustomMetadata, etc.)
- [ ] Package.xml generation for changed files
- [ ] Git integration (compare commits vs directories)
- [ ] Pre-deploy transformation pipeline
- [ ] Profile/permset sanitization

### Phase 3: Deployment Integration
- [ ] `sf precise deploy` command (deploy with field-level delta)
- [ ] Retrieve command (smart pull)
- [ ] Three modes: git-only, smart, full-audit
- [ ] Integration with `@salesforce/source-deploy-retrieve`

### Phase 4: Polish
- [ ] Better error messages
- [ ] Progress indicators
- [ ] JSON output for CI/CD
- [ ] Documentation site
- [ ] Plugin publishing to npm

## Adding More Metadata Types

To support additional metadata types, update `src/lib/metadata-parser.ts`:

```typescript
{
  directory: 'flows',
  extension: '.flow',
  childElements: [
    { name: 'FlowDecision', xpath: 'Flow.decisions', idField: 'name' },
    { name: 'FlowFormula', xpath: 'Flow.formulas', idField: 'name' },
    // Add more...
  ],
}
```

## Testing Strategy

1. **Unit Tests**: Test each component in isolation
   - MetadataParser: Parse various XML structures
   - FieldDiffEngine: Compare directories with known changes
   - DestructiveChangesGenerator: Verify XML output

2. **Integration Tests**: End-to-end scenarios
   - Create sample metadata trees
   - Run commands
   - Verify output files

3. **Manual Testing**: Real-world scenarios
   - Pull from actual org
   - Compare against local changes
   - Deploy with generated destructiveChanges.xml

## Architecture Decisions

### Why TypeScript ES Modules?
- Modern SF CLI plugins use ES modules
- Better interop with `@salesforce/source-deploy-retrieve`
- Future-proof

### Why fast-xml-parser?
- Lightweight and fast
- Good for parsing (not building)
- Supports complex Salesforce XML

### Why Not Use Solenopsis's XSLT Approach?
- XSLT is powerful but hard to maintain
- Modern JS/TS is more accessible to contributors
- Can always add XSLT/transformation layer later

## Contributing

The goal is to preserve Solenopsis's field-level diff capability in a modern, maintainable form.

Key principles:
- **Surgical precision**: Field-level, not file-level
- **Performance**: Smart retrievals, not full pulls
- **Usability**: Clear commands, good errors
- **Compatibility**: Works with SF CLI ecosystem

## Resources

- [Solenopsis Original](https://github.com/solenopsis/Solenopsis)
- [SF CLI Plugin Development](https://github.com/salesforcecli/cli)
- [oclif Framework](https://oclif.io/)
- [Salesforce Source Deploy Retrieve](https://github.com/forcedotcom/source-deploy-retrieve)
