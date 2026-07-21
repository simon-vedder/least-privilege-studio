#!/usr/bin/env node
/**
 * build-entra.js
 *
 * Processes the raw Microsoft Entra ID (directory) data pulled by
 * sync-entra.sh into the same file shape the Azure builder emits, so the
 * existing engine and UI render it unchanged — only the dataset differs.
 *
 * Inputs  (data/raw/):
 *   entra-roles-raw.json            built-in directory roles
 *   entra-resourceactions-raw.json  custom-role-assignable actions (microsoft.directory)
 *
 * Outputs (public/data/):
 *   entra-roles.json            flattened roles for the matching engine
 *   entra-ui-structure.json     category → provider → type → Read/Write/Delete/Action
 *   entra-operations-index.json  [{ action, description }]
 *   entra-metadata.json         counts + lastSync
 */
const fs = require("fs");
const path = require("path");

const P = path.resolve(__dirname, "..");
const R = path.join(P, "data", "raw");
const PUB = path.join(P, "public", "data");

// The only namespace assignable to custom directory roles. Built-in roles also
// reference microsoft.office365.*, microsoft.azure.*, etc. — those cannot go in a
// custom role, so the pickable catalog is microsoft.directory only.
const NS = "microsoft.directory";

// Resource-group (2nd path segment, before any dot) → high-level category.
// Unmapped groups fall through to "Other".
const GROUP2CAT = {
  users: "Users", contacts: "Users", userInfos: "Users", userCredentialPolicies: "Users",
  pendingExternalUserProfiles: "Users", externalUserProfiles: "Users", bulkJobs: "Users",
  subscribedSkus: "Users",

  groups: "Groups", groupsAssignableToRoles: "Groups", groupSettings: "Groups",
  groupSettingTemplates: "Groups", scopedRoleMemberships: "Groups",

  applications: "Applications", servicePrincipals: "Applications", applicationPolicies: "Applications",
  appRoleAssignments: "Applications", oAuth2PermissionGrants: "Applications",
  permissionGrantPolicies: "Applications", servicePrincipalCreationPolicies: "Applications",
  applicationTemplates: "Applications", appConsent: "Applications", adminConsentRequestPolicy: "Applications",
  azureManagedIdentities: "Applications",

  devices: "Devices", deviceTemplates: "Devices", deviceManagementPolicies: "Devices",
  deviceRegistrationPolicy: "Devices", deviceLocalCredentials: "Devices",
  certificateBasedDeviceAuthConfigurations: "Devices", bitlockerKeys: "Devices",

  conditionalAccessPolicies: "Conditional Access & Policies", policies: "Conditional Access & Policies",
  namedLocations: "Conditional Access & Policies", authorizationPolicy: "Conditional Access & Policies",
  customAuthenticationExtensions: "Conditional Access & Policies",
  onPasswordSubmitCustomAuthenticationExtension: "Conditional Access & Policies",

  accessReviews: "Identity Governance", entitlementManagement: "Identity Governance",
  lifecycleWorkflows: "Identity Governance", tenantGovernance: "Identity Governance",
  administrativeUnits: "Identity Governance", privilegedIdentityManagement: "Identity Governance",

  directoryRoles: "Roles & RBAC", directoryRoleTemplates: "Roles & RBAC",
  roleAssignments: "Roles & RBAC", roleDefinitions: "Roles & RBAC", resourceNamespaces: "Roles & RBAC",

  agentUsers: "Agent Identity", agentIdentities: "Agent Identity",
  agentIdentityBlueprints: "Agent Identity", agentIdentityBlueprintPrincipals: "Agent Identity",

  crossTenantAccessPolicy: "External Identities", multiTenantOrganization: "External Identities",
  b2cTrustFrameworkKeySet: "External Identities", b2cTrustFrameworkPolicy: "External Identities",
  b2cUserAttribute: "External Identities", b2cUserFlow: "External Identities",
  identityProviders: "External Identities",

  organization: "Organization", domains: "Organization", contracts: "Organization",
  tenantManagement: "Organization", loginOrganizationBranding: "Organization",

  onPremisesSynchronization: "Hybrid & Provisioning", directorySync: "Hybrid & Provisioning",
  cloudProvisioning: "Hybrid & Provisioning", connectorGroups: "Hybrid & Provisioning",
  connectors: "Hybrid & Provisioning", passwordHashSync: "Hybrid & Provisioning",
  passThroughAuthentication: "Hybrid & Provisioning", seamlessSso: "Hybrid & Provisioning",
  hybridAuthenticationPolicy: "Hybrid & Provisioning", federatedAuthentication: "Hybrid & Provisioning",

  auditLogs: "Monitoring & Reports", signInReports: "Monitoring & Reports",
  provisioningLogs: "Monitoring & Reports", identityProtection: "Monitoring & Reports",
  customSecurityAttributeAuditLogs: "Monitoring & Reports", cloudAppSecurity: "Monitoring & Reports",

  customSecurityAttributeDefinitions: "Custom Security Attributes", attributeSets: "Custom Security Attributes",

  verifiableCredentials: "Verifiable Credentials",

  deletedItems: "Recovery & Lockbox", backup: "Recovery & Lockbox", lockbox: "Recovery & Lockbox",
};

const CAT_ORDER = [
  "Users", "Groups", "Applications", "Devices", "Conditional Access & Policies",
  "Roles & RBAC", "Identity Governance", "Agent Identity", "External Identities",
  "Organization", "Hybrid & Provisioning", "Monitoring & Reports",
  "Custom Security Attributes", "Verifiable Credentials", "Recovery & Lockbox", "Other",
];
const CAT_ICON = {
  "Users": "🧑", "Groups": "👥", "Applications": "📱", "Devices": "💻",
  "Conditional Access & Policies": "🛡", "Roles & RBAC": "🔑", "Identity Governance": "📋",
  "Agent Identity": "🤖", "External Identities": "🌐", "Organization": "🏢",
  "Hybrid & Provisioning": "🔄", "Monitoring & Reports": "📊",
  "Custom Security Attributes": "🏷", "Verifiable Credentials": "🎫",
  "Recovery & Lockbox": "💾", "Other": "📦",
};

// Priority within a category: lower shown first, unset = 999.
const PRIO = {
  users: 1, groups: 1, applications: 1, servicePrincipals: 2, devices: 1,
  conditionalAccessPolicies: 1, directoryRoles: 1, roleAssignments: 2, roleDefinitions: 3,
  accessReviews: 1, agentIdentities: 1, organization: 1, domains: 2, crossTenantAccessPolicy: 1,
};

function spaceCase(s) {
  return s
    .replace(/\./g, " · ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// Access-level bucket from the trailing verb of a directory action.
function level(name) {
  const last = name.split("/").pop().toLowerCase();
  if (["read", "limitedread", "restrictedread"].includes(last)) return "Read";
  if (last === "delete") return "Delete";
  if (["create", "createasowner", "restore", "enable", "disable", "assignlicense"].includes(last)) return "Write";
  if (last.startsWith("update")) return "Write";
  return "Action"; // allTasks, manage, allProperties/allTasks, serviceAction, …
}

function groupOf(name) {
  const seg = name.split("/")[1] || "";
  return seg; // keep dotted subgroup (e.g. groups.unified) as its own type
}
function catOf(group) {
  const base = group.split(".")[0];
  return GROUP2CAT[base] || "Other";
}

function buildUI(actions) {
  // category → type(group) → { Read/Write/Delete/Action: [ops] }
  const S = {};
  for (const a of actions) {
    const name = a.name;
    if (!name || !name.startsWith(NS + "/")) continue;
    const group = groupOf(name);
    if (!group) continue;
    const cat = catOf(group);
    const lv = level(name);
    S[cat] ??= {};
    S[cat][group] ??= { Read: [], Write: [], Delete: [], Action: [] };
    const bucket = S[cat][group][lv];
    if (!bucket.some((o) => o.action === name)) bucket.push({ action: name, type: "action" });
  }

  const cats = [];
  for (const cn of CAT_ORDER) {
    if (!S[cn]) continue;
    const types = [];
    for (const [group, lvls] of Object.entries(S[cn])) {
      const acts = [];
      for (const [lv, ops] of Object.entries(lvls)) {
        if (!ops.length) continue;
        ops.sort((x, y) => x.action.localeCompare(y.action));
        acts.push({ label: lv, ops, hasDataActions: false });
      }
      if (!acts.length) continue;
      acts.sort(
        (x, y) =>
          ["Read", "Write", "Delete", "Action"].indexOf(x.label) -
          ["Read", "Write", "Delete", "Action"].indexOf(y.label)
      );
      types.push({
        key: group,
        name: spaceCase(group),
        provider: NS,
        actions: acts,
        totalOps: acts.reduce((s, a) => s + a.ops.length, 0),
        priority: PRIO[group.split(".")[0]] || 999,
      });
    }
    types.sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : a.name.localeCompare(b.name)));
    if (!types.length) continue;
    // Single synthetic provider — Entra has no ARM-style resource providers.
    const provider = { namespace: NS, displayName: "Entra Directory", types };
    cats.push({
      name: cn,
      icon: CAT_ICON[cn] || "📦",
      providers: [provider],
      totalTypes: types.length,
      totalOps: types.reduce((s, t) => s + t.totalOps, 0),
    });
  }
  return cats;
}

function estimate(actions) {
  let e = 0;
  for (const a of actions) {
    if (a.endsWith("/allProperties/allTasks")) e += 20;
    else if (a.endsWith("/allTasks")) e += 8;
    else if (a.endsWith("/allProperties/read") || a.endsWith("/allProperties/update")) e += 4;
    else e += 1;
  }
  return e;
}

function buildRoles(raw) {
  return raw
    .map((r) => {
      const perms = r.rolePermissions || [];
      const actions = [...new Set(perms.flatMap((p) => p.allowedResourceActions || []))];
      const notActions = [...new Set(perms.flatMap((p) => p.excludedResourceActions || []))];
      return {
        name: r.displayName,
        id: r.templateId || r.id,
        description: r.description || "",
        actions,
        notActions,
        dataActions: [],
        notDataActions: [],
        _estimatedActions: estimate(actions),
      };
    })
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildOpsIndex(actions) {
  const seen = new Map();
  for (const a of actions) {
    if (a.name && a.name.startsWith(NS + "/") && !seen.has(a.name)) {
      seen.set(a.name, a.description || "");
    }
  }
  return [...seen.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([action, description]) => ({ action, description }));
}

function main() {
  console.log("Least Privilege Studio — Entra ID Data Builder v1\n");
  const rolesPath = path.join(R, "entra-roles-raw.json");
  const actionsPath = path.join(R, "entra-resourceactions-raw.json");
  if (!fs.existsSync(rolesPath) || !fs.existsSync(actionsPath)) {
    console.error("⚠ Entra raw data missing. Run scripts/sync-entra.sh first. Skipping.");
    process.exit(0);
  }
  const rolesRaw = JSON.parse(fs.readFileSync(rolesPath, "utf-8"));
  const actionsRaw = JSON.parse(fs.readFileSync(actionsPath, "utf-8"));

  const roles = buildRoles(rolesRaw);
  const ui = buildUI(actionsRaw);
  const opsIndex = buildOpsIndex(actionsRaw);

  if (!fs.existsSync(PUB)) fs.mkdirSync(PUB, { recursive: true });
  const w = (n, d) => {
    fs.writeFileSync(path.join(PUB, n), JSON.stringify(d, null, 2));
    console.log(`✓ ${n}`);
  };

  const totalOps = ui.reduce((s, c) => s + c.totalOps, 0);
  w("entra-roles.json", roles);
  w("entra-ui-structure.json", ui);
  w("entra-operations-index.json", opsIndex);
  w("entra-metadata.json", {
    lastSync: new Date().toISOString(),
    roleCount: roles.length,
    operationCount: totalOps,
    categoryCount: ui.length,
  });

  console.log(
    `\nRoles: ${roles.length}  ·  Categories: ${ui.length}  ·  Pickable ops: ${totalOps}  ·  Ops index: ${opsIndex.length}`
  );
}
main();
