import { expect } from 'chai';
import MetadataParser from '../../src/lib/metadata-parser.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MetadataParser', () => {
  let parser: MetadataParser;
  let tempDir: string;

  beforeEach(async () => {
    parser = new MetadataParser();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sf-precise-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('parseFile', () => {
    it('should parse CustomFields from an object file', async () => {
      const objectXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>Field1__c</fullName>
        <type>Text</type>
        <length>255</length>
    </fields>
    <fields>
        <fullName>Field2__c</fullName>
        <type>Number</type>
        <precision>18</precision>
        <scale>0</scale>
    </fields>
</CustomObject>`;

      const filePath = path.join(tempDir, 'Account.object');
      await fs.writeFile(filePath, objectXml);

      const fields = await parser.parseFile(filePath);

      expect(fields).to.have.lengthOf(2);
      expect(fields[0]).to.deep.include({
        type: 'CustomField',
        name: 'Field1__c',
        parent: 'Account',
      });
      expect(fields[1]).to.deep.include({
        type: 'CustomField',
        name: 'Field2__c',
        parent: 'Account',
      });
    });

    it('should parse ValidationRules from an object file', async () => {
      const objectXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <validationRules>
        <fullName>Amount_Must_Be_Positive</fullName>
        <errorConditionFormula>Amount__c &lt; 0</errorConditionFormula>
    </validationRules>
</CustomObject>`;

      const filePath = path.join(tempDir, 'Opportunity.object');
      await fs.writeFile(filePath, objectXml);

      const fields = await parser.parseFile(filePath);

      expect(fields).to.have.lengthOf(1);
      expect(fields[0]).to.deep.include({
        type: 'ValidationRule',
        name: 'Amount_Must_Be_Positive',
        parent: 'Opportunity',
      });
    });

    it('should parse WorkflowRules from a workflow file', async () => {
      const workflowXml = `<?xml version="1.0" encoding="UTF-8"?>
<Workflow xmlns="http://soap.sforce.com/2006/04/metadata">
    <rules>
        <fullName>Email_On_High_Value</fullName>
        <active>true</active>
    </rules>
    <alerts>
        <fullName>Send_Email_Alert</fullName>
        <description>Send email to manager</description>
    </alerts>
</Workflow>`;

      const filePath = path.join(tempDir, 'Account.workflow');
      await fs.writeFile(filePath, workflowXml);

      const fields = await parser.parseFile(filePath);

      expect(fields).to.have.lengthOf(2);
      expect(fields.find((f) => f.type === 'WorkflowRule')).to.deep.include({
        type: 'WorkflowRule',
        name: 'Email_On_High_Value',
        parent: 'Account',
      });
      expect(fields.find((f) => f.type === 'WorkflowAlert')).to.deep.include({
        type: 'WorkflowAlert',
        name: 'Send_Email_Alert',
        parent: 'Account',
      });
    });
  });

  describe('getMetadataConfigs', () => {
    it('should return metadata type configurations', () => {
      const configs = MetadataParser.getMetadataConfigs();
      expect(configs).to.be.an('array');
      expect(configs.length).to.be.greaterThan(0);

      const objectConfig = configs.find((c) => c.directory === 'objects');
      expect(objectConfig).to.exist;
      expect(objectConfig?.extension).to.equal('.object');
    });
  });
});
