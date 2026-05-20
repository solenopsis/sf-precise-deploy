# Contributing to sf-precise-deploy

Thank you for your interest in contributing! This project preserves Solenopsis's field-level diff capabilities in a modern SF CLI plugin.

## Development Setup

### Prerequisites
- Node.js 20.x or higher
- npm
- Git
- Salesforce CLI (for testing, optional)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/solenopsis/sf-precise-deploy
cd sf-precise-deploy

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Link for local testing
sf plugins link .
```

## Project Structure

```
src/
├── commands/precise/    # CLI commands
├── lib/                 # Core libraries
└── index.ts             # Public exports

test/
└── lib/                 # Unit tests

messages/                # Command help text
test-data/              # Sample metadata for testing
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-new-feature
```

### 2. Make Changes

- **Add/modify source code** in `src/`
- **Add tests** in `test/`
- **Update documentation** as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/lib/metadata-parser.test.ts

# Build and check for errors
npm run build

# Lint
npm run lint
```

### 4. Commit

```bash
git add .
git commit -m "feat: add support for XYZ metadata type"
```

**Commit Message Convention:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding/updating tests
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

### 5. Push and Create PR

```bash
git push origin feature/my-new-feature
```

Then create a Pull Request on GitHub.

## Adding New Metadata Types

To add support for a new metadata type:

1. **Update `src/lib/metadata-parser.ts`:**

```typescript
{
  directory: 'newMetadataType',
  extension: '.newtype-meta.xml',
  childElements: [
    { name: 'NewChildType', xpath: 'NewType.children', idField: 'name' },
  ],
}
```

2. **Add tests in `test/lib/metadata-parser.test.ts`:**

```typescript
it('should parse NewChildType from newtype file', async () => {
  // Test implementation
});
```

3. **Create sample metadata in `test-data/`:**

```bash
mkdir -p test-data/source/newMetadataType
mkdir -p test-data/target/newMetadataType
# Add sample XML files
```

4. **Update documentation** in README.md

## Writing Tests

### Test Requirements
- All new features must have unit tests
- Maintain or improve code coverage
- Tests should be descriptive and test one thing

### Test Example

```typescript
describe('MyFeature', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should do something specific', async () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = await myFunction(input);

    // Assert
    expect(result).to.equal('expected output');
  });
});
```

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Follow existing patterns
- **Naming**: Descriptive, camelCase for variables/functions, PascalCase for classes
- **Comments**: Add JSDoc for public APIs, inline comments for complex logic only
- **Error Handling**: Throw descriptive errors, handle edge cases

## Pull Request Process

1. **Update tests** - All tests must pass
2. **Update documentation** - README, DEVELOPMENT.md, command help
3. **Describe changes** - Clear PR description
4. **Link issues** - Reference related issues
5. **Request review** - Tag maintainers

### PR Checklist

- [ ] Tests added/updated and passing
- [ ] Build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

## Testing with Real Salesforce Metadata

### Local Testing

```bash
# Link plugin
sf plugins link .

# Test with actual org
sf org login web --alias myOrg
sf project retrieve start --target-org myOrg --manifest manifest/package.xml
sf precise delta --source-dir force-app --target-dir retrieved
```

### Integration Testing

When testing deployments, use a scratch org or sandbox:

```bash
# Never test destructive changes on production!
sf org create scratch --alias test-org
sf precise deploy --target-org test-org --check-only
```

## Release Process

**For Maintainers:**

1. Update version in `package.json`
2. Update CHANGELOG (if exists)
3. Create git tag: `git tag v0.2.0`
4. Push tag: `git push origin v0.2.0`
5. GitHub Actions will publish to npm

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues and discussions first

## Code of Conduct

Be respectful, constructive, and collaborative. This is an open-source project maintained by volunteers.

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.

---

**Thank you for contributing!** 🎉
