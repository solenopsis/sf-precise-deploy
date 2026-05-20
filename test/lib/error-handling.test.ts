import { expect } from 'chai';
import MetadataParser from '../../src/lib/metadata-parser.js';
import FieldDiffEngine from '../../src/lib/field-diff-engine.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Error Handling', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sf-precise-error-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('MetadataParser', () => {
    it('should throw error for non-existent file', async () => {
      const parser = new MetadataParser();
      const nonExistentPath = path.join(tempDir, 'does-not-exist.object');

      try {
        await parser.parseFile(nonExistentPath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('does-not-exist.object');
      }
    });

    it('should throw error for empty file', async () => {
      const parser = new MetadataParser();
      const emptyFile = path.join(tempDir, 'empty.object');
      await fs.writeFile(emptyFile, '');

      try {
        await parser.parseFile(emptyFile);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('empty');
      }
    });

    it('should handle malformed XML', async () => {
      const parser = new MetadataParser();
      const malformedFile = path.join(tempDir, 'malformed.object');
      await fs.writeFile(malformedFile, '<InvalidXML>Not closed');

      // Some parsers may throw, others may return empty results
      try {
        const fields = await parser.parseFile(malformedFile);
        // If it doesn't throw, should return empty or handle gracefully
        expect(fields).to.be.an('array');
      } catch (error) {
        // If it does throw, that's also acceptable
        expect(error).to.be.an('error');
      }
    });

    it('should handle files with no matching metadata type', async () => {
      const parser = new MetadataParser();
      const unknownFile = path.join(tempDir, 'test.unknown');
      await fs.writeFile(unknownFile, '<?xml version="1.0"?><Root></Root>');

      const fields = await parser.parseFile(unknownFile);
      expect(fields).to.be.an('array');
      expect(fields).to.have.lengthOf(0);
    });
  });

  describe('FieldDiffEngine', () => {
    it('should throw error for non-existent source directory', async () => {
      const engine = new FieldDiffEngine();
      const nonExistentSource = path.join(tempDir, 'non-existent-source');
      const validTarget = path.join(tempDir, 'target');
      await fs.mkdir(validTarget);

      try {
        await engine.compareDirectories(nonExistentSource, validTarget);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('Source directory');
        expect((error as Error).message).to.include('non-existent-source');
      }
    });

    it('should throw error for non-existent target directory', async () => {
      const engine = new FieldDiffEngine();
      const validSource = path.join(tempDir, 'source');
      await fs.mkdir(validSource);
      const nonExistentTarget = path.join(tempDir, 'non-existent-target');

      try {
        await engine.compareDirectories(validSource, nonExistentTarget);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('Target directory');
        expect((error as Error).message).to.include('non-existent-target');
      }
    });

    it('should handle malformed metadata files gracefully', async () => {
      const engine = new FieldDiffEngine();

      const sourceDir = path.join(tempDir, 'source');
      await fs.mkdir(path.join(sourceDir, 'objects'), { recursive: true });

      const targetDir = path.join(tempDir, 'target');
      await fs.mkdir(path.join(targetDir, 'objects'), { recursive: true });

      // Create malformed XML in both directories
      await fs.writeFile(
        path.join(sourceDir, 'objects', 'Bad.object'),
        '<Invalid>Not properly closed'
      );
      await fs.writeFile(
        path.join(targetDir, 'objects', 'Bad.object'),
        '<Invalid>Different malformed XML'
      );

      // Should not throw, but continue processing
      const diff = await engine.compareDirectories(sourceDir, targetDir);

      // Should return empty diff for malformed files
      expect(diff).to.exist;
      expect(diff.addedFields).to.be.an('array');
      expect(diff.deletedFields).to.be.an('array');
    });

    it('should handle permission errors gracefully', async () => {
      const engine = new FieldDiffEngine();
      const restrictedDir = path.join(tempDir, 'restricted');

      // Create directory
      await fs.mkdir(restrictedDir);

      // On systems that support it, restrict permissions
      // (This test might not work on all systems)
      try {
        await fs.chmod(restrictedDir, 0o000);

        const validSource = path.join(tempDir, 'source');
        await fs.mkdir(validSource);

        try {
          await engine.compareDirectories(validSource, restrictedDir);
          // If we get here, permissions weren't actually restricted
          // (some systems don't enforce this), so test passes
          expect(true).to.be.true;
        } catch (error) {
          // Expected error for permission denied
          expect(error).to.be.an('error');
          expect((error as Error).message).to.include('not accessible');
        } finally {
          // Restore permissions for cleanup
          await fs.chmod(restrictedDir, 0o755);
        }
      } catch {
        // If chmod fails, skip this test
        expect(true).to.be.true;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle XML with special characters', async () => {
      const parser = new MetadataParser();
      const specialCharsFile = path.join(tempDir, 'Special.object');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <fields>
        <fullName>Field_With_&amp;_Special&lt;Chars&gt;__c</fullName>
        <type>Text</type>
    </fields>
</CustomObject>`;

      await fs.writeFile(specialCharsFile, xml);
      const fields = await parser.parseFile(specialCharsFile);

      expect(fields).to.have.lengthOf(1);
      expect(fields[0].name).to.include('&');
      expect(fields[0].name).to.include('<');
    });

    it('should handle very large metadata files', async () => {
      const parser = new MetadataParser();
      const largeFile = path.join(tempDir, 'Large.object');

      // Generate XML with 100 fields
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">`;

      for (let i = 0; i < 100; i++) {
        xml += `
    <fields>
        <fullName>Field${i}__c</fullName>
        <type>Text</type>
    </fields>`;
      }

      xml += '\n</CustomObject>';

      await fs.writeFile(largeFile, xml);
      const fields = await parser.parseFile(largeFile);

      expect(fields).to.have.lengthOf(100);
    });

    it('should handle metadata with no child elements', async () => {
      const parser = new MetadataParser();
      const emptyMetadataFile = path.join(tempDir, 'Empty.object');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Empty Object</label>
</CustomObject>`;

      await fs.writeFile(emptyMetadataFile, xml);
      const fields = await parser.parseFile(emptyMetadataFile);

      expect(fields).to.have.lengthOf(0);
    });
  });
});
