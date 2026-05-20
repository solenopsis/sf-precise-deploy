# summary

Deploy Salesforce metadata with field-level delta detection

# description

Performs a surgical deployment to Salesforce by analyzing metadata at the field level.

Unlike standard deployments that work at the file level, this command detects individual field changes
within metadata files and generates appropriate destructive changes for field-level deletions.

Supports two modes:
1. **Directory mode**: Compare local source against a previously retrieved org state
2. **Git mode**: Use git history to detect changes since a specific reference

The deployment uses the Salesforce Metadata API via the source-deploy-retrieve library.

# examples

- Deploy using directory comparison:

  <%= config.bin %> <%= command.id %> --target-org myOrg --source-dir force-app/main/default --target-dir retrieved/main/default

- Deploy using git comparison:

  <%= config.bin %> <%= command.id %> --target-org myOrg --git-ref origin/main

- Validation-only deployment (check-only):

  <%= config.bin %> <%= command.id %> --target-org myOrg --source-dir force-app/main/default --check-only

- Deploy with test execution:

  <%= config.bin %> <%= command.id %> --target-org myOrg --git-ref origin/main --test-level RunLocalTests

# flags.source-dir.summary

Source directory containing metadata to deploy

# flags.source-dir.description

The directory containing your Salesforce metadata in source format.
Use this with --target-dir for directory-based comparison.
Mutually exclusive with --git-ref.

# flags.git-ref.summary

Git reference to compare against (branch, commit, tag)

# flags.git-ref.description

Use git history to detect changes since this reference.
Can be a branch name (e.g., 'origin/main'), commit SHA, or relative reference (e.g., 'HEAD~1').
Mutually exclusive with --source-dir.

# flags.target-dir.summary

Target directory with org state (for directory mode)

# flags.target-dir.description

Directory containing metadata retrieved from the target org.
Required when using --source-dir mode.
Used to compare against source-dir to detect deletions.

# flags.check-only.summary

Validate deployment without making changes (dry run)

# flags.check-only.description

Perform a validation-only deployment. The deployment will be checked for errors but no changes
will be made to the target org. Useful for CI/CD validation.

# flags.test-level.summary

Level of tests to run during deployment

# flags.test-level.description

Determines which tests to run as part of the deployment:
- NoTestRun: Don't run any tests (default, only for sandboxes)
- RunSpecifiedTests: Run only the tests specified in --tests
- RunLocalTests: Run all tests in the org except those from managed packages
- RunAllTestsInOrg: Run all tests including those from managed packages

# flags.tests.summary

Specific test classes to run (requires --test-level RunSpecifiedTests)

# flags.tests.description

Comma-separated list of test class names to execute during deployment.
Only valid when --test-level is set to RunSpecifiedTests.

# flags.ignore-warnings.summary

Ignore warnings and complete deployment anyway

# flags.ignore-warnings.description

If set, the deployment will succeed even if warnings are encountered.
Use with caution as warnings may indicate potential issues.

# flags.api-version.summary

Salesforce API version to use for deployment

# flags.api-version.description

The API version to use when deploying metadata. If not specified, uses the org's default API version.
