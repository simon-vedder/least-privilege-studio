# Least Privilege Studio for Azure

[![Live: leastprivilegestudio.com](https://img.shields.io/badge/live-leastprivilegestudio.com-16a34a)](https://leastprivilegestudio.com/)
![Azure RBAC](https://img.shields.io/badge/Azure-RBAC-0078D4?logo=microsoftazure&logoColor=white)
[![Deploy](https://github.com/simon-vedder/least-privilege-studio/actions/workflows/deploy.yml/badge.svg)](https://github.com/simon-vedder/least-privilege-studio/actions/workflows/deploy.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

Developer tool for Azure RBAC permissions. Select resources and actions you need — get the least-privilege built-in role and custom role definitions.

> ▶ **Try it live:** [leastprivilegestudio.com](https://leastprivilegestudio.com/) — no install, runs entirely in your browser.

## Features

- Browse all Azure resources by category (Compute, Networking, Storage, etc.)
- Search by resource name, abbreviation (vm, aks, nsg), or permission path
- Select individual operations with Read/Write/Delete/Action grouping
- Import from built-in role — select a role and see all its permissions checked
- Import from custom role JSON — paste an existing role definition
- Role matching engine — find the least-privilege built-in role
- Custom role JSON export in Azure format
- Dependency hints (e.g. "VMs require managed disks")
- 867+ built-in roles, 18,000+ operations from the Azure API

## License

MIT — Simon Vedder · [simonvedder.com](https://simonvedder.com)
