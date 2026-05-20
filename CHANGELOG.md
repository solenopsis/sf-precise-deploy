# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of sf-precise-deploy
- Field-level delta detection for Salesforce metadata
- Support for Objects, Workflows, Flows, Profiles, Permission Sets, Custom Metadata
- `sf precise delta` command for directory comparison
- `sf precise git-delta` command for git-based comparison
- `sf precise deploy` command for deployment with field-level delta
- Comprehensive unit tests (40+ tests)
- Error handling for edge cases
- Sample test data
- CI/CD workflows for GitHub Actions

### Features
- **Field-Level Destructive Changes**: Generate `destructiveChanges.xml` with individual field deletions
- **Git Integration**: Compare changes between git refs without org retrieval
- **Multiple Metadata Types**: Support for 40+ metadata child element types
- **Error Handling**: Graceful handling of malformed XML, missing files, permission errors
- **Extensible Architecture**: Easy to add new metadata types

## [0.1.0] - Initial Development

### Core Capabilities
- Metadata parser using fast-xml-parser
- Field-level diff engine inspired by Solenopsis
- Destructive changes generator
- Git integration for change detection
- Three SF CLI commands

### Supported Metadata Types

**Objects** (11 types):
- CustomField, ValidationRule, RecordType, BusinessProcess, ListView, NamedFilter, WebLink, ActionOverride, CompactLayout, FieldSet, SharingReason

**Workflows** (5 types):
- WorkflowAlert, WorkflowFieldUpdate, WorkflowRule, WorkflowTask, WorkflowOutboundMessage

**Flows** (11 types):
- FlowDecision, FlowFormula, FlowVariable, FlowAssignment, FlowRecordLookup, FlowRecordCreate, FlowRecordUpdate, FlowRecordDelete, FlowScreen, FlowLoop, FlowSubflow

**Profiles** (7 types):
- ProfileFieldPermissions, ProfileObjectPermissions, ProfileUserPermissions, ProfileClassAccess, ProfilePageAccess, ProfileLayoutAssignment, ProfileRecordTypeVisibility

**Permission Sets** (5 types):
- PermissionSetFieldPermissions, PermissionSetObjectPermissions, PermissionSetUserPermissions, PermissionSetClassAccess, PermissionSetPageAccess

**Custom Metadata** (1 type):
- CustomMetadataValue

---

## Roadmap

### v0.2.0 (Planned)
- [ ] Pre-deploy transformation pipeline
- [ ] Profile/permission set sanitization
- [ ] Package.xml generation for changed files
- [ ] JSON output for CI/CD
- [ ] Progress indicators

### v0.3.0 (Planned)
- [ ] Support for more metadata types (Custom Metadata Types, Translations, etc.)
- [ ] Smart retrieval optimization
- [ ] Deployment result visualization
- [ ] Integration with popular CI/CD platforms

### v1.0.0 (Planned)
- [ ] Full feature parity with Solenopsis field-level capabilities
- [ ] Comprehensive documentation site
- [ ] Video tutorials
- [ ] Performance optimization
- [ ] Production-ready stability

---

[Unreleased]: https://github.com/solenopsis/sf-precise-deploy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/solenopsis/sf-precise-deploy/releases/tag/v0.1.0
