# Least Privilege Studio for Azure

Developer tool for Azure RBAC permissions. Select resources and actions you need — get the least-privilege built-in role and custom role definitions.

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

## Quick Start

```bash
npm install
az login
npm run sync:all
npm run dev
```

## Deploy

```bash
git init && git add . && git commit -m "initial"
git branch -M main
git remote add origin git@github.com:simonvedder/least-privilege-studio.git
git push -u origin main
```

Settings → Pages → Source: GitHub Actions

## License

MIT — Simon Vedder · [simonvedder.com](https://simonvedder.com)
