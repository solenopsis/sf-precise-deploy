# summary

Analyze metadata changes between git refs at field level

# description

Compares two git references (commits, branches, tags) to detect field-level changes in Salesforce metadata.

This command uses git history to find changed files, then performs field-level analysis on modified metadata.
It's faster than directory comparison when you have git history, and doesn't require retrieving from the target org.

Generates destructiveChanges.xml with field-level precision for surgical deployments.

# examples

- Compare current branch against origin/main:

  <%= config.bin %> <%= command.id %> --from origin/main

- Compare two specific commits:

  <%= config.bin %> <%= command.id %> --from abc123 --to def456

- Compare against previous commit with custom output:

  <%= config.bin %> <%= command.id %> --from HEAD~1 --to HEAD --output-dir delta-output

# flags.from.summary

Starting git reference (commit, branch, tag)

# flags.from.description

The git reference to compare from. Can be a commit SHA, branch name, tag, or relative reference like HEAD~1.

# flags.to.summary

Ending git reference (defaults to HEAD)

# flags.to.description

The git reference to compare to. Can be a commit SHA, branch name, tag, or relative reference.
Defaults to HEAD (current commit).

# flags.repo-path.summary

Path to git repository

# flags.repo-path.description

Path to the git repository root. Defaults to current directory.

# flags.output-dir.summary

Directory where generated deployment artifacts will be written

# flags.output-dir.description

Output directory for generated files like destructiveChanges.xml and package.xml.
Will be created if it doesn't exist.

# flags.api-version.summary

Salesforce API version to use in generated package.xml files

# flags.api-version.description

The API version string (e.g., '61.0') to include in generated package.xml and destructiveChanges.xml files.
