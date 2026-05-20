import { expect } from 'chai';
import FieldDiffEngine from '../../src/lib/field-diff-engine.js';
import MetadataParser from '../../src/lib/metadata-parser.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FieldDiffEngine', () => {
  let engine: FieldDiffEngine;
  let tempDir: string;

  beforeEach(async () => {
    engine = new FieldDiffEngine();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sf-precise-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('compareDirectories', () => {
    it('should detect added fields', async () => {
      // Create source with new field
      const sourceDir = path.join(tempDir, 'source');
      await fs.mkdir(path.join(sourceDir, 'objects'), { recursive: true });

      const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>ExistingField__c</fullName>
        <type>Text</type>
    </fields>
    <fields>
        <fullName>NewField__c</fullName>
        <type>Text</type>
    </fields>
</CustomObject>`;

      await fs.writeFile(path.join(sourceDir, 'objects', 'Account.object'), sourceXml);

      // Create target without new field
      const targetDir = path.join(tempDir, 'target');
      await fs.mkdir(path.join(targetDir, 'objects'), { recursive: true });

      const targetXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>ExistingField__c</fullName>
        <type>Text</type>
    </fields>
</CustomObject>`;

      await fs.writeFile(path.join(targetDir, 'objects', 'Account.object'), targetXml);

      // Compare
      const diff = await engine.compareDirectories(sourceDir, targetDir);

      expect(diff.addedFields).to.have.lengthOf(1);
      expect(diff.addedFields[0]).to.deep.include({
        type: 'CustomField',
        name: 'NewField__c',
        parent: 'Account',
        action: 'added',
      });
      expect(diff.deletedFields).to.have.lengthOf(0);
    });

    it('should detect deleted fields', async () => {
      // Create source without field
      const sourceDir = path.join(tempDir, 'source');
      await fs.mkdir(path.join(sourceDir, 'objects'), { recursive: true });

      const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>ExistingField__c</fullName>
        <type>Text</type>
    </fields>
</CustomObject>`;

      await fs.writeFile(path.join(sourceDir, 'objects', 'Account.object'), sourceXml);

      // Create target with field to delete
      const targetDir = path.join(tempDir, 'target');
      await fs.mkdir(path.join(targetDir, 'objects'), { recursive: true });

      const targetXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>ExistingField__c</fullName>
        <type>Text</type>
    </fields>
    <fields>
        <fullName>OldField__c</fullName>
        <type>Text</type>
    </fields>
</CustomObject>`;

      await fs.writeFile(path.join(targetDir, 'objects', 'Account.object'), targetXml);

      // Compare
      const diff = await engine.compareDirectories(sourceDir, targetDir);

      expect(diff.addedFields).to.have.lengthOf(0);
      expect(diff.deletedFields).to.have.lengthOf(1);
      expect(diff.deletedFields[0]).to.deep.include({
        type: 'CustomField',
        name: 'OldField__c',
        parent: 'Account',
        action: 'deleted',
      });
    });

    it('should detect added files', async () => {
      const sourceDir = path.join(tempDir, 'source');
      await fs.mkdir(path.join(sourceDir, 'objects'), { recursive: true });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>Field__c</fullName>
        <type>Text</type>
    </fields>
</CustomObject>`;

      await fs.writeFile(path.join(sourceDir, 'objects', 'NewObject__c.object'), xml);

      const targetDir = path.join(tempDir, 'target');
      await fs.mkdir(path.join(targetDir, 'objects'), { recursive: true });

      const diff = await engine.compareDirectories(sourceDir, targetDir);

      expect(diff.addedFiles).to.have.lengthOf(1);
      expect(diff.addedFiles[0]).to.include('NewObject__c.object');
    });

    it('should detect deleted files', async () => {
      const sourceDir = path.join(tempDir, 'source');
      await fs.mkdir(path.join(sourceDir, 'objects'), { recursive: true });

      const targetDir = path.join(tempDir, 'target');
      await fs.mkdir(path.join(targetDir, 'objects'), { recursive: true });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>Field__c</fullName>
        <type>Text</type>
    </fields>
</CustomObject>`;

      await fs.writeFile(path.join(targetDir, 'objects', 'OldObject__c.object'), xml);

      const diff = await engine.compareDirectories(sourceDir, targetDir);

      expect(diff.deletedFiles).to.have.lengthOf(1);
      expect(diff.deletedFiles[0]).to.include('OldObject__c.object');
    });

    it('should detect multiple field types', async () => {
      const sourceDir = path.join(tempDir, 'source');
      await fs.mkdir(path.join(sourceDir, 'objects'), { recursive: true });

      const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>Field1__c</fullName>
        <type>Text</type>
    </fields>
    <validationRules>
        <fullName>NewRule</fullName>
        <active>true</active>
    </validationRules>
</CustomObject>`;

      await fs.writeFile(path.join(sourceDir, 'objects', 'Account.object'), sourceXml);

      const targetDir = path.join(tempDir, 'target');
      await fs.mkdir(path.join(targetDir, 'objects'), { recursive: true });

      const targetXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>Field1__c</fullName>
        <type>Text</type>
    </fields>
    <validationRules>
        <fullName>OldRule</fullName>
        <active>true</active>
    </validationRules>
</CustomObject>`;

      await fs.writeFile(path.join(targetDir, 'objects', 'Account.object'), targetXml);

      const diff = await engine.compareDirectories(sourceDir, targetDir);

      expect(diff.addedFields).to.have.lengthOf(1);
      expect(diff.addedFields[0].type).to.equal('ValidationRule');
      expect(diff.addedFields[0].name).to.equal('NewRule');

      expect(diff.deletedFields).to.have.lengthOf(1);
      expect(diff.deletedFields[0].type).to.equal('ValidationRule');
      expect(diff.deletedFields[0].name).to.equal('OldRule');
    });

    it('should handle empty directories', async () => {
      const sourceDir = path.join(tempDir, 'source');
      await fs.mkdir(sourceDir, { recursive: true });

      const targetDir = path.join(tempDir, 'target');
      await fs.mkdir(targetDir, { recursive: true });

      const diff = await engine.compareDirectories(sourceDir, targetDir);

      expect(diff.addedFields).to.have.lengthOf(0);
      expect(diff.deletedFields).to.have.lengthOf(0);
      expect(diff.addedFiles).to.have.lengthOf(0);
      expect(diff.deletedFiles).to.have.lengthOf(0);
    });
  });
});
