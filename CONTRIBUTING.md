# Contributing to Azure RBAC Explorer

Thank you for considering a contribution! This project relies on community input to build a comprehensive, accurate task library.

## Ways to Contribute

### 1. Add a New Task (easiest)

Tasks are YAML files in `data/tasks/`. Each file maps a real-world Azure task to the permissions it requires.

**Steps:**

1. Fork the repo
2. Create `data/tasks/your-task-name.yaml`
3. Follow the schema below
4. Submit a PR

**Task YAML Schema:**

```yaml
id: unique-task-id              # kebab-case, unique across all tasks
title: "Human-readable title"
description: "One-line description of what this task does"
category: Compute               # One of: Compute, Storage, Network, Security, Identity, AVD, Management, Governance, Database, Monitoring, Containers
keywords:                        # Search terms (lowercase)
  - vm
  - virtual machine
  - deploy

operations:                      # Required Azure operations
  - action: "Microsoft.Compute/virtualMachines/write"
    type: action                 # "action" or "dataAction"
  - action: "Microsoft.Compute/disks/write"
    type: action

# Optional: dependencies that are needed in a different scope
cross_scope_operations:
  - action: "Microsoft.Network/virtualNetworks/subnets/join/action"
    type: action
    scope_note: "Required on the target subnet/VNet resource group"

notes: |
  Optional free-text notes about edge cases,
  scope considerations, or gotchas.

references:                      # Microsoft Learn or official docs links
  - https://learn.microsoft.com/en-us/azure/...

verified: false                  # Set to true ONLY if tested against real Azure
last_verified: null              # ISO date: 2025-01-15
contributed_by: your-github-username
```

**Important rules:**

- Use the full operation string (e.g. `Microsoft.Compute/virtualMachines/write`, not `*/write`)
- Distinguish between `action` and `dataAction` — this affects custom role generation
- Include ALL transitive dependencies (e.g. VM creation needs NIC, disk, subnet join)
- When in doubt, set `verified: false` — someone else can verify later
- Add `references` with links to Microsoft Learn docs where the permissions are documented

### 2. Verify Existing Tasks

Tasks with `verified: false` need testing. To verify:

1. Create a custom role in Azure with ONLY the listed operations
2. Attempt the task with that role
3. If it succeeds: update `verified: true` and `last_verified` date
4. If it fails: add the missing operations and note what was missing
5. Submit a PR

### 3. Report Issues

Found a task with wrong permissions? A role that doesn't match? Open an issue with:

- Which task is affected
- What you expected vs. what happened
- Your Azure environment context (if relevant)

### 4. Improve the App

The frontend is React-based. PRs for UI improvements, accessibility, performance, or new features are welcome.

## Code of Conduct

Be respectful, constructive, and focused on making this tool better for the community. We're all here to make Azure RBAC less painful.

## Questions?

Open a Discussion or reach out via [simonvedder.com](https://simonvedder.com).
