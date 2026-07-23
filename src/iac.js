// ─── IaC → Azure RBAC operations ─────────────────────────────────────────────
// Pure logic (no React). Takes an ARM template or Bicep file, extracts the
// resource types, and derives the Azure control-plane actions a *deploying*
// identity needs. Actions are resolved against the real operations dataset so
// the exact casing matches (Azure's own data is inconsistent:
// ".../listkeys/action", "Microsoft.Web/sites/Write") — the builder keys on the
// exact string, so a mismatch would silently drop the permission.

// ─── Curated implicit deploy-time actions ────────────────────────────────────
// The community/PR surface. ARM/Bicep needs some actions at deploy time that
// aren't literally a resource "type" in the template — a NIC joins a subnet, a
// VM writes its OS disk, a role assignment resolves a role definition. Each rule
// is high-confidence and clearly labelled so the user can toggle it off.
// `when(types)` receives the lowercased set of resource types in the template;
// `text` is the raw source (for detecting function calls like listKeys()).
const IMPLICIT_RULES = [
  {
    action: "Microsoft.Network/virtualNetworks/subnets/join/action",
    reason: "A network interface joins a subnet at deploy time",
    when: (types) => types.has("microsoft.network/networkinterfaces") && [...types].some(t => t.startsWith("microsoft.network/virtualnetworks")),
  },
  {
    action: "Microsoft.Network/networkSecurityGroups/join/action",
    reason: "A network interface or subnet associates the NSG",
    when: (types) => types.has("microsoft.network/networkinterfaces") && types.has("microsoft.network/networksecuritygroups"),
  },
  {
    action: "Microsoft.Network/publicIPAddresses/join/action",
    reason: "A network interface attaches the public IP",
    when: (types) => types.has("microsoft.network/networkinterfaces") && types.has("microsoft.network/publicipaddresses"),
  },
  {
    action: "Microsoft.Compute/disks/write",
    reason: "Virtual machines create their OS / data disks",
    when: (types) => types.has("microsoft.compute/virtualmachines") || types.has("microsoft.compute/virtualmachinescalesets"),
  },
  {
    action: "Microsoft.Authorization/roleDefinitions/read",
    reason: "Creating a role assignment resolves the referenced role definition",
    when: (types) => types.has("microsoft.authorization/roleassignments"),
  },
  {
    action: "Microsoft.ManagedIdentity/userAssignedIdentities/assign/action",
    reason: "Assigning a user-assigned managed identity to a resource",
    when: (types, text) => types.has("microsoft.managedidentity/userassignedidentities") || /userassignedidentities/i.test(text),
  },
  {
    action: "Microsoft.Storage/storageAccounts/listkeys/action",
    reason: "The template reads storage account keys (listKeys())",
    when: (types, text) => types.has("microsoft.storage/storageaccounts") && /listkeys\s*\(/i.test(text),
  },
];

// ─── Parsing ─────────────────────────────────────────────────────────────────

// Combine an ARM parent type with a (possibly relative) child type.
// Nested ARM children can be written relative: parent "Microsoft.Storage/storageAccounts"
// + child "blobServices/containers" → full "Microsoft.Storage/storageAccounts/blobServices/containers".
function fullType(parentType, rawType) {
  if (!rawType) return null;
  // Already a full provider type (has "Namespace.Something/") — use as-is.
  if (/^[A-Za-z][\w.]*\.[A-Za-z]\w*\//.test(rawType)) return rawType;
  if (parentType) return `${parentType}/${rawType}`;
  return rawType;
}

function isExpression(t) {
  return typeof t === "string" && t.trim().startsWith("[");
}

// Walk an ARM resources collection (array, or the languageVersion-2 object form).
function walkArmResources(resources, parentType, out, warnings) {
  if (!resources) return;
  const list = Array.isArray(resources) ? resources : Object.values(resources);
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const raw = r.type;
    if (isExpression(raw)) { warnings.add("Some resource types are parameterised expressions and were skipped."); continue; }
    const type = fullType(parentType, raw);
    if (type && !isExpression(type)) {
      out.push({ type, mode: r.existing ? "read" : "manage" });
      // A nested deployment carries its own template — recurse into it.
      if (/^Microsoft\.Resources\/deployments$/i.test(type) && r.properties?.template?.resources) {
        walkArmResources(r.properties.template.resources, null, out, warnings);
      }
    }
    if (r.resources) walkArmResources(r.resources, type, out, warnings);
  }
}

function parseArm(json) {
  const out = [];
  const warnings = new Set();
  walkArmResources(json.resources, null, out, warnings);
  return { format: "arm", resources: out, modules: 0, warnings: [...warnings] };
}

function parseBicep(text) {
  const out = [];
  const warnings = new Set();
  // resource <symbol> 'Provider.Namespace/type@apiVersion' [existing] = ...
  const reRes = /resource\s+[\w$]+\s+'([^'@\n]+)@[^'\n]+'\s*(existing\b)?[^\n{=]*=/g;
  let m;
  while ((m = reRes.exec(text)) !== null) {
    const type = m[1].trim();
    if (!type || isExpression(type)) continue;
    out.push({ type, mode: m[2] ? "read" : "manage" });
  }
  // Modules reference other files we can't see — count and warn.
  const modules = (text.match(/^\s*module\s+[\w$]+\s+'/gm) || []).length;
  if (modules > 0) warnings.add(`${modules} module${modules > 1 ? "s" : ""} reference other files not visible here. Best coverage: run \`bicep build\` and paste the compiled ARM JSON — modules are inlined and fully analysed. Or paste the module file(s) into this box as well.`);
  if (!out.length && !modules) warnings.add("No resource declarations found. Paste an ARM template (JSON) or a Bicep file.");
  return { format: "bicep", resources: out, modules, warnings: [...warnings] };
}

// Detect format and parse. Returns { format, resources:[{type,mode}], modules, warnings }.
export function parseIaC(text) {
  const t = (text || "").trim();
  if (!t) return { format: "empty", resources: [], modules: 0, warnings: [] };
  // ARM templates are JSON with a resources collection.
  if (t.startsWith("{")) {
    try {
      const json = JSON.parse(t);
      if (json && (json.resources || /schema.*deploymentTemplate/i.test(json.$schema || ""))) {
        return parseArm(json);
      }
      return { format: "unknown", resources: [], modules: 0, warnings: ["JSON parsed but no ARM `resources` array found."] };
    } catch (e) {
      return { format: "unknown", resources: [], modules: 0, warnings: ["Looks like JSON but failed to parse: " + e.message] };
    }
  }
  return parseBicep(t);
}

// ─── Deriving operations ─────────────────────────────────────────────────────

// Build a case-insensitive lookup from the real operations dataset:
//   "microsoft.web/sites/write" → "Microsoft.Web/sites/Write"
export function buildOpIndex(allOps) {
  const idx = new Map();
  for (const op of allOps) {
    const k = op.action.toLowerCase();
    if (!idx.has(k)) idx.set(k, op.action);
  }
  return idx;
}

const levelOf = (action) => {
  const last = action.split("/").pop().toLowerCase();
  if (last === "read") return "Read";
  if (last === "write") return "Write";
  if (last === "delete") return "Delete";
  return "Action";
};

// parsed: output of parseIaC. index: Map from buildOpIndex. opts: {includeDelete, includeImplicit, includeResourceGroupWrite}.
// Resolves every candidate action against the dataset (exact casing) and reports
// what could not be mapped.
export function deriveOperations(parsed, index, opts = {}) {
  const { includeDelete = false, includeImplicit = true, includeResourceGroupWrite = false } = opts;
  const resolve = (canonical) => index.get(canonical.toLowerCase()) || null;
  const seen = new Set();          // lowercased resolved actions, for dedup
  const add = (list, action, extra) => {
    const k = action.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    list.push({ action, level: levelOf(action), ...extra });
    return true;
  };

  const core = [];
  const perType = [];
  const implicit = [];
  const unresolved = [];

  const hasResources = parsed.resources.length > 0;

  // 1) Deployment machinery — always needed to run a template deployment.
  if (hasResources) {
    for (const canonical of [
      "Microsoft.Resources/deployments/read",
      "Microsoft.Resources/deployments/write",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      ...(includeResourceGroupWrite ? ["Microsoft.Resources/subscriptions/resourceGroups/write"] : []),
      // Teardown of a template-created resource group also needs its delete.
      ...(includeResourceGroupWrite && includeDelete ? ["Microsoft.Resources/subscriptions/resourceGroups/delete"] : []),
    ]) {
      const real = resolve(canonical);
      if (real) add(core, real, { reason: "Deploy the template" });
      else unresolved.push(canonical);
    }
  }

  // 2) Per resource type — read + write (+ delete). `existing` resources are read-only.
  //    Merge duplicate types (same type declared twice) into one entry.
  const byType = new Map();
  for (const r of parsed.resources) {
    const prev = byType.get(r.type);
    // "manage" beats "read": if a type appears both existing and managed, manage wins.
    if (!prev || (prev === "read" && r.mode === "manage")) byType.set(r.type, r.mode);
  }
  for (const [type, mode] of byType) {
    const levels = mode === "read" ? ["read"] : includeDelete ? ["read", "write", "delete"] : ["read", "write"];
    const actions = [];
    const missing = [];
    for (const lvl of levels) {
      const real = resolve(`${type}/${lvl}`);
      if (real && !seen.has(real.toLowerCase())) { seen.add(real.toLowerCase()); actions.push({ action: real, level: levelOf(real) }); }
      else if (!real) missing.push(`${type}/${lvl}`);
    }
    // Skip entries whose actions were all consumed by core (e.g. nested
    // Microsoft.Resources/deployments) — an empty row is just noise.
    if (actions.length || missing.length) perType.push({ type, mode, actions, missing });
    for (const c of missing) unresolved.push(c);
  }

  // 3) Implicit deploy-time actions (curated, toggleable).
  if (includeImplicit) {
    const typeSet = new Set([...byType.keys()].map(t => t.toLowerCase()));
    const rawText = parsed._raw || "";
    for (const rule of IMPLICIT_RULES) {
      if (!rule.when(typeSet, rawText)) continue;
      const real = resolve(rule.action);
      if (real) add(implicit, real, { reason: rule.reason });
      else unresolved.push(rule.action);
    }
  }

  const allActions = [
    ...core.map(o => o.action),
    ...perType.flatMap(t => t.actions.map(a => a.action)),
    ...implicit.map(o => o.action),
  ];

  return {
    format: parsed.format,
    core,
    perType,
    implicit,
    unresolved: [...new Set(unresolved)],
    allActions,
    stats: {
      resourceCount: byType.size,
      actionCount: allActions.length,
      implicitCount: implicit.length,
      unresolvedCount: new Set(unresolved).size,
    },
  };
}

// Convenience: parse + derive in one call (keeps the raw text for function detection).
export function analyzeIaC(text, allOps, opts) {
  const parsed = parseIaC(text);
  parsed._raw = text || "";
  const index = Array.isArray(allOps) ? buildOpIndex(allOps) : allOps; // accept prebuilt index
  return deriveOperations(parsed, index, opts);
}

// ─── Samples (for the "load sample" buttons / how-do-I-test question) ─────────
export const SAMPLE_BICEP = `param location string = resourceGroup().location

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: 'app-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    subnets: [ { name: 'default', properties: { addressPrefix: '10.0.0.0/24' } } ]
  }
}

resource nsg 'Microsoft.Network/networkSecurityGroups@2023-09-01' = {
  name: 'app-nsg'
  location: location
}

resource pip 'Microsoft.Network/publicIPAddresses@2023-09-01' = {
  name: 'app-pip'
  location: location
  sku: { name: 'Standard' }
  properties: { publicIPAllocationMethod: 'Static' }
}

resource nic 'Microsoft.Network/networkInterfaces@2023-09-01' = {
  name: 'app-nic'
  location: location
  properties: {
    ipConfigurations: [ {
      name: 'ipconfig1'
      properties: {
        subnet: { id: vnet.properties.subnets[0].id }
        publicIPAddress: { id: pip.id }
      }
    } ]
    networkSecurityGroup: { id: nsg.id }
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: 'app-vm'
  location: location
  properties: {
    hardwareProfile: { vmSize: 'Standard_B2s' }
    networkProfile: { networkInterfaces: [ { id: nic.id } ] }
  }
}

resource stg 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'appstg\${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}
`;

export const SAMPLE_ARM = JSON.stringify({
  $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  contentVersion: "1.0.0.0",
  resources: [
    {
      type: "Microsoft.Storage/storageAccounts",
      apiVersion: "2023-05-01",
      name: "appstg",
      location: "[resourceGroup().location]",
      sku: { name: "Standard_LRS" },
      kind: "StorageV2",
    },
    {
      type: "Microsoft.Web/serverfarms",
      apiVersion: "2023-12-01",
      name: "app-plan",
      location: "[resourceGroup().location]",
      sku: { name: "B1" },
    },
    {
      type: "Microsoft.Web/sites",
      apiVersion: "2023-12-01",
      name: "app-web",
      location: "[resourceGroup().location]",
      properties: { serverFarmId: "[resourceId('Microsoft.Web/serverfarms','app-plan')]" },
    },
    {
      type: "Microsoft.Authorization/roleAssignments",
      apiVersion: "2022-04-01",
      name: "[guid(resourceGroup().id)]",
      properties: { roleDefinitionId: "...", principalId: "..." },
    },
  ],
}, null, 2);
