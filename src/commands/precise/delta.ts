import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import FieldDiffEngine from '../../lib/field-diff-engine.js';
import DestructiveChangesGenerator from '../../lib/destructive-changes-generator.js';
import * as fs from 'fs/promises';
import * as path from 'path';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@sfloess/sf-precise-deploy', 'precise.delta');

/**
 * Command: sf precise delta
 *
 * Analyzes metadata changes at the field level and generates deployment artifacts
 */
export default class PreciseDelta extends SfCommand<{
  addedFields: number;
  deletedFields: number;
  modifiedFiles: number;
}> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'source-dir': Flags.directory({
      char: 's',
      summary: messages.getMessage('flags.source-dir.summary'),
      description: messages.getMessage('flags.source-dir.description'),
      required: true,
      exists: true,
    }),
    'target-dir': Flags.directory({
      char: 't',
      summary: messages.getMessage('flags.target-dir.summary'),
      description: messages.getMessage('flags.target-dir.description'),
      required: true,
      exists: true,
    }),
    'output-dir': Flags.directory({
      char: 'o',
      summary: messages.getMessage('flags.output-dir.summary'),
      description: messages.getMessage('flags.output-dir.description'),
      default: './delta',
    }),
    'api-version': Flags.string({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
      default: '61.0',
    }),
  };

  public async run(): Promise<{
    addedFields: number;
    deletedFields: number;
    modifiedFiles: number;
  }> {
    const { flags } = await this.parse(PreciseDelta);

    this.log('Analyzing field-level metadata changes...');

    // Run field-level diff
    const engine = new FieldDiffEngine();
    const diff = await engine.compareDirectories(
      flags['source-dir'] as string,
      flags['target-dir'] as string
    );

    // Generate destructive changes
    const generator = new DestructiveChangesGenerator();
    const destructiveXml = generator.generateDestructiveChanges(
      diff.deletedFields,
      flags['api-version'] as string
    );

    // Create output directory
    await fs.mkdir(flags['output-dir'] as string, { recursive: true });

    // Write destructiveChanges.xml
    const destructivePath = path.join(
      flags['output-dir'] as string,
      'destructiveChanges.xml'
    );
    await fs.writeFile(destructivePath, destructiveXml);

    // Display results
    this.log('');
    this.log('Field-Level Analysis Results:');
    this.log('=============================');
    this.log(`Added fields:     ${diff.addedFields.length}`);
    this.log(`Deleted fields:   ${diff.deletedFields.length}`);
    this.log(`Modified files:   ${diff.modifiedFiles.length}`);
    this.log('');
    this.log(`Files:`);
    this.log(`  Added:   ${diff.addedFiles.length}`);
    this.log(`  Modified: ${diff.modifiedFiles.length}`);
    this.log(`  Deleted:  ${diff.deletedFiles.length}`);
    this.log('');

    if (diff.deletedFields.length > 0) {
      this.log('Deleted Fields (for destructiveChanges.xml):');
      for (const field of diff.deletedFields) {
        this.log(`  ${field.type}: ${field.parent}.${field.name}`);
      }
      this.log('');
      this.log(`✓ Generated: ${destructivePath}`);
    }

    return {
      addedFields: diff.addedFields.length,
      deletedFields: diff.deletedFields.length,
      modifiedFiles: diff.modifiedFiles.length,
    };
  }
}
