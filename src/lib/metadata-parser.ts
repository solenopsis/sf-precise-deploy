import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs/promises';

/**
 * Metadata types that support field-level diff detection
 */
export interface MetadataTypeConfig {
  directory: string;
  extension: string;
  childElements: Array<{
    name: string;
    xpath: string;
    idField: string;
  }>;
}

/**
 * Parsed field from metadata XML
 */
export interface ParsedField {
  type: string;
  name: string;
  parent: string;
}

/**
 * MetadataParser - Extracts field-level information from Salesforce metadata XML files
 *
 * Inspired by Solenopsis's BeanShell XPath parsing, modernized with fast-xml-parser
 */
export default class MetadataParser {
  private parser: XMLParser;

  /**
   * Metadata type configurations for field-level parsing
   * Based on Solenopsis's getApplyXpaths() logic, extended with modern metadata types
   */
  private static readonly METADATA_CONFIGS: MetadataTypeConfig[] = [
    {
      directory: 'objects',
      extension: '.object',
      childElements: [
        { name: 'CustomField', xpath: 'CustomObject.fields', idField: 'fullName' },
        { name: 'ValidationRule', xpath: 'CustomObject.validationRules', idField: 'fullName' },
        { name: 'RecordType', xpath: 'CustomObject.recordTypes', idField: 'fullName' },
        { name: 'BusinessProcess', xpath: 'CustomObject.businessProcesses', idField: 'fullName' },
        { name: 'ListView', xpath: 'CustomObject.listViews', idField: 'fullName' },
        { name: 'NamedFilter', xpath: 'CustomObject.namedFilters', idField: 'fullName' },
        { name: 'WebLink', xpath: 'CustomObject.webLinks', idField: 'fullName' },
        { name: 'ActionOverride', xpath: 'CustomObject.actionOverrides', idField: 'actionName' },
        { name: 'CompactLayout', xpath: 'CustomObject.compactLayouts', idField: 'fullName' },
        { name: 'FieldSet', xpath: 'CustomObject.fieldSets', idField: 'fullName' },
        { name: 'SharingReason', xpath: 'CustomObject.sharingReasons', idField: 'fullName' },
      ],
    },
    {
      directory: 'workflows',
      extension: '.workflow',
      childElements: [
        { name: 'WorkflowAlert', xpath: 'Workflow.alerts', idField: 'fullName' },
        { name: 'WorkflowFieldUpdate', xpath: 'Workflow.fieldUpdates', idField: 'fullName' },
        { name: 'WorkflowRule', xpath: 'Workflow.rules', idField: 'fullName' },
        { name: 'WorkflowTask', xpath: 'Workflow.tasks', idField: 'fullName' },
        { name: 'WorkflowOutboundMessage', xpath: 'Workflow.outboundMessages', idField: 'fullName' },
      ],
    },
    {
      directory: 'flows',
      extension: '.flow-meta.xml',
      childElements: [
        { name: 'FlowDecision', xpath: 'Flow.decisions', idField: 'name' },
        { name: 'FlowFormula', xpath: 'Flow.formulas', idField: 'name' },
        { name: 'FlowVariable', xpath: 'Flow.variables', idField: 'name' },
        { name: 'FlowAssignment', xpath: 'Flow.assignments', idField: 'name' },
        { name: 'FlowRecordLookup', xpath: 'Flow.recordLookups', idField: 'name' },
        { name: 'FlowRecordCreate', xpath: 'Flow.recordCreates', idField: 'name' },
        { name: 'FlowRecordUpdate', xpath: 'Flow.recordUpdates', idField: 'name' },
        { name: 'FlowRecordDelete', xpath: 'Flow.recordDeletes', idField: 'name' },
        { name: 'FlowScreen', xpath: 'Flow.screens', idField: 'name' },
        { name: 'FlowLoop', xpath: 'Flow.loops', idField: 'name' },
        { name: 'FlowSubflow', xpath: 'Flow.subflows', idField: 'name' },
      ],
    },
    {
      directory: 'permissionsets',
      extension: '.permissionset',
      childElements: [
        { name: 'PermissionSetFieldPermissions', xpath: 'PermissionSet.fieldPermissions', idField: 'field' },
        { name: 'PermissionSetObjectPermissions', xpath: 'PermissionSet.objectPermissions', idField: 'object' },
        { name: 'PermissionSetUserPermissions', xpath: 'PermissionSet.userPermissions', idField: 'name' },
        { name: 'PermissionSetClassAccess', xpath: 'PermissionSet.classAccesses', idField: 'apexClass' },
        { name: 'PermissionSetPageAccess', xpath: 'PermissionSet.pageAccesses', idField: 'apexPage' },
      ],
    },
    {
      directory: 'profiles',
      extension: '.profile',
      childElements: [
        { name: 'ProfileFieldPermissions', xpath: 'Profile.fieldPermissions', idField: 'field' },
        { name: 'ProfileObjectPermissions', xpath: 'Profile.objectPermissions', idField: 'object' },
        { name: 'ProfileUserPermissions', xpath: 'Profile.userPermissions', idField: 'name' },
        { name: 'ProfileClassAccess', xpath: 'Profile.classAccesses', idField: 'apexClass' },
        { name: 'ProfilePageAccess', xpath: 'Profile.pageAccesses', idField: 'apexPage' },
        { name: 'ProfileLayoutAssignment', xpath: 'Profile.layoutAssignments', idField: 'layout' },
        { name: 'ProfileRecordTypeVisibility', xpath: 'Profile.recordTypeVisibilities', idField: 'recordType' },
      ],
    },
    {
      directory: 'customMetadata',
      extension: '.md-meta.xml',
      childElements: [
        { name: 'CustomMetadataValue', xpath: 'CustomMetadata.values', idField: 'field' },
      ],
    },
  ];

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
    });
  }

  /**
   * Parse a metadata file and extract all field-level components
   * @throws {Error} If file doesn't exist or can't be read
   * @throws {Error} If XML is malformed
   */
  async parseFile(filePath: string): Promise<ParsedField[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      if (!content || content.trim().length === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }

      const parsed = this.parser.parse(content);

      if (!parsed) {
        throw new Error(`Failed to parse XML in file: ${filePath}`);
      }

    const fields: ParsedField[] = [];
    const fileName = filePath.split('/').pop() || '';

    // Determine which config to use based on file extension
    const config = MetadataParser.METADATA_CONFIGS.find((c) =>
      fileName.endsWith(c.extension)
    );

    if (!config) {
      return fields;
    }

    // Extract parent name by removing the extension
    const parentName = fileName.replace(new RegExp(config.extension.replace('.', '\\.') + '$'), '');

    // Extract fields based on configuration
    for (const childElement of config.childElements) {
      const pathParts = childElement.xpath.split('.');
      let current = parsed;

      // Navigate to the target element
      for (const part of pathParts) {
        current = current?.[part];
        if (!current) break;
      }

      if (!current) continue;

      // Handle both single elements and arrays
      const elements = Array.isArray(current) ? current : [current];

      for (const element of elements) {
        const fieldName = element[childElement.idField];
        if (fieldName) {
          fields.push({
            type: childElement.name,
            name: fieldName,
            parent: parentName,
          });
        }
      }
    }

    return fields;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error parsing metadata file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get supported metadata type configurations
   */
  static getMetadataConfigs(): MetadataTypeConfig[] {
    return MetadataParser.METADATA_CONFIGS;
  }
}
