# Change Log

All notable changes to the "yaml-with-script" extension will be documented in
this file.

## [1.1.1] - 2025-01-05

- Optimizing by only analyzing the currently open document
- Delay analyzing by text document change events (500ms after last type)
- Adding first tests and test setupt (needs to be improved further)

## [1.1.0] - 2024-12-29

- Switching from Terminal to vscode WebViewPanel with better colors and focus
  handling

## [1.0.4] - 2024-12-29

- Optimizing CodeLense provisioning

## [1.0.3] - 2024-12-29

- Optimizing terminal output and refactoring scripts

## [1.0.2] - 2024-12-27

- Optimizing performance by opening just the visible editors

## [1.0.1] - 2024-12-27

- Initial release: The extension allows GitLab CI users to analyze and execute
  shell scripts within YAML files. It highlights issues with ShellCheck
  diagnostics, runs scripts directly from the editor, and helps streamline CI
  pipeline development.
- Configurable options for ShellCheck severity and dialect (e.g. `bash`, `sh`,
  `ksh`, etc.).
- Supports injecting additional base scripts before executing YAML scripts.
- Integrated with `timonwong.shellcheck` extension for enhanced shell script
  analysis.
