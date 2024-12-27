# Change Log

All notable changes to the "yaml-with-script" extension will be documented in this file.

## [1.0.0] - 2024-12-23

- Initial release: The extension allows GitLab CI users to analyze and execute shell scripts within YAML files. It
  highlights issues with ShellCheck diagnostics, runs scripts directly from the editor, and helps streamline CI pipeline
  development.
- Configurable options for ShellCheck severity and dialect (e.g. `bash`, `sh`, `ksh`, etc.).
- Supports injecting additional base scripts before executing YAML scripts.
- Integrated with `timonwong.shellcheck` extension for enhanced shell script analysis.
