import React, { useState, useMemo, useCallback } from "react";

// ─── Query parsing ────────────────────────────────────────────────────────────
const ABBREV = {
  "vm": "virtual machine", "vms": "virtual machines",
  "nic": "network interface", "nsg": "network security group",
  "vnet": "virtual network", "aks": "kubernetes cluster managed",
  "k8s": "kubernetes cluster", "acr": "container registry",
  "kv": "key vault", "sql": "sql database server",
  "rg": "resource group", "lb": "load balancer",
  "pip": "public ip address", "avd": "virtual desktop host pool",
  "wvd": "virtual desktop", "apim": "api management",
  "cosmos": "cosmos db database account", "eventhub": "event hub namespace",
  "servicebus": "service bus namespace", "adf": "data factory pipeline",
  "law": "log analytics workspace", "appinsights": "application insights component"
};

const READ_WORDS = new Set(["read", "view", "get", "list", "see", "check", "monitor", "audit", "inspect", "browse", "show"]);
const WRITE_WORDS = new Set(["create", "write", "manage", "deploy", "update", "modify", "configure", "setup", "provision", "add", "edit", "change", "make", "build"]);
const DELETE_WORDS = new Set(["delete", "remove", "destroy", "purge", "wipe", "clean"]);

function expandWords(raw) {
  const words = raw.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  const expanded = new Set(words);
  for (const w of words) {
    if (ABBREV[w]) ABBREV[w].split(/\s+/).forEach(sw => expanded.add(sw));
  }
  return Array.from(expanded);
}

function classifyWords(words) {
  const resource = words.filter(w => !READ_WORDS.has(w) && !WRITE_WORDS.has(w) && !DELETE_WORDS.has(w) && w.length >= 3);
  const action = words.filter(w => READ_WORDS.has(w) || WRITE_WORDS.has(w) || DELETE_WORDS.has(w));
  return { resource, action };
}

function parseIntents(q) {
  const parts = q.split(/\band\b|\bplus\b|\balso\b|,|\+/i).map(s => s.trim()).filter(s => s.length >= 3);
  return parts.length >= 1 ? parts : [q.trim()];
}

// Score a role against a single intent.
// Returns 0 if no resource words match (intent not covered).
function scoreRoleForIntent(role, rawIntent) {
  const allWords = expandWords(rawIntent);
  const { resource: resourceWords, action: actionWords } = classifyWords(allWords);

  // Must have resource terms that actually match something
  if (!resourceWords.length) return 0;

  const nameLower = role.name.toLowerCase();
  const descLower = role.description.toLowerCase();

  let resourceScore = 0;
  for (const w of resourceWords) {
    if (nameLower.includes(w)) resourceScore += 6;
    if (descLower.includes(w)) resourceScore += 2;
  }

  // Phrase bonus (resource words joined)
  const phrase = resourceWords.join(" ");
  if (phrase.length >= 4) {
    if (nameLower.includes(phrase)) resourceScore += 5;
    if (descLower.includes(phrase)) resourceScore += 3;
  }

  // Also check action path patterns for resource hints
  const actionText = [...(role.actions || []), ...(role.dataActions || [])].join(" ").toLowerCase();
  for (const w of resourceWords) {
    if (w.length >= 5 && actionText.includes(w)) { resourceScore += 2; break; }
  }

  if (!resourceScore) return 0; // No resource match → intent not covered

  // Action-type modifier
  let actionMod = 1.0;
  const hasReadIntent = actionWords.some(w => READ_WORDS.has(w));
  const hasWriteIntent = actionWords.some(w => WRITE_WORDS.has(w));

  if (hasReadIntent && !hasWriteIntent) {
    // Looking to read: reward read-only roles, penalize broad/write ones
    const isReadOnly = role.actions.length > 0 && role.actions.every(a => a.endsWith("/read") || a === "*/read");
    if (isReadOnly && !role.dataActions?.length) actionMod = 1.4;
    else if (role.actions.some(a => a.endsWith("/delete") || a.endsWith("/*"))) actionMod = 0.7;
  } else if (hasWriteIntent) {
    // Looking to write/manage: penalize read-only roles strongly
    const isReadOnly = role.actions.length > 0 && role.actions.every(a => a.endsWith("/read") || a === "*/read");
    if (isReadOnly) actionMod = 0.2;
  }

  // Breadth penalty — prefer narrow, specific roles
  const est = role._estimatedActions || 1;
  let breadth = 1.0;
  if (est > 3000) breadth = 0.12;
  else if (est > 1000) breadth = 0.35;
  else if (est > 300) breadth = 0.60;
  else if (est > 100) breadth = 0.82;

  return resourceScore * actionMod * breadth;
}

// Score a role across all intents simultaneously.
function scoreRoleMultiIntent(role, intents) {
  const perIntent = intents.map(intent => ({
    intent,
    score: scoreRoleForIntent(role, intent)
  }));
  const coveredCount = perIntent.filter(x => x.score > 0).length;
  const totalScore = perIntent.reduce((s, x) => s + x.score, 0);
  const coveragePct = intents.length > 0 ? coveredCount / intents.length : 0;
  return { perIntent, coveredCount, totalScore, coveragePct };
}

// ─── Components ───────────────────────────────────────────────────────────────

function IntentTag({ intent, covered }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
      background: covered ? "rgba(15,155,88,0.12)" : "rgba(233,69,96,0.08)",
      border: `1px solid ${covered ? "rgba(15,155,88,0.25)" : "rgba(233,69,96,0.15)"}`,
      color: covered ? "#0f9b58" : "#e94560",
      display: "inline-flex", alignItems: "center", gap: 4
    }}>
      <span>{covered ? "✓" : "✗"}</span>
      {intent}
    </span>
  );
}

function AllActionsToggle({ actions, dataActions }) {
  const [show, setShow] = useState(false);
  const total = actions.length + (dataActions?.length || 0);
  return (
    <div>
      <button onClick={() => setShow(!show)} style={{ background: "none", border: "none", color: "#4fc3f7", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
        {show ? "▾ Hide" : "▸ View"} all {total} permission pattern{total !== 1 ? "s" : ""}
      </button>
      {show && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {actions.map(a => (
            <div key={a} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontFamily: "var(--m)", fontSize: 11, color: "#6b7c93", padding: "2px 0", wordBreak: "break-all" }}>
              <span style={{ color: "#4fc3f7", fontSize: 9, marginTop: 2, flexShrink: 0 }}>C</span> {a}
            </div>
          ))}
          {(dataActions || []).map(a => (
            <div key={a} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontFamily: "var(--m)", fontSize: 11, color: "#6b7c93", padding: "2px 0", wordBreak: "break-all" }}>
              <span style={{ color: "#f5a623", fontSize: 9, marginTop: 2, flexShrink: 0 }}>D</span> {a}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleResultCard({ roleResult, intents, maxScore }) {
  const { role, coveredCount, perIntent, totalScore } = roleResult;
  const [expanded, setExpanded] = useState(false);
  const coversFull = coveredCount === intents.length;
  const borderColor = coversFull ? "#0f9b58" : coveredCount > 0 ? "#f5a623" : "rgba(255,255,255,0.08)";
  const isFirst = roleResult.rank === 1;

  // Find action patterns that contain resource words from the query
  const relevantActions = useMemo(() => {
    if (!expanded) return [];
    const resourceWords = intents.flatMap(intent => {
      const allW = expandWords(intent);
      return classifyWords(allW).resource.filter(w => w.length >= 4);
    });
    const all = [...(role.actions || []), ...(role.dataActions || [])];
    return all.filter(a => resourceWords.some(w => a.toLowerCase().includes(w))).slice(0, 20);
  }, [expanded, intents, role]);

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${borderColor}33`, borderLeft: `3px solid ${borderColor}`, borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: 16, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              {isFirst && coversFull && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "rgba(15,155,88,0.15)", color: "#0f9b58", fontWeight: 700, border: "1px solid rgba(15,155,88,0.3)", flexShrink: 0 }}>BEST MATCH</span>}
              {isFirst && !coversFull && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "rgba(79,195,247,0.12)", color: "#4fc3f7", fontWeight: 700, border: "1px solid rgba(79,195,247,0.25)", flexShrink: 0 }}>TOP RESULT</span>}
              <span style={{ fontSize: 15, fontWeight: 600, color: "#e8ecf1" }}>{role.name}</span>
            </div>
            <div style={{ fontSize: 11, color: "#3a4556", fontFamily: "var(--m)", marginBottom: 5 }}>{role.id}</div>
            <div style={{ fontSize: 12, color: "#6b7c93", lineHeight: 1.5 }}>{role.description}</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "right", minWidth: 56 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: coversFull ? "#0f9b58" : coveredCount > 0 ? "#f5a623" : "#4a5568", lineHeight: 1 }}>
              {coveredCount}/{intents.length}
            </div>
            <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 4 }}>intent{intents.length !== 1 ? "s" : ""}</div>
            <div style={{ fontSize: 10, color: "#3a4556" }}>~{role._estimatedActions} ops</div>
          </div>
        </div>

        {/* Per-intent coverage tags */}
        {intents.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {perIntent.map(({ intent, score }) => (
              <IntentTag key={intent} intent={intent} covered={score > 0} />
            ))}
          </div>
        )}

        {/* Relevance bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, height: 3, background: "#1a1a35", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.round(Math.min((totalScore / maxScore) * 100, 100))}%`, height: "100%", background: borderColor === "rgba(255,255,255,0.08)" ? "#4a5568" : borderColor, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--m)", minWidth: 30, textAlign: "right" }}>
            {Math.round(Math.min((totalScore / maxScore) * 100, 100))}%
          </span>
          <span style={{ fontSize: 11, color: "#4a5568" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px", background: "rgba(0,0,0,0.15)" }}>
          {/* Plane summary chips */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 10, background: "rgba(79,195,247,0.08)", border: "1px solid rgba(79,195,247,0.15)", color: "#4fc3f7" }}>
              {role.actions.length} control plane
            </span>
            {role.dataActions?.length > 0 && (
              <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 10, background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.15)", color: "#f5a623" }}>
                {role.dataActions.length} data plane
              </span>
            )}
          </div>

          {/* Matching permission patterns */}
          {relevantActions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Permission patterns matching your query
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {relevantActions.map(a => {
                  const isData = (role.dataActions || []).includes(a);
                  return (
                    <div key={a} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontFamily: "var(--m)", fontSize: 11, color: "#8899aa", padding: "3px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 4, wordBreak: "break-all" }}>
                      <span style={{ color: isData ? "#f5a623" : "#4fc3f7", fontSize: 9, marginTop: 2, flexShrink: 0 }}>{isData ? "D" : "C"}</span>
                      {a}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <AllActionsToggle actions={role.actions} dataActions={role.dataActions} />
        </div>
      )}
    </div>
  );
}

const EXAMPLES = [
  { label: "Read VM configs", q: "read virtual machine configurations" },
  { label: "Manage AKS", q: "manage AKS clusters" },
  { label: "Access KV secrets", q: "access key vault secrets" },
  { label: "Read blobs + create VM", q: "read blob storage and create vm" },
  { label: "Monitor + assign roles", q: "monitor log analytics and assign RBAC roles" },
  { label: "SQL read + blob read", q: "read SQL databases and read blob storage" },
  { label: "Deploy Functions", q: "deploy Azure Functions" },
];

export default function AiSearch({ roles }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const intents = useMemo(() => parseIntents(submitted), [submitted]);

  const results = useMemo(() => {
    if (!submitted.trim() || submitted.trim().length < 3) return [];
    const scored = roles
      .map(role => {
        const r = scoreRoleMultiIntent(role, intents);
        return { role, ...r };
      })
      .filter(x => x.totalScore > 0)
      .sort((a, b) => {
        if (b.coveragePct !== a.coveragePct) return b.coveragePct - a.coveragePct;
        return b.totalScore - a.totalScore;
      })
      .slice(0, 15);
    return scored.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [roles, submitted, intents]);

  const maxScore = results.length ? results[0].totalScore : 1;

  const handleSubmit = useCallback(e => {
    e?.preventDefault();
    if (query.trim().length >= 3) setSubmitted(query.trim());
  }, [query]);

  const setExample = q => { setQuery(q); setSubmitted(q); };

  return (
    <div>
      {/* Header */}
      <div style={{ maxWidth: 680, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8ecf1", margin: 0 }}>AI Role Search</h2>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "rgba(171,71,188,0.1)", border: "1px solid rgba(171,71,188,0.2)", color: "#ce93d8", fontFamily: "var(--m)" }}>
            {roles.length} roles indexed
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#4a5568", margin: 0, lineHeight: 1.6 }}>
          Describe what you want to do in plain language. Use <b style={{ color: "#6b7c93" }}>and</b> to split into multiple intents — each role is scored per intent. Click a result to see which permissions match.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='e.g. "read blob storage and create vm" or "manage AKS clusters"'
            style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#e8ecf1", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = "rgba(171,71,188,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
          />
          <button
            type="submit"
            disabled={query.trim().length < 3}
            style={{
              padding: "12px 22px", borderRadius: 10, cursor: query.trim().length < 3 ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
              background: query.trim().length >= 3 ? "rgba(171,71,188,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${query.trim().length >= 3 ? "rgba(171,71,188,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: query.trim().length >= 3 ? "#ce93d8" : "#4a5568"
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Example queries */}
      {!submitted && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Quick examples</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAMPLES.map(({ label, q }) => (
              <button key={q} onClick={() => setExample(q)}
                style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7c93", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(171,71,188,0.3)"; e.currentTarget.style.color = "#ce93d8" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#6b7c93" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {submitted && (
        <div>
          {/* Parsed intents display */}
          {intents.length > 1 && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(171,71,188,0.06)", border: "1px solid rgba(171,71,188,0.15)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#ce93d8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Detected {intents.length} intents</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {intents.map((intent, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: "rgba(171,71,188,0.1)", border: "1px solid rgba(171,71,188,0.2)", color: "#ce93d8" }}>
                    {i + 1}. {intent}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: "#4a5568", marginBottom: 14 }}>
            {results.length} role{results.length !== 1 ? "s" : ""} matched — click any result to expand and see permissions
          </div>

          {!results.length && (
            <div style={{ padding: 24, background: "rgba(233,69,96,0.05)", border: "1px solid rgba(233,69,96,0.12)", borderRadius: 10, fontSize: 13, color: "#8899aa" }}>
              No roles matched. Try different terms — e.g. "vm" for virtual machines, "kv" for Key Vault, "blob" for blob storage.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map(r => (
              <RoleResultCard key={r.role.id} roleResult={{ ...r, maxScore }} intents={intents} maxScore={maxScore} />
            ))}
          </div>

          {results.length > 0 && intents.length > 1 && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(79,195,247,0.03)", border: "1px solid rgba(79,195,247,0.08)", borderRadius: 8, fontSize: 11, color: "#4a5568", lineHeight: 1.6 }}>
              <b style={{ color: "#4fc3f7" }}>Tip:</b> When no single role covers all intents, combine multiple least-privilege roles — one per task — rather than using a broader role like Contributor.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
