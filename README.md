# YAML with Script

See https://gitlab.com/matthiesen-technology/yaml-with-script

🚀 **Extend YAML files with embedded shell scripts and linting** – the perfect
solution for seamless automation and debugging directly within VS Code!

### 💡 Primary Use Case: **GitLab CI/CD**

This extension is specifically designed for **GitLab CI/CD**, making it easier
to work with `.gitlab-ci.yml` files. Automate, debug, and test your CI pipelines
without the need for constant commits and pushes.

---

## Features

- **CodeLens Integration**: Add interactive buttons to YAML files to execute
  shell scripts (`script`) with a single click.
- **ShellCheck Support**: Integrated linting to detect and fix issues in your
  shell scripts.
- **Real-time YAML Analysis**: Provides instant feedback on YAML file syntax
  errors and warnings directly in the VS Code Problems panel.
- **Optimized for GitLab CI/CD**: Simplifies working with `.gitlab-ci.yml`,
  including `script` blocks, `before_script`, and more.
- **Customizable Settings**: Configure script dialects, severity levels, and
  other options via the extension settings.

---

## Example Usage

This extension takes always the last item from the script array which should be
a yaml scalar (`- |`) to take the
[reference tags from GitLab CI/CD](https://docs.gitlab.com/ee/ci/yaml/yaml_optimization.html#reference-tags)
into consideration.

### YAML file with a script

`after_script`, `script` and `before_script` are getting highlighted, checked
with [shellcheck](https://github.com/koalaman/shellcheck) and are executable
with a button click on `Run YAML with Script`.

![Preview](images/preview.png)

### How to execute a script:

1. Open a `.gitlab-ci.yml` file in VS Code.
2. Click the **CodeLens button** (`▶️ Run YAML with Script`) above your script.
3. The script is executed in an integrated WebViewPanel which will open besides
   the active editor. You can view the output live, toggle Auto Scroll and stop
   the script (kill the process) if you need to.

![Preview Script](images/script-preview.png)

---

### Automated Debugging with ShellCheck

When errors are detected in your shell script, they are highlighted directly in
VS Code:

- **Severity Levels**:
  - Errors
  - Warnings
  - Info
  - Style

Quickly check issues with direct links to the
[ShellCheck documentation](https://www.shellcheck.net/wiki). _Unfortunately
quick actions are not implemented, but might be in the future._

![Diagnostic Popup](images/diagnostic-popup.png)

---

### Settings

Customize the extension via VS Code settings:

| Setting                             | Description                                                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yaml-with-script.enabled`          | Enable or disable the extension.                                                                                                                                             |
| `yaml-with-script.baseScript`       | A global script to be executed before the YAML script is executed with a click on `▶️ Run YAML with Script` (e.g., `source ~/.env` or `source ~/.yaml-with-script-base.sh`). |
| `yaml-with-script.dialect`          | Specify the shell dialect for ShellCheck (`bash`, `sh`, `dash`, `zsh`, etc.).                                                                                                |
| `yaml-with-script.severity`         | Configure severity levels for ShellCheck (`error`, `warning`, `info`, `style`).                                                                                              |
| `yaml-with-script.shellcheckFolder` | This is the path to the folder that includes 'shellcheck', e.g. (`/opt/homebrew/bin` will lead to `/opt/homebrew/bin/shellcheck --version`)                                  |

---

### Prerequisites

- **ShellCheck**: Ensure ShellCheck is installed and available in your `PATH`.
  [Install ShellCheck](https://www.shellcheck.net/).

## License

This software is released under the MIT License (see [License](LICENSE.md)).
