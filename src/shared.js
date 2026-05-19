// Shared constants and utilities used across catalog views

export const AC = { "Compute": "#e94560", "Networking": "#4fc3f7", "Storage": "#0f9b58", "Databases": "#5c6bc0", "Web + Serverless": "#ef5350", "Containers": "#29b6f6", "AI + Machine Learning": "#ce93d8", "Security": "#f5a623", "Identity": "#ff7043", "DevOps": "#8d6e63", "Monitor": "#fdd835", "Management + Governance": "#78909c", "Integration": "#26a69a", "Analytics": "#ab47bc", "Desktop Virtualization": "#7e57c2", "Internet of Things": "#00acc1", "Backup + Recovery": "#66bb6a", "Migration": "#a1887f", "Other": "#90a4ae" };
export const ac = c => AC[c] || "#4fc3f7";

export const ROOT_STYLE = { "--m": "'IBM Plex Mono',monospace", minHeight: "100vh", background: "linear-gradient(170deg,#0a0a1a 0%,#111128 40%,#0d1117 100%)", color: "#c8d6e5", fontFamily: "'Instrument Sans',-apple-system,sans-serif" };

const _reCache = new Map();
export function mw(pattern, operation) {
  if (pattern === operation) return true;
  if (pattern === "*") return true;
  if (pattern === "*/read") return operation.endsWith("/read");
  let re = _reCache.get(pattern);
  if (!re) {
    re = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i");
    _reCache.set(pattern, re);
  }
  return re.test(operation);
}

export function roleCoversOp(role, action, isDataAction) {
  const pool = isDataAction ? (role.dataActions || []) : (role.actions || []);
  const not = isDataAction ? (role.notDataActions || []) : (role.notActions || []);
  return pool.some(p => mw(p, action)) && !not.some(p => mw(p, action));
}

export const PN = { "Microsoft.Compute": "Compute", "Microsoft.Network": "Network", "Microsoft.Storage": "Storage", "Microsoft.Sql": "SQL", "Microsoft.DBforMySQL": "MySQL", "Microsoft.DBforPostgreSQL": "PostgreSQL", "Microsoft.DocumentDB": "Cosmos DB", "Microsoft.Cache": "Redis Cache", "Microsoft.Web": "App Service", "Microsoft.App": "Container Apps", "Microsoft.ApiManagement": "API Management", "Microsoft.ContainerService": "AKS", "Microsoft.ContainerRegistry": "Container Registry", "Microsoft.ContainerInstance": "Container Instances", "Microsoft.MachineLearningServices": "Machine Learning", "Microsoft.CognitiveServices": "Cognitive Services", "Microsoft.Search": "AI Search", "Microsoft.KeyVault": "Key Vault", "Microsoft.Security": "Defender for Cloud", "Microsoft.SecurityInsights": "Sentinel", "Microsoft.ManagedIdentity": "Managed Identity", "Microsoft.Insights": "Monitor / Insights", "Microsoft.OperationalInsights": "Log Analytics", "Microsoft.Authorization": "Authorization", "Microsoft.Resources": "Resource Manager", "Microsoft.Logic": "Logic Apps", "Microsoft.EventHub": "Event Hubs", "Microsoft.EventGrid": "Event Grid", "Microsoft.ServiceBus": "Service Bus", "Microsoft.Databricks": "Databricks", "Microsoft.Synapse": "Synapse Analytics", "Microsoft.DesktopVirtualization": "Virtual Desktop", "Microsoft.RecoveryServices": "Recovery Services" };
export const pn = ns => PN[ns] || ns.replace("Microsoft.", "");
