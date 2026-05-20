import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import GitIntegration from '../../lib/git-integration.js';
import FieldDiffEngine from '../../lib/field-diff-engine.js';
import DestructiveChangesGenerator from '../../lib/destructive-changes-generator.js';
import * as fs from 'fs/promises';
import * as path from 'path';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@sfloess/sf-precise-deploy', 'precise.git-delta');

/**
 * Command: sf precise git-delta
 *
 * Analyzes metadata changes between git refs at field level
 */
export default class PreciseGitDelta extends SfCommand<{
  changedFiles: number;
  addedFields: number;
  deletedFields: number;
}> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    from: Flags.string({
      char: 'f',
      summary: messages.getMessage('flags.from.summary'),
      description: messages.getMessage('flags.from.description'),
      required: true,
    }),
    to: Flags.string({
      char: 't',
      summary: messages.getMessage('flags.to.summary'),
      description: messages.getMessage('flags.to.description'),
      default: 'HEAD',
    }),
    'repo-path': Flags.directory({
      char: 'r',
      summary: messages.getMessage('flags.repo-path.summary'),
      description: messages.getMessage('flags.repo-path.description'),
      default: '.',
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
    changedFiles: number;
    addedFields: number;
    deletedFields: number;
  }> {
    const { flags } = await this.parse(PreciseGitDelta);

    const git = new GitIntegration(flags['repo-path'] as string);

    // Verify it's a git repo
    const isRepo = await git.isGitRepo();
    if (!isRepo) {
      throw new Error(`${flags['repo-path']} is not a git repository`);
    }

    this.log(`Analyzing changes from ${flags.from} to ${flags.to}...`);

    // Get changed files from git
    const changes = await git.getChangedFiles(flags.from as string, flags.to as string);
    const metadataChanges = git.filterMetadataFiles(changes);

    this.log(`Found ${metadataChanges.length} changed metadata files`);

    // Create temporary checkouts for comparison
    this.log('Creating temporary checkouts...');
    const modifiedFiles = metadataChanges.filter((f) => f.status === 'modified').map((f) => f.file);

    let tempFromDir: string | null = null;
    let tempToDir: string | null = null;
    let fieldDeletions = 0;
    let fieldAdditions = 0;

    try {
      if (modifiedFiles.length > 0) {
        // Only checkout modified files for field-level comparison
        tempFromDir = await git.createTempCheckout(flags.from as string, modifiedFiles);
        tempToDir = await git.createTempCheckout(flags.to as string, modifiedFiles);

        // Run field-level diff
        const engine = new FieldDiffEngine();
        const diff = await engine.compareDirectories(tempToDir, tempFromDir);

        fieldDeletions = diff.deletedFields.length;
        fieldAdditions = diff.addedFields.length;

        // Generate destructiveChanges.xml
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

        this.log('');
        this.log('Field-Level Analysis Results:');
        this.log('=============================');
        this.log(`Added fields:     ${diff.addedFields.length}`);
        this.log(`Deleted fields:   ${diff.deletedFields.length}`);
        this.log('');

        if (diff.deletedFields.length > 0) {
          this.log('Deleted Fields (for destructiveChanges.xml):');
          for (const field of diff.deletedFields) {
            this.log(`  ${field.type}: ${field.parent}.${field.name}`);
          }
          this.log('');
          this.log(`✓ Generated: ${destructivePath}`);
        }
      }

      // Show file-level changes
      this.log('');
      this.log('File-Level Changes:');
      this.log('===================');
      const addedFiles = metadataChanges.filter((f) => f.status === 'added');
      const deletedFiles = metadataChanges.filter((f) => f.status === 'deleted');

      this.log(`Added files:    ${addedFiles.length}`);
      this.log(`Modified files: ${modifiedFiles.length}`);
      this.log(`Deleted files:  ${deletedFiles.length}`);

      if (deletedFiles.length > 0) {
        this.log('');
        this.log('Deleted Files:');
        for (const file of deletedFiles) {
          this.log(`  ${file.file}`);
        }
      }
    } finally {
      // Cleanup temp directories
      if (tempFromDir) {
        await GitIntegration.cleanupTempDir(tempFromDir);
      }
      if (tempToDir) {
        await GitIntegration.cleanupTempDir(tempToDir);
      }
    }

    return {
      changedFiles: metadataChanges.length,
      addedFields: fieldAdditions,
      deletedFields: fieldDeletions,
    };
  }
}
