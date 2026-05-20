import { expect } from 'chai';
import DestructiveChangesGenerator from '../../src/lib/destructive-changes-generator.js';
import { FieldDiff } from '../../src/lib/field-diff-engine.js';

describe('DestructiveChangesGenerator', () => {
  let generator: DestructiveChangesGenerator;

  beforeEach(() => {
    generator = new DestructiveChangesGenerator();
  });

  describe('generateDestructiveChanges', () => {
    it('should generate XML for field deletions', () => {
      const deletedFields: FieldDiff[] = [
        {
          type: 'CustomField',
          name: 'OldField__c',
          parent: 'Account',
          action: 'deleted',
        },
        {
          type: 'CustomField',
          name: 'AnotherField__c',
          parent: 'Contact',
          action: 'deleted',
        },
      ];

      const xml = generator.generateDestructiveChanges(deletedFields, '61.0');

      expect(xml).to.include('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).to.include('<Package xmlns="http://soap.sforce.com/2006/04/metadata">');
      expect(xml).to.include('<version>61.0</version>');
      expect(xml).to.include('<name>CustomField</name>');
      expect(xml).to.include('<members>Account.OldField__c</members>');
      expect(xml).to.include('<members>Contact.AnotherField__c</members>');
    });

    it('should group fields by type', () => {
      const deletedFields: FieldDiff[] = [
        {
          type: 'CustomField',
          name: 'Field1__c',
          parent: 'Account',
          action: 'deleted',
        },
        {
          type: 'ValidationRule',
          name: 'Rule1',
          parent: 'Account',
          action: 'deleted',
        },
        {
          type: 'CustomField',
          name: 'Field2__c',
          parent: 'Contact',
          action: 'deleted',
        },
      ];

      const xml = generator.generateDestructiveChanges(deletedFields, '61.0');

      // Should have two <types> sections
      const typesCount = (xml.match(/<types>/g) || []).length;
      expect(typesCount).to.equal(2);

      // Should group CustomFields together
      expect(xml).to.include('<name>CustomField</name>');
      expect(xml).to.include('<name>ValidationRule</name>');
    });

    it('should escape XML special characters', () => {
      const deletedFields: FieldDiff[] = [
        {
          type: 'CustomField',
          name: 'Field<>&"\'',
          parent: 'Account',
          action: 'deleted',
        },
      ];

      const xml = generator.generateDestructiveChanges(deletedFields, '61.0');

      expect(xml).to.include('&lt;');
      expect(xml).to.include('&gt;');
      expect(xml).to.include('&amp;');
      expect(xml).to.include('&quot;');
      expect(xml).to.include('&apos;');
    });

    it('should generate empty package for no deletions', () => {
      const xml = generator.generateDestructiveChanges([], '61.0');

      expect(xml).to.include('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).to.include('<Package xmlns="http://soap.sforce.com/2006/04/metadata">');
      expect(xml).to.include('<version>61.0</version>');
      expect(xml).not.to.include('<types>');
    });

    it('should use specified API version', () => {
      const deletedFields: FieldDiff[] = [
        {
          type: 'CustomField',
          name: 'Field__c',
          parent: 'Account',
          action: 'deleted',
        },
      ];

      const xml = generator.generateDestructiveChanges(deletedFields, '60.0');

      expect(xml).to.include('<version>60.0</version>');
    });
  });

  describe('generateDestructiveChangesFromFiles', () => {
    it('should generate XML for deleted files', () => {
      const deletedFiles = [
        'classes/OldClass.cls',
        'triggers/OldTrigger.trigger',
        'objects/CustomObject__c.object',
      ];

      const xml = generator.generateDestructiveChangesFromFiles(deletedFiles, '61.0');

      expect(xml).to.include('<name>ApexClass</name>');
      expect(xml).to.include('<members>OldClass</members>');
      expect(xml).to.include('<name>ApexTrigger</name>');
      expect(xml).to.include('<members>OldTrigger</members>');
      expect(xml).to.include('<name>CustomObject</name>');
      expect(xml).to.include('<members>CustomObject__c</members>');
    });

    it('should handle various file types', () => {
      const deletedFiles = [
        'pages/MyPage.page',
        'components/MyComponent.component',
        'workflows/Account.workflow',
        'permissionsets/MyPermSet.permissionset',
        'profiles/Admin.profile',
      ];

      const xml = generator.generateDestructiveChangesFromFiles(deletedFiles, '61.0');

      expect(xml).to.include('<name>ApexPage</name>');
      expect(xml).to.include('<name>ApexComponent</name>');
      expect(xml).to.include('<name>Workflow</name>');
      expect(xml).to.include('<name>PermissionSet</name>');
      expect(xml).to.include('<name>Profile</name>');
    });

    it('should skip unsupported file types', () => {
      const deletedFiles = [
        'classes/ValidClass.cls',
        'unknown/file.txt',
        'another/file.unknown',
      ];

      const xml = generator.generateDestructiveChangesFromFiles(deletedFiles, '61.0');

      expect(xml).to.include('<name>ApexClass</name>');
      expect(xml).to.include('<members>ValidClass</members>');
      // Should only have one <types> section for ApexClass
      const typesCount = (xml.match(/<types>/g) || []).length;
      expect(typesCount).to.equal(1);
    });

    it('should generate empty package for no files', () => {
      const xml = generator.generateDestructiveChangesFromFiles([], '61.0');

      expect(xml).to.include('<Package xmlns="http://soap.sforce.com/2006/04/metadata">');
      expect(xml).to.include('<version>61.0</version>');
      expect(xml).not.to.include('<types>');
    });
  });
});
