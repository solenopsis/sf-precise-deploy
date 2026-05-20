# Test Data

Sample Salesforce metadata for testing field-level delta detection.

## Structure

```
test-data/
├── source/          # Local "master" - what you want to deploy
└── target/          # Retrieved from org - current org state
```

## What's Different?

### Account.object
**Added in source** (will be deployed):
- CustomField: `NewField__c`

**Deleted from source** (in target, will be in destructiveChanges.xml):
- CustomField: `OldField__c`
- ValidationRule: `Old_Validation_Rule`
- RecordType: `Standard`

### Account.workflow
**Added in source**:
- WorkflowFieldUpdate: `Update_Last_Modified`

**Deleted from source**:
- WorkflowAlert: `Old_Email_Alert`
- WorkflowRule: `Old_Rule`

### Account_Approval.flow-meta.xml
**Deleted from source**:
- FlowDecision: `Old_Decision`

### Files
**Deleted from source**:
- classes/OldClass.cls

## Expected Results

When running:
```bash
sf precise delta --source-dir test-data/source --target-dir test-data/target
```

You should see:
- **Added fields**: 1 (NewField__c)
- **Deleted fields**: 6 (OldField__c, Old_Validation_Rule, Standard, Old_Email_Alert, Old_Rule, Old_Decision)
- **Modified files**: 3 (Account.object, Account.workflow, Account_Approval.flow-meta.xml)
- **Deleted files**: 1 (OldClass.cls)

The generated `destructiveChanges.xml` should include:
```xml
<types>
    <members>Account.OldField__c</members>
    <name>CustomField</name>
</types>
<types>
    <members>Account.Old_Validation_Rule</members>
    <name>ValidationRule</name>
</types>
<types>
    <members>Account.Standard</members>
    <name>RecordType</name>
</types>
<types>
    <members>Account.Old_Email_Alert</members>
    <name>WorkflowAlert</name>
</types>
<types>
    <members>Account.Old_Rule</members>
    <name>WorkflowRule</name>
</types>
<types>
    <members>Account_Approval.Old_Decision</members>
    <name>FlowDecision</name>
</types>
<types>
    <members>OldClass</members>
    <name>ApexClass</name>
</types>
```
