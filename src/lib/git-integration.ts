import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

/**
 * Git file change information
 */
export interface GitFileChange {
  file: string;
  status: 'added' | 'modified' | 'deleted';
}

/**
 * GitIntegration - Detect changes between git commits
 *
 * Inspired by Solenopsis's git-push functionality
 */
export default class GitIntegration {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get changed files between two git references (commits, branches, tags)
   *
   * @param fromRef - Starting reference (e.g., 'origin/main', 'HEAD~1', commit SHA)
   * @param toRef - Ending reference (defaults to working directory)
   * @returns Array of changed files with their status
   */
  async getChangedFiles(
    fromRef: string,
    toRef: string = 'HEAD'
  ): Promise<GitFileChange[]> {
    const changes: GitFileChange[] = [];

    // Get diff between refs
    const diffSummary = await this.git.diffSummary([fromRef, toRef]);

    for (const file of diffSummary.files) {
      let status: 'added' | 'modified' | 'deleted';

      if (file.binary) {
        // Skip binary files
        continue;
      }

      // Determine status based on insertions/deletions
      if (file.insertions > 0 && file.deletions === 0) {
        status = 'added';
      } else if (file.insertions === 0 && file.deletions > 0) {
        status = 'deleted';
      } else {
        status = 'modified';
      }

      changes.push({
        file: file.file,
        status,
      });
    }

    return changes;
  }

  /**
   * Create a temporary directory with files at a specific git reference
   *
   * @param ref - Git reference (commit, branch, tag)
   * @param fileList - Optional list of specific files to checkout (if empty, checks out all)
   * @returns Path to temporary directory
   */
  async createTempCheckout(ref: string, fileList?: string[]): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sf-precise-git-'));

    if (fileList && fileList.length > 0) {
      // Checkout specific files
      for (const file of fileList) {
        const fileContent = await this.git.show([`${ref}:${file}`]);
        const targetPath = path.join(tempDir, file);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, fileContent);
      }
    } else {
      // Checkout entire tree
      await this.git.raw(['checkout-index', '--prefix', tempDir + '/', '-a', ref]);
    }

    return tempDir;
  }

  /**
   * Get file content at a specific git reference
   *
   * @param ref - Git reference
   * @param filePath - Path to file
   * @returns File content as string
   */
  async getFileAtRef(ref: string, filePath: string): Promise<string> {
    return await this.git.show([`${ref}:${filePath}`]);
  }

  /**
   * Check if current directory is a git repository
   */
  async isGitRepo(): Promise<boolean> {
    return await this.git.checkIsRepo();
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'HEAD';
  }

  /**
   * Get list of uncommitted/unstaged files
   *
   * Equivalent to Solenopsis's git-status functionality
   */
  async getUncommittedChanges(): Promise<{
    added: string[];
    modified: string[];
    deleted: string[];
  }> {
    const status = await this.git.status();

    return {
      added: [
        ...status.not_added,
        ...status.created,
      ],
      modified: status.modified,
      deleted: status.deleted,
    };
  }

  /**
   * Filter files to only include Salesforce metadata
   *
   * @param files - List of file paths
   * @returns Filtered list containing only metadata files
   */
  filterMetadataFiles(files: GitFileChange[]): GitFileChange[] {
    const metadataExtensions = [
      '.object',
      '.workflow',
      '.flow-meta.xml',
      '.cls',
      '.trigger',
      '.page',
      '.component',
      '.permissionset',
      '.profile',
      '.md-meta.xml',
      '.app',
      '.layout',
      '.email',
      '.report',
      '.dashboard',
    ];

    return files.filter((file) =>
      metadataExtensions.some((ext) => file.file.endsWith(ext))
    );
  }

  /**
   * Clean up temporary directory
   */
  static async cleanupTempDir(tempDir: string): Promise<void> {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
