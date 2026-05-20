import { expect } from 'chai';
import GitIntegration from '../../src/lib/git-integration.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { simpleGit } from 'simple-git';

describe('GitIntegration', () => {
  let tempDir: string;
  let git: GitIntegration;

  beforeEach(async () => {
    // Create temporary git repo for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sf-precise-git-test-'));

    // Initialize git repo
    const gitClient = simpleGit(tempDir);
    await gitClient.init();
    await gitClient.addConfig('user.name', 'Test User');
    await gitClient.addConfig('user.email', 'test@example.com');

    git = new GitIntegration(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('isGitRepo', () => {
    it('should detect a git repository', async () => {
      const isRepo = await git.isGitRepo();
      expect(isRepo).to.be.true;
    });

    it('should detect non-git directory', async () => {
      const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'non-git-'));
      const nonGitIntegration = new GitIntegration(nonGitDir);

      const isRepo = await nonGitIntegration.isGitRepo();
      expect(isRepo).to.be.false;

      await fs.rm(nonGitDir, { recursive: true, force: true });
    });
  });

  describe('getChangedFiles', () => {
    it('should detect added files between commits', async () => {
      // Create initial commit
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      const gitClient = simpleGit(tempDir);
      await gitClient.add('file1.txt');
      await gitClient.commit('Initial commit');
      const firstCommit = (await gitClient.log()).latest?.hash || '';

      // Add new file
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content2');
      await gitClient.add('file2.txt');
      await gitClient.commit('Add file2');

      // Get changes
      const changes = await git.getChangedFiles(firstCommit, 'HEAD');

      expect(changes).to.have.lengthOf(1);
      expect(changes[0].file).to.equal('file2.txt');
      expect(changes[0].status).to.equal('added');
    });

    it('should detect modified files between commits', async () => {
      const gitClient = simpleGit(tempDir);

      // Create initial commit
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      await gitClient.add('file1.txt');
      await gitClient.commit('Initial commit');
      const firstCommit = (await gitClient.log()).latest?.hash || '';

      // Modify file
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'modified content');
      await gitClient.add('file1.txt');
      await gitClient.commit('Modify file1');

      // Get changes
      const changes = await git.getChangedFiles(firstCommit, 'HEAD');

      expect(changes).to.have.lengthOf(1);
      expect(changes[0].file).to.equal('file1.txt');
      expect(changes[0].status).to.equal('modified');
    });
  });

  describe('filterMetadataFiles', () => {
    it('should filter Salesforce metadata files', () => {
      const files = [
        { file: 'classes/MyClass.cls', status: 'added' as const },
        { file: 'triggers/MyTrigger.trigger', status: 'added' as const },
        { file: 'README.md', status: 'added' as const },
        { file: 'package.json', status: 'added' as const },
        { file: 'objects/Account.object', status: 'modified' as const },
        { file: 'workflows/Account.workflow', status: 'deleted' as const },
      ];

      const filtered = git.filterMetadataFiles(files);

      expect(filtered).to.have.lengthOf(4);
      expect(filtered.map((f) => f.file)).to.deep.equal([
        'classes/MyClass.cls',
        'triggers/MyTrigger.trigger',
        'objects/Account.object',
        'workflows/Account.workflow',
      ]);
    });

    it('should include flow metadata files', () => {
      const files = [
        { file: 'flows/MyFlow.flow-meta.xml', status: 'added' as const },
        { file: 'flows/notes.txt', status: 'added' as const },
      ];

      const filtered = git.filterMetadataFiles(files);

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].file).to.equal('flows/MyFlow.flow-meta.xml');
    });

    it('should include various metadata types', () => {
      const files = [
        { file: 'permissionsets/MyPermSet.permissionset', status: 'added' as const },
        { file: 'profiles/Admin.profile', status: 'added' as const },
        { file: 'customMetadata/MyMetadata.md-meta.xml', status: 'added' as const },
        { file: 'layouts/Account-Layout.layout', status: 'added' as const },
        { file: 'email/MyTemplate.email', status: 'added' as const },
      ];

      const filtered = git.filterMetadataFiles(files);

      expect(filtered).to.have.lengthOf(5);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      const gitClient = simpleGit(tempDir);
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');
      await gitClient.add('file.txt');
      await gitClient.commit('Initial commit');

      const branch = await git.getCurrentBranch();

      // Default branch is usually 'master' or 'main'
      expect(branch).to.match(/^(master|main)$/);
    });
  });

  describe('getUncommittedChanges', () => {
    it('should detect unstaged files', async () => {
      await fs.writeFile(path.join(tempDir, 'new-file.txt'), 'content');

      const changes = await git.getUncommittedChanges();

      expect(changes.added.length).to.be.greaterThan(0);
    });

    it('should detect modified files', async () => {
      const gitClient = simpleGit(tempDir);

      // Create and commit file
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'original');
      await gitClient.add('file.txt');
      await gitClient.commit('Initial commit');

      // Modify without committing
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'modified');

      const changes = await git.getUncommittedChanges();

      expect(changes.modified).to.include('file.txt');
    });
  });
});
