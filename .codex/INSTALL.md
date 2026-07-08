# Installing Engineering Standards for Codex

Codex can install this repository as a plugin. The plugin exposes the shared `skills/` directory, so
Claude Code, Cursor, and Codex all use the same skill content.

## Prerequisites

- Git
- Codex with plugin support

## Installation

```bash
# 1. Add the DingLan marketplace from GitHub.
codex plugin marketplace add dinglanTechnology/engineering-standards
```

Then install the plugin from the Codex plugin directory:

1. Open Codex.
2. In the CLI, enter `/plugins`; in the app, open Plugins.
3. Select the `DingLan` marketplace.
4. Open `engineering-standards` and choose `Install plugin`.

Start a new thread after installation if the skills do not appear immediately.

## Local Development Install

When testing local changes before pushing:

```bash
codex plugin marketplace add /Users/chenwentao/workspace/dinglan/engineering-standards
```

Then install `engineering-standards` from the `DingLan` marketplace in `/plugins`.

If the plugin was already installed, uninstall and reinstall it from the plugin directory after
changing plugin metadata. Skill content updates may still require a new thread or Codex restart to
refresh the discovered skill list.

## Updating

```bash
codex plugin marketplace upgrade dinglan
```

Then open `/plugins` and update or reinstall `engineering-standards` if Codex does not refresh it
automatically.

## Uninstalling

Open the plugin directory, open `engineering-standards`, and choose `Uninstall plugin`.
