import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Connection, Org } from '@salesforce/core';
import {
  ComponentSet,
  MetadataApiDeploy,
  DeployResult,
} from '@salesforce/source-deploy-retrieve';
import FieldDiffEngine from '../../lib/field-diff-engine.js';
import DestructiveChangesGenerator from '../../lib/destructive-changes-generator.js';
import GitIntegration from '../../lib/git-integration.js';
import * as fs from 'fs/promises';
import * as path from 'path';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@sfloess/sf-precise-deploy', 'precise.deploy');

/**
 * Deploy mode - how to determine what to deploy
 */
type DeployMode = 'directory' | 'git';

/**
 * Command: sf precise deploy
 *
 * Deploy with field-level delta detection
 */
export default class PreciseDeploy extends SfCommand<DeployResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'source-dir': Flags.directory({
      char: 's',
      summary: messages.getMessage('flags.source-dir.summary'),
      description: messages.getMessage('flags.source-dir.description'),
      exactlyOne: ['source-dir', 'git-ref'],
    }),
    'git-ref': Flags.string({
      char: 'g',
      summary: messages.getMessage('flags.git-ref.summary'),
      description: messages.getMessage('flags.git-ref.description'),
      exactlyOne: ['source-dir', 'git-ref'],
    }),
    'target-dir': Flags.directory({
      char: 't',
      summary: messages.getMessage('flags.target-dir.summary'),
      description: messages.getMessage('flags.target-dir.description'),
      dependsOn: ['source-dir'],
    }),
    'check-only': Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.check-only.summary'),
      description: messages.getMessage('flags.check-only.description'),
      default: false,
    }),
    'test-level': Flags.string({
      char: 'l',
      summary: messages.getMessage('flags.test-level.summary'),
      description: messages.getMessage('flags.test-level.description'),
      options: ['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'],
      default: 'NoTestRun',
    }),
    tests: Flags.string({
      summary: messages.getMessage('flags.tests.summary'),
      description: messages.getMessage('flags.tests.description'),
      multiple: true,
      dependsOn: ['test-level'],
    }),
    'ignore-warnings': Flags.boolean({
      summary: messages.getMessage('flags.ignore-warnings.summary'),
      description: messages.getMessage('flags.ignore-warnings.description'),
      default: false,
    }),
    'api-version': Flags.string({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
  };

  public async run(): Promise<DeployResult> {
    const { flags } = await this.parse(PreciseDeploy);
    const org = flags['target-org'] as Org;
    const conn = org.getConnection() as Connection;

    let mode: DeployMode;
    let deletedFields: any[] = [];

    // Determine deploy mode
    if (flags['git-ref']) {
      mode = 'git';
      this.log(`Using git mode: comparing against ${flags['git-ref']}`);
    } else {
      mode = 'directory';
      this.log('Using directory comparison mode');
    }

    // Perform field-level analysis
    if (mode === 'git') {
      const git = new GitIntegration('.');
      const changes = await git.getChangedFiles(flags['git-ref'] as string, 'HEAD');
      const modifiedFiles = changes.filter((c: any) => c.status === 'modified');

      this.log(`Found ${modifiedFiles.length} modified files`);

      if (modifiedFiles.length > 0) {
        // Create temp checkouts for comparison
        const tempFrom = await git.createTempCheckout(flags['git-ref'] as string, modifiedFiles.map((f) => f.file));
        const tempTo = await git.createTempCheckout('HEAD', modifiedFiles.map((f) => f.file));

        try {
          const engine = new FieldDiffEngine();
          const diff = await engine.compareDirectories(tempTo, tempFrom);
          deletedFields = diff.deletedFields;

          this.log(`Field-level analysis: ${diff.deletedFields.length} fields deleted`);
        } finally {
          await GitIntegration.cleanupTempDir(tempFrom);
          await GitIntegration.cleanupTempDir(tempTo);
        }
      }
    } else if (flags['target-dir']) {
      // Directory comparison mode
      const engine = new FieldDiffEngine();
      const diff = await engine.compareDirectories(
        flags['source-dir'] as string,
        flags['target-dir'] as string
      );
      deletedFields = diff.deletedFields;

      this.log(`Field-level analysis: ${diff.deletedFields.length} fields deleted`);
    }

    // Generate destructive changes if needed
    let destructiveChangesPath: string | undefined;
    if (deletedFields.length > 0) {
      const generator = new DestructiveChangesGenerator();
      const destructiveXml = generator.generateDestructiveChanges(
        deletedFields,
        (flags['api-version'] as string) || conn.getApiVersion()
      );

      // Write to temp file
      const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'sf-precise-'));
      destructiveChangesPath = path.join(tempDir, 'destructiveChanges.xml');
      await fs.writeFile(destructiveChangesPath, destructiveXml);

      this.log(`Generated destructiveChanges.xml with ${deletedFields.length} field deletions`);
    }

    // Build component set for deployment
    const componentSet = ComponentSet.fromSource((flags['source-dir'] as string) || '.');

    // Create deployment
    this.log('Starting deployment...');
    const deploy = await componentSet.deploy({
      usernameOrConnection: conn,
      apiOptions: {
        checkOnly: flags['check-only'],
        testLevel: flags['test-level'] as any,
        runTests: flags.tests as string[] | undefined,
        ignoreWarnings: flags['ignore-warnings'],
      },
    });

    // Handle destructive changes if present
    if (destructiveChangesPath) {
      // Note: The SDR library doesn't directly support destructive changes in the deploy method
      // In a real implementation, you'd need to use the Metadata API directly or
      // create a modified ComponentSet that includes the destructive changes
      this.warn('Destructive changes detected but not yet integrated into deployment');
      this.warn(`Manual step required: deploy ${destructiveChangesPath} separately`);
    }

    // Poll for results
    const result = await deploy.pollStatus();

    // Display results
    this.log('');
    this.log('Deployment Results:');
    this.log('===================');
    this.log(`Status: ${result.response.status}`);
    this.log(`Success: ${result.response.success}`);
    this.log(`Components Deployed: ${result.response.numberComponentsDeployed}`);
    this.log(`Components Total: ${result.response.numberComponentsTotal}`);

    if (result.response.details?.componentFailures) {
      this.log('');
      this.log('Failures:');
      const failures = Array.isArray(result.response.details.componentFailures)
        ? result.response.details.componentFailures
        : [result.response.details.componentFailures];

      for (const failure of failures) {
        this.log(`  ${failure.fileName}: ${failure.problem}`);
      }
    }

    return result;
  }
}
