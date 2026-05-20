import { FieldDiff } from './field-diff-engine.js';

/**
 * Package.xml structure for destructive changes
 */
export interface DestructivePackage {
  Package: {
    types: Array<{
      members: string[];
      name: string;
    }>;
    version: string;
  };
}

/**
 * DestructiveChangesGenerator - Creates destructiveChanges.xml from field-level diffs
 *
 * Implements Solenopsis's field-level destructive change logic
 */
export default class DestructiveChangesGenerator {
  /**
   * Generate destructiveChanges.xml content from field diffs
   *
   * @param deletedFields - Fields to delete
   * @param apiVersion - Salesforce API version
   * @returns XML string for destructiveChanges.xml
   */
  generateDestructiveChanges(deletedFields: FieldDiff[], apiVersion: string = '61.0'): string {
    if (deletedFields.length === 0) {
      return this.emptyPackageXml(apiVersion);
    }

    // Group fields by type
    const fieldsByType = new Map<string, string[]>();

    for (const field of deletedFields) {
      const memberName = `${field.parent}.${field.name}`;
      const typeName = field.type;

      if (!fieldsByType.has(typeName)) {
        fieldsByType.set(typeName, []);
      }
      fieldsByType.get(typeName)!.push(memberName);
    }

    // Build XML
    const types = Array.from(fieldsByType.entries())
      .map(([typeName, members]) => {
        const memberLines = members.map((m) => `        <members>${this.escapeXml(m)}</members>`).join('\n');
        return `    <types>\n${memberLines}\n        <name>${typeName}</name>\n    </types>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${types}
    <version>${apiVersion}</version>
</Package>
`;
  }

  /**
   * Generate destructiveChanges.xml for deleted files
   *
   * @param deletedFiles - Full file paths that were deleted
   * @param apiVersion - Salesforce API version
   * @returns XML string for destructiveChanges.xml
   */
  generateDestructiveChangesFromFiles(deletedFiles: string[], apiVersion: string = '61.0'): string {
    if (deletedFiles.length === 0) {
      return this.emptyPackageXml(apiVersion);
    }

    // Map file paths to metadata types
    const typeMapping: Record<string, string> = {
      '.cls': 'ApexClass',
      '.trigger': 'ApexTrigger',
      '.page': 'ApexPage',
      '.component': 'ApexComponent',
      '.object': 'CustomObject',
      '.workflow': 'Workflow',
      '.permissionset': 'PermissionSet',
      '.profile': 'Profile',
    };

    const membersByType = new Map<string, string[]>();

    for (const file of deletedFiles) {
      const ext = file.substring(file.lastIndexOf('.'));
      const typeName = typeMapping[ext];

      if (!typeName) continue;

      // Extract member name from path
      const memberName = file
        .split('/')
        .pop()!
        .replace(ext, '')
        .replace('-meta.xml', '');

      if (!membersByType.has(typeName)) {
        membersByType.set(typeName, []);
      }
      membersByType.get(typeName)!.push(memberName);
    }

    // Build XML
    const types = Array.from(membersByType.entries())
      .map(([typeName, members]) => {
        const memberLines = members.map((m) => `        <members>${this.escapeXml(m)}</members>`).join('\n');
        return `    <types>\n${memberLines}\n        <name>${typeName}</name>\n    </types>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${types}
    <version>${apiVersion}</version>
</Package>
`;
  }

  /**
   * Generate empty package.xml
   */
  private emptyPackageXml(apiVersion: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <version>${apiVersion}</version>
</Package>
`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
