import MetadataParser from './metadata-parser.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Represents a field that was added, modified, or deleted
 */
export interface FieldDiff {
  type: string;
  name: string;
  parent: string;
  action: 'added' | 'modified' | 'deleted';
}

/**
 * Result of comparing two environments
 */
export interface DiffResult {
  addedFields: FieldDiff[];
  modifiedFields: FieldDiff[];
  deletedFields: FieldDiff[];
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
}

/**
 * FieldDiffEngine - Compares metadata at field level between environments
 *
 * Core logic inspired by Solenopsis's computeFieldDiffs BeanShell script
 */
export default class FieldDiffEngine {
  private parser: MetadataParser;

  constructor() {
    this.parser = new MetadataParser();
  }

  /**
   * Compare two directories and detect field-level changes
   *
   * @param sourceDir - The local/master directory (what you want to deploy)
   * @param targetDir - The remote/dependent directory (pulled from target org)
   * @returns Field-level and file-level differences
   * @throws {Error} If directories don't exist or aren't accessible
   */
  async compareDirectories(sourceDir: string, targetDir: string): Promise<DiffResult> {
    // Validate directories exist
    try {
      await fs.access(sourceDir);
    } catch {
      throw new Error(`Source directory does not exist or is not accessible: ${sourceDir}`);
    }

    try {
      await fs.access(targetDir);
    } catch {
      throw new Error(`Target directory does not exist or is not accessible: ${targetDir}`);
    }
    const result: DiffResult = {
      addedFields: [],
      modifiedFields: [],
      deletedFields: [],
      addedFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
    };

    // Get all metadata files from both directories
    const sourceFiles = await this.getMetadataFiles(sourceDir);
    const targetFiles = await this.getMetadataFiles(targetDir);

    const sourceFileSet = new Set(sourceFiles.map((f) => this.relativePath(f, sourceDir)));
    const targetFileSet = new Set(targetFiles.map((f) => this.relativePath(f, targetDir)));

    // Find added, modified, and deleted files
    for (const sourceFile of sourceFiles) {
      const relativePath = this.relativePath(sourceFile, sourceDir);
      const targetFile = path.join(targetDir, relativePath);

      if (!targetFileSet.has(relativePath)) {
        // File added
        result.addedFiles.push(relativePath);
      } else {
        // File exists in both - check for field-level changes
        const fieldDiffs = await this.compareFiles(sourceFile, targetFile);

        if (fieldDiffs.added.length > 0 || fieldDiffs.deleted.length > 0) {
          result.modifiedFiles.push(relativePath);
          result.addedFields.push(...fieldDiffs.added);
          result.deletedFields.push(...fieldDiffs.deleted);
        }
      }
    }

    // Find deleted files
    for (const targetFile of targetFiles) {
      const relativePath = this.relativePath(targetFile, targetDir);
      if (!sourceFileSet.has(relativePath)) {
        result.deletedFiles.push(relativePath);
      }
    }

    return result;
  }

  /**
   * Compare two metadata files and detect field-level changes
   */
  private async compareFiles(
    sourceFile: string,
    targetFile: string
  ): Promise<{ added: FieldDiff[]; deleted: FieldDiff[] }> {
    let sourceFields, targetFields;

    try {
      sourceFields = await this.parser.parseFile(sourceFile);
    } catch (error) {
      // If parsing fails, log warning and return empty diff
      console.warn(`Warning: Could not parse source file ${sourceFile}: ${error}`);
      return { added: [], deleted: [] };
    }

    try {
      targetFields = await this.parser.parseFile(targetFile);
    } catch (error) {
      // If parsing fails, log warning and return empty diff
      console.warn(`Warning: Could not parse target file ${targetFile}: ${error}`);
      return { added: [], deleted: [] };
    }

    const sourceFieldMap = new Map(
      sourceFields.map((f) => [`${f.type}:${f.name}`, f])
    );
    const targetFieldMap = new Map(
      targetFields.map((f) => [`${f.type}:${f.name}`, f])
    );

    const added: FieldDiff[] = [];
    const deleted: FieldDiff[] = [];

    // Find added fields
    for (const [key, field] of sourceFieldMap) {
      if (!targetFieldMap.has(key)) {
        added.push({ ...field, action: 'added' });
      }
    }

    // Find deleted fields
    for (const [key, field] of targetFieldMap) {
      if (!sourceFieldMap.has(key)) {
        deleted.push({ ...field, action: 'deleted' });
      }
    }

    return { added, deleted };
  }

  /**
   * Get all metadata files from a directory
   */
  private async getMetadataFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const configs = MetadataParser.getMetadataConfigs();

    for (const config of configs) {
      const subDir = path.join(dir, config.directory);
      try {
        const dirFiles = await fs.readdir(subDir);
        for (const file of dirFiles) {
          if (file.endsWith(config.extension)) {
            files.push(path.join(subDir, file));
          }
        }
      } catch (err) {
        // Directory doesn't exist, skip
        continue;
      }
    }

    return files;
  }

  /**
   * Get relative path from base directory
   */
  private relativePath(filePath: string, baseDir: string): string {
    return path.relative(baseDir, filePath);
  }
}
