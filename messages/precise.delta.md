# summary

Analyze metadata changes at field level and generate deployment artifacts

# description

Compares source and target directories to detect field-level changes in Salesforce metadata.
Unlike standard tools that detect file-level changes, this command parses metadata XML to identify
individual fields, validation rules, workflow rules, and other sub-components that were added,
modified, or deleted.

Generates a destructiveChanges.xml file with field-level precision for surgical deployments.

# examples

- Compare local source against a retrieved org and generate destructive changes:

  <%= config.bin %> <%= command.id %> --source-dir force-app/main/default --target-dir retrieved/main/default

- Specify custom output directory and API version:

  <%= config.bin %> <%= command.id %> -s force-app/main/default -t retrieved/main/default -o delta-output -a 60.0

# flags.source-dir.summary

Source directory containing your local metadata (what you want to deploy)

# flags.source-dir.description

The directory containing your local Salesforce metadata in source format.
This is typically your force-app/main/default directory or similar.

# flags.target-dir.summary

Target directory containing metadata retrieved from the target org

# flags.target-dir.description

The directory containing metadata retrieved from your target Salesforce org.
You should run 'sf project retrieve start' first to populate this directory.

# flags.output-dir.summary

Directory where generated deployment artifacts will be written

# flags.output-dir.description

Output directory for generated files like destructiveChanges.xml and package.xml.
Will be created if it doesn't exist.

# flags.api-version.summary

Salesforce API version to use in generated package.xml files

# flags.api-version.description

The API version string (e.g., '61.0') to include in generated package.xml and destructiveChanges.xml files.
