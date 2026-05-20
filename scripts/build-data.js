#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const P=path.resolve(__dirname,".."),R=path.join(P,"data","raw"),D=path.join(P,"data");
const NS2CAT={
  // Compute
  "Microsoft.Compute":"Compute","Microsoft.Batch":"Compute","Microsoft.ClassicCompute":"Compute","Microsoft.ServiceFabric":"Compute",
  "Microsoft.HybridCompute":"Compute","Microsoft.AzureStackHCI":"Compute","Microsoft.VirtualMachineImages":"Compute",
  // Networking
  "Microsoft.Network":"Networking","Microsoft.Cdn":"Networking","Microsoft.ClassicNetwork":"Networking","Microsoft.ManagedNetwork":"Networking",
  "Microsoft.NetworkCloud":"Networking","Microsoft.ManagedNetworkFabric":"Networking",
  // Storage
  "Microsoft.Storage":"Storage","Microsoft.ClassicStorage":"Storage","Microsoft.StorageSync":"Storage","Microsoft.StoragePool":"Storage",
  "Microsoft.NetApp":"Storage","Microsoft.DataBox":"Storage","Microsoft.ElasticSan":"Storage",
  "Microsoft.StorageCache":"Storage","Microsoft.StorageMover":"Storage",
  // Databases
  "Microsoft.Sql":"Databases","Microsoft.DBforMySQL":"Databases","Microsoft.DBforPostgreSQL":"Databases","Microsoft.DBforMariaDB":"Databases",
  "Microsoft.DocumentDB":"Databases","Microsoft.Cache":"Databases","Microsoft.SqlVirtualMachine":"Databases",
  // Web + Serverless
  "Microsoft.Web":"Web + Serverless","Microsoft.CertificateRegistration":"Web + Serverless","Microsoft.DomainRegistration":"Web + Serverless",
  "Microsoft.SignalRService":"Web + Serverless","Microsoft.Communication":"Web + Serverless","Microsoft.ApiManagement":"Web + Serverless",
  "Microsoft.App":"Web + Serverless","Microsoft.AppPlatform":"Web + Serverless",
  // Containers
  "Microsoft.ContainerService":"Containers","Microsoft.ContainerRegistry":"Containers","Microsoft.ContainerInstance":"Containers",
  "Microsoft.KubernetesConfiguration":"Containers","Microsoft.Kubernetes":"Containers",
  // AI + Machine Learning
  "Microsoft.MachineLearningServices":"AI + Machine Learning","Microsoft.CognitiveServices":"AI + Machine Learning",
  "Microsoft.BotService":"AI + Machine Learning","Microsoft.Search":"AI + Machine Learning",
  // Security
  "Microsoft.KeyVault":"Security","Microsoft.Security":"Security","Microsoft.SecurityInsights":"Security","Microsoft.Attestation":"Security",
  "Microsoft.Purview":"Security",
  // Identity
  "Microsoft.ManagedIdentity":"Identity","Microsoft.AAD":"Identity","Microsoft.AzureActiveDirectory":"Identity",
  // DevOps
  "Microsoft.DevTestLab":"DevOps","Microsoft.DevCenter":"DevOps","Microsoft.LabServices":"DevOps",
  "Microsoft.LoadTestService":"DevOps","Microsoft.DevOpsInfrastructure":"DevOps",
  // Monitor
  "Microsoft.Insights":"Monitor","Microsoft.OperationalInsights":"Monitor","Microsoft.Monitor":"Monitor",
  "Microsoft.AlertsManagement":"Monitor","Microsoft.Dashboard":"Monitor",
  // Management + Governance
  "Microsoft.Authorization":"Management + Governance","Microsoft.Resources":"Management + Governance","Microsoft.Management":"Management + Governance",
  "Microsoft.PolicyInsights":"Management + Governance","Microsoft.CostManagement":"Management + Governance","Microsoft.Billing":"Management + Governance",
  "Microsoft.Blueprint":"Management + Governance","Microsoft.Advisor":"Management + Governance","Microsoft.Maintenance":"Management + Governance",
  "Microsoft.ResourceHealth":"Management + Governance","Microsoft.Support":"Management + Governance","Microsoft.Subscription":"Management + Governance",
  "Microsoft.Portal":"Management + Governance","Microsoft.Features":"Management + Governance",
  "Microsoft.Automation":"Management + Governance","Microsoft.AppConfiguration":"Management + Governance",
  // Integration
  "Microsoft.Logic":"Integration","Microsoft.EventHub":"Integration","Microsoft.EventGrid":"Integration",
  "Microsoft.ServiceBus":"Integration","Microsoft.Relay":"Integration","Microsoft.NotificationHubs":"Integration",
  "Microsoft.DataFactory":"Integration",
  // Analytics
  "Microsoft.Databricks":"Analytics","Microsoft.HDInsight":"Analytics","Microsoft.Synapse":"Analytics",
  "Microsoft.StreamAnalytics":"Analytics","Microsoft.PowerBIDedicated":"Analytics","Microsoft.AnalysisServices":"Analytics",
  "Microsoft.Kusto":"Analytics","Microsoft.Fabric":"Analytics",
  // Desktop Virtualization
  "Microsoft.DesktopVirtualization":"Desktop Virtualization",
  // Internet of Things
  "Microsoft.Devices":"Internet of Things","Microsoft.IoTCentral":"Internet of Things","Microsoft.DigitalTwins":"Internet of Things",
  "Microsoft.TimeSeriesInsights":"Internet of Things",
  // Backup + Recovery
  "Microsoft.RecoveryServices":"Backup + Recovery","Microsoft.DataProtection":"Backup + Recovery",
  // Migration
  "Microsoft.Migrate":"Migration","Microsoft.OffAzure":"Migration",
};
const CI={"Compute":"🖥","Networking":"🌐","Storage":"📦","Databases":"🗄","Web + Serverless":"🌍","Containers":"🐳","AI + Machine Learning":"🧠","Security":"🔐","Identity":"🛡","DevOps":"🔧","Monitor":"📊","Management + Governance":"⚙","Integration":"🔗","Analytics":"📈","Desktop Virtualization":"🖵","Internet of Things":"📡","Backup + Recovery":"💾","Migration":"🚚","Other":"📋"};
const CO=["Compute","Networking","Storage","Databases","Web + Serverless","Containers","Security","Identity","AI + Machine Learning","Monitor","Management + Governance","Integration","Analytics","Desktop Virtualization","Internet of Things","DevOps","Backup + Recovery","Migration","Other"];
const SKIP=[/\/operations\/read$/i,/\/operationResults/i,/\/operationStatuses/i,/\/usages\/read$/i,/\/providers\/read$/i,/\/locations\//i,/\/diagnosticSettings/i,/\/diagnosticSettingsCategories/i,/\/metricDefinitions/i,/\/metrics\b/i,/\/logDefinitions/i,/\/diagnosticOperations/i,/\/eventGridFilters/i,/\/diagnosticRunCommands/i];
const D2=new Set(["subscriptions/resourceGroups","servers/databases","servers/firewallRules","servers/elasticPools","hostpools/sessionhosts","vaults/secrets","vaults/keys","vaults/certificates","vaults/accessPolicies"]);

// Provider-aware display name overrides to prevent collisions
const DN={
  "Microsoft.KeyVault|vaults":"Key Vaults","Microsoft.KeyVault|vaults/secrets":"Key Vault Secrets","Microsoft.KeyVault|vaults/keys":"Key Vault Keys","Microsoft.KeyVault|vaults/certificates":"Key Vault Certificates","Microsoft.KeyVault|vaults/accessPolicies":"Key Vault Access Policies",
  "Microsoft.RecoveryServices|vaults":"Recovery Services Vaults",
  "Microsoft.DataProtection|backupVaults":"Backup Vaults","Microsoft.DataProtection|resourceGuards":"Resource Guards","Microsoft.DataProtection|resourceOperationGateways":"Operation Gateways",
  "Microsoft.Sql|servers":"SQL Servers","Microsoft.Sql|servers/databases":"SQL Databases","Microsoft.Sql|servers/firewallRules":"SQL Firewall Rules","Microsoft.Sql|servers/elasticPools":"SQL Elastic Pools",
  "Microsoft.DBforPostgreSQL|servers":"PostgreSQL Servers","Microsoft.DBforPostgreSQL|flexibleServers":"PostgreSQL Flexible Servers",
  "Microsoft.DBforMySQL|servers":"MySQL Servers","Microsoft.DBforMySQL|flexibleServers":"MySQL Flexible Servers",
  "Microsoft.DBforMariaDB|servers":"MariaDB Servers",
  "Microsoft.Cache|redis":"Redis Caches",
  "Microsoft.DocumentDB|databaseAccounts":"Cosmos DB Accounts",
  "Microsoft.OperationalInsights|workspaces":"Log Analytics Workspaces","Microsoft.OperationalInsights|clusters":"Log Analytics Clusters",
  "Microsoft.Insights|components":"Application Insights","Microsoft.Insights|workbooks":"Workbooks","Microsoft.Insights|actionGroups":"Alert Action Groups","Microsoft.Insights|activityLogAlerts":"Activity Log Alerts","Microsoft.Insights|scheduledQueryRules":"Scheduled Query Rules",
  "Microsoft.MachineLearningServices|workspaces":"ML Workspaces",
  "Microsoft.Databricks|workspaces":"Databricks Workspaces",
  "Microsoft.Synapse|workspaces":"Synapse Workspaces",
  "Microsoft.DesktopVirtualization|hostpools":"AVD Host Pools","Microsoft.DesktopVirtualization|hostpools/sessionhosts":"AVD Session Hosts","Microsoft.DesktopVirtualization|applicationgroups":"AVD Application Groups","Microsoft.DesktopVirtualization|workspaces":"AVD Workspaces",
  "Microsoft.Resources|subscriptions/resourceGroups":"Resource Groups","Microsoft.Resources|deployments":"ARM Deployments","Microsoft.Resources|templateSpecs":"Template Specs",
  "Microsoft.Authorization|roleAssignments":"Role Assignments","Microsoft.Authorization|roleDefinitions":"Role Definitions","Microsoft.Authorization|policyAssignments":"Policy Assignments","Microsoft.Authorization|policyDefinitions":"Policy Definitions","Microsoft.Authorization|locks":"Resource Locks",
  "Microsoft.ManagedIdentity|userAssignedIdentities":"Managed Identities",
  "Microsoft.ContainerService|managedClusters":"AKS Clusters",
  "Microsoft.ContainerRegistry|registries":"Container Registries",
  "Microsoft.ContainerInstance|containerGroups":"Container Instances",
  "Microsoft.Web|sites":"Web / Function Apps","Microsoft.Web|serverfarms":"App Service Plans","Microsoft.Web|staticSites":"Static Web Apps","Microsoft.Web|certificates":"App Certificates",
  "Microsoft.Network|virtualNetworks":"Virtual Networks","Microsoft.Network|networkInterfaces":"Network Interfaces (NICs)","Microsoft.Network|publicIPAddresses":"Public IP Addresses","Microsoft.Network|networkSecurityGroups":"Network Security Groups (NSGs)","Microsoft.Network|loadBalancers":"Load Balancers","Microsoft.Network|applicationGateways":"Application Gateways","Microsoft.Network|dnsZones":"DNS Zones","Microsoft.Network|privateDnsZones":"Private DNS Zones","Microsoft.Network|privateEndpoints":"Private Endpoints","Microsoft.Network|bastionHosts":"Bastion Hosts","Microsoft.Network|natGateways":"NAT Gateways","Microsoft.Network|azureFirewalls":"Azure Firewalls","Microsoft.Network|virtualNetworkGateways":"VPN Gateways","Microsoft.Network|expressRouteCircuits":"ExpressRoute Circuits","Microsoft.Network|routeTables":"Route Tables","Microsoft.Network|networkWatchers":"Network Watchers","Microsoft.Network|frontDoors":"Front Doors",
  "Microsoft.Compute|virtualMachines":"Virtual Machines","Microsoft.Compute|disks":"Managed Disks","Microsoft.Compute|snapshots":"Disk Snapshots","Microsoft.Compute|galleries":"Compute Galleries","Microsoft.Compute|availabilitySets":"Availability Sets","Microsoft.Compute|virtualMachineScaleSets":"Virtual Machine Scale Sets","Microsoft.Compute|proximityPlacementGroups":"Proximity Placement Groups","Microsoft.Compute|images":"VM Images",
  "Microsoft.Storage|storageAccounts":"Storage Accounts",
  "Microsoft.EventHub|namespaces":"Event Hub Namespaces",
  "Microsoft.ServiceBus|namespaces":"Service Bus Namespaces",
  "Microsoft.Logic|workflows":"Logic App Workflows",
};

// Priority: lower number = shown first. 0 = top priority. Unset = 999 (bottom)
const PRIO={
  // Compute
  "Microsoft.Compute|virtualMachines":1,"Microsoft.Compute|virtualMachineScaleSets":2,"Microsoft.Compute|disks":3,"Microsoft.Compute|availabilitySets":4,"Microsoft.Compute|images":5,"Microsoft.Compute|snapshots":6,"Microsoft.Compute|galleries":7,
  // Networking
  "Microsoft.Network|virtualNetworks":1,"Microsoft.Network|networkSecurityGroups":2,"Microsoft.Network|networkInterfaces":3,"Microsoft.Network|publicIPAddresses":4,"Microsoft.Network|loadBalancers":5,"Microsoft.Network|privateEndpoints":6,"Microsoft.Network|natGateways":7,"Microsoft.Network|applicationGateways":8,"Microsoft.Network|routeTables":9,"Microsoft.Network|dnsZones":10,"Microsoft.Network|privateDnsZones":11,"Microsoft.Network|bastionHosts":12,"Microsoft.Network|azureFirewalls":13,"Microsoft.Network|virtualNetworkGateways":14,
  // Storage
  "Microsoft.Storage|storageAccounts":1,
  // Databases
  "Microsoft.Sql|servers":1,"Microsoft.Sql|servers/databases":2,"Microsoft.DocumentDB|databaseAccounts":3,"Microsoft.DBforPostgreSQL|flexibleServers":4,"Microsoft.DBforMySQL|flexibleServers":5,"Microsoft.Cache|redis":6,
  // Web
  "Microsoft.Web|sites":1,"Microsoft.Web|serverfarms":2,"Microsoft.Web|staticSites":3,"Microsoft.App|containerApps":4,"Microsoft.ApiManagement|service":5,
  // Containers
  "Microsoft.ContainerService|managedClusters":1,"Microsoft.ContainerRegistry|registries":2,"Microsoft.ContainerInstance|containerGroups":3,
  // Security
  "Microsoft.KeyVault|vaults":1,
  // Identity
  "Microsoft.ManagedIdentity|userAssignedIdentities":1,
  // AI
  "Microsoft.CognitiveServices|accounts":1,"Microsoft.MachineLearningServices|workspaces":2,"Microsoft.Search|searchServices":3,
  // Monitor
  "Microsoft.OperationalInsights|workspaces":1,"Microsoft.Insights|components":2,"Microsoft.Insights|actionGroups":3,
  // Mgmt
  "Microsoft.Resources|subscriptions/resourceGroups":1,"Microsoft.Resources|deployments":2,"Microsoft.Authorization|roleAssignments":3,"Microsoft.Authorization|roleDefinitions":4,"Microsoft.Authorization|policyAssignments":5,"Microsoft.Authorization|locks":6,
  // Integration
  "Microsoft.Logic|workflows":1,"Microsoft.EventHub|namespaces":2,"Microsoft.EventGrid|topics":3,"Microsoft.ServiceBus|namespaces":4,
  // Analytics
  "Microsoft.Databricks|workspaces":1,"Microsoft.Synapse|workspaces":2,
  // AVD
  "Microsoft.DesktopVirtualization|hostpools":1,"Microsoft.DesktopVirtualization|hostpools/sessionhosts":2,"Microsoft.DesktopVirtualization|applicationgroups":3,
  // IoT
  "Microsoft.Devices|IotHubs":1,
  // Backup
  "Microsoft.RecoveryServices|vaults":1,"Microsoft.DataProtection|backupVaults":2,
};
function prio(ns,k){return PRIO[`${ns}|${k}`]||999}

function sc(s){return s.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g,"$1 $2").trim()}
function dn(ns,k){return DN[`${ns}|${k}`]||sc(k.split("/").pop())}
function getTop(op,ns){const rest=op.slice(ns.length+1),parts=rest.split("/");if(parts.length<2)return null;if(parts.length>=3&&D2.has(parts[0]+"/"+parts[1]))return parts[0]+"/"+parts[1];return parts[0]}
function cl(n){const l=n.split("/").pop().toLowerCase();if(l==="read")return"Read";if(l==="write")return"Write";if(l==="delete")return"Delete";return"Action"}

// Normalize namespace to TitleCase so lowercase variants (microsoft.web → Microsoft.Web) match the map
function normNs(ns){return ns.replace(/(?:^|\.)([a-z])/g,(_,c)=>_.replace(c,c.toUpperCase()))}

function build(raw){
  const S={};
  for(const prov of raw){const ns=prov.name||"",cat=NS2CAT[ns]||NS2CAT[normNs(ns)]||"Other";for(const rt of prov.resourceTypes||[])for(const op of rt.operations||[]){const n=op.name||"";if(!n||SKIP.some(p=>p.test(n)))continue;const top=getTop(n,ns);if(!top)continue;const lv=cl(n),isD=op.isDataAction||false;if(!S[cat])S[cat]={};if(!S[cat][ns])S[cat][ns]={};if(!S[cat][ns][top])S[cat][ns][top]={Read:[],Write:[],Delete:[],Action:[]};const b=S[cat][ns][top][lv];if(!b.some(e=>e.action===n))b.push({action:n,type:isD?"dataAction":"action"})}}
  const cats=[];
  for(const cn of CO){if(!S[cn])continue;const provs=[];for(const[ns,rts]of Object.entries(S[cn])){const types=[];for(const[k,lvls]of Object.entries(rts)){const acts=[];for(const[lv,ops]of Object.entries(lvls)){if(!ops.length)continue;ops.sort((a,b)=>a.action.localeCompare(b.action));acts.push({label:lv,ops,hasDataActions:ops.some(o=>o.type==="dataAction")})}if(!acts.length)continue;acts.sort((a,b)=>["Read","Write","Delete","Action"].indexOf(a.label)-["Read","Write","Delete","Action"].indexOf(b.label));const p=prio(ns,k);types.push({key:k,name:dn(ns,k),provider:ns,actions:acts,totalOps:acts.reduce((s,a)=>s+a.ops.length,0),priority:p})}
  // Sort: priority first (lower=better), then alphabetical
  types.sort((a,b)=>a.priority!==b.priority?a.priority-b.priority:a.name.localeCompare(b.name));
  if(types.length)provs.push({namespace:ns,displayName:ns.replace("Microsoft.",""),types})}provs.sort((a,b)=>a.displayName.localeCompare(b.displayName));if(provs.length)cats.push({name:cn,icon:CI[cn]||"📋",providers:provs,totalTypes:provs.reduce((s,p)=>s+p.types.length,0),totalOps:provs.reduce((s,p)=>p.types.reduce((s2,t)=>s2+t.totalOps,0)+s,0)})}
  return cats;
}
function procRoles(p){if(!fs.existsSync(p)){console.warn("⚠ no roles");return[]}const raw=JSON.parse(fs.readFileSync(p,"utf-8"));return raw.map(r=>{const pm=r.permissions||[],a=[...new Set(pm.flatMap(p=>p.actions||[]))],na=[...new Set(pm.flatMap(p=>p.notActions||[]))],da=[...new Set(pm.flatMap(p=>p.dataActions||[]))],nda=[...new Set(pm.flatMap(p=>p.notDataActions||[]))];let e=0;a.forEach(x=>{if(x==="*")e+=5000;else if(x==="*/read")e+=3000;else if(x.endsWith("/*"))e+=30;else if(x.includes("*"))e+=10;else e++});return{name:r.roleName||r.name,id:r.name,description:r.description||"",actions:a,notActions:na,dataActions:da,notDataActions:nda,_estimatedActions:e}}).filter(r=>!r.description.toLowerCase().includes("deprecated")).sort((a,b)=>a.name.localeCompare(b.name))}

function buildOpsIndex(rawProviders, uiCats) {
  const inUI = new Set();
  for (const cat of uiCats) {
    for (const prov of cat.providers) {
      for (const type of prov.types) {
        for (const ag of type.actions) {
          for (const op of ag.ops) inUI.add(op.action);
        }
      }
    }
  }
  const descMap = {};
  for (const prov of rawProviders) {
    const allOps = [...(prov.operations||[]), ...(prov.resourceTypes||[]).flatMap(rt=>rt.operations||[])];
    for (const op of allOps) {
      if (op.name && inUI.has(op.name)) descMap[op.name] = op.description || op.displayName || "";
    }
  }
  return Array.from(inUI).sort().map(action => ({ action, description: descMap[action] || "" }));
}

function main(){
  console.log("Least Privilege Studio for Azure — Data Builder v6\n");
  const roles=procRoles(path.join(R,"roles-raw.json"));
  console.log(`Roles: ${roles.length}`);
  let ui=[];const op=path.join(R,"operations-raw.json");
  let rawOps=null;
  if(fs.existsSync(op)){rawOps=JSON.parse(fs.readFileSync(op,"utf-8"));ui=build(rawOps);console.log(`Categories: ${ui.length}, Types: ${ui.reduce((s,c)=>s+c.totalTypes,0)}, Ops: ${ui.reduce((s,c)=>s+c.totalOps,0)}`)}
  const pub=path.join(P,"public","data");if(!fs.existsSync(pub))fs.mkdirSync(pub,{recursive:true});
  const w=(n,d)=>{const j=JSON.stringify(d,null,2);fs.writeFileSync(path.join(pub,n),j);console.log(`✓ ${n}`)};
  w("roles.json",roles);w("ui-structure.json",ui);
  w("metadata.json",{lastSync:new Date().toISOString(),roleCount:roles.length,operationCount:ui.reduce((s,c)=>s+c.totalOps,0),categoryCount:ui.length});
  if(rawOps&&ui.length){const idx=buildOpsIndex(rawOps,ui);w("operations-index.json",idx);console.log(`Operations index: ${idx.length} ops`);}
}
main();
