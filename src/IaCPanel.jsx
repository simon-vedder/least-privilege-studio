import React, { useState, useMemo } from "react";
import { parseIaC, deriveOperations, buildOpIndex, SAMPLE_ARM, SAMPLE_BICEP } from "./iac.js";

const LVLC = { Read: "#4fc3f7", Write: "#f5a623", Delete: "#e94560", Action: "#ab47bc" };
const FMT = { arm: { label: "ARM template", c: "#4fc3f7" }, bicep: { label: "Bicep", c: "#b39dda" }, unknown: { label: "Unrecognised", c: "#e94560" }, empty: { label: "", c: "#647a94" } };

// Action string with the namespace/type prefix dimmed and the tail highlighted.
function ActionRow({ action, level, reason }) {
  const i = action.lastIndexOf("/");
  const head = i >= 0 ? action.slice(0, i + 1) : "";
  const tail = i >= 0 ? action.slice(i + 1) : action;
  const c = LVLC[level] || "#8899aa";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--m)", color: c, background: c + "22", border: `1px solid ${c}44`, borderRadius: 3, padding: "1px 5px", flexShrink: 0, minWidth: 20, textAlign: "center" }}>{level[0]}</span>
      <span style={{ fontFamily: "var(--m)", fontSize: 11.5, wordBreak: "break-all", flex: 1 }}>
        <span style={{ color: "#566b85" }}>{head}</span><span style={{ color: "#e6edf5", fontWeight: 500 }}>{tail}</span>
      </span>
      {reason && <span style={{ fontSize: 11, color: "#647a94", fontStyle: "italic", flexShrink: 0, maxWidth: 260, textAlign: "right" }}>{reason}</span>}
    </div>
  );
}

function Check({ on, onChange, label, hint }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#c8d6e5" }}>
      <span onClick={onChange} style={{ width: 18, height: 18, borderRadius: 5, border: `1px solid ${on ? "#4fc3f7" : "rgba(255,255,255,0.2)"}`, background: on ? "rgba(79,195,247,0.2)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#4fc3f7", fontSize: 12, flexShrink: 0 }}>{on ? "✓" : ""}</span>
      <span>{label}{hint && <span style={{ color: "#647a94", marginLeft: 6, fontSize: 12 }}>{hint}</span>}</span>
    </label>
  );
}

function Section({ title, color, count, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8ba0b8" }}>{title}</h4>
        <span style={{ fontSize: 11, color: "#647a94", fontFamily: "var(--m)" }}>{count}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{children}</div>
    </div>
  );
}

export default function IaCPanel({ allOps, onApply }) {
  const [text, setText] = useState("");
  const [includeDelete, setDel] = useState(false);
  const [includeImplicit, setImp] = useState(true);
  const [includeRG, setRG] = useState(false);
  const [added, setAdded] = useState(false);

  const index = useMemo(() => buildOpIndex(allOps), [allOps]);
  const parsed = useMemo(() => { const p = parseIaC(text); p._raw = text; return p; }, [text]);
  const result = useMemo(() => deriveOperations(parsed, index, { includeDelete, includeImplicit, includeResourceGroupWrite: includeRG }), [parsed, index, includeDelete, includeImplicit, includeRG]);

  const fmt = FMT[parsed.format] || FMT.unknown;
  const hasResult = parsed.resources.length > 0 && result.allActions.length > 0;

  const btn = (label, onClick, primary) => (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: primary ? 600 : 500, cursor: "pointer", fontFamily: "inherit", background: primary ? "rgba(79,195,247,0.14)" : "rgba(255,255,255,0.05)", border: `1px solid ${primary ? "rgba(79,195,247,0.35)" : "rgba(255,255,255,0.1)"}`, color: primary ? "#4fc3f7" : "#8ba0b8", transition: "all 0.15s" }}>{label}</button>
  );

  return (
    <div>
      {/* Intro */}
      <div style={{ background: "rgba(79,195,247,0.05)", border: "1px solid rgba(79,195,247,0.15)", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e8ecf1", marginBottom: 6 }}>Derive least-privilege from your infrastructure</div>
        <div style={{ fontSize: 13, color: "#8ba0b8", lineHeight: 1.6 }}>
          Paste an <b style={{ color: "#4fc3f7" }}>ARM template</b> (JSON) or a <b style={{ color: "#b39dda" }}>Bicep</b> file. Least Privilege Studio extracts every resource and works out the Azure RBAC actions a <b style={{ color: "#c8d6e5" }}>deploying identity</b> needs — then hands them to the builder for a custom role.
        </div>
        <div style={{ fontSize: 12, color: "#647a94", marginTop: 8 }}>🔒 Parsed entirely in your browser. Nothing is uploaded.</div>
        <div style={{ fontSize: 12, color: "#8ba0b8", marginTop: 6, lineHeight: 1.5 }}>💡 Using Bicep <b style={{ color: "#b39dda" }}>modules</b>? Run <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 4, fontFamily: "var(--m)", fontSize: 11.5, color: "#c8d6e5" }}>bicep build</code> and paste the compiled ARM JSON — modules are inlined and fully analysed.</div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {parsed.format !== "empty" && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--m)", color: fmt.c, background: fmt.c + "1e", border: `1px solid ${fmt.c}44`, borderRadius: 5, padding: "3px 9px" }}>{fmt.label}{parsed.resources.length > 0 ? ` · ${parsed.resources.length} resource${parsed.resources.length !== 1 ? "s" : ""}` : ""}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {btn("Load Bicep sample", () => setText(SAMPLE_BICEP))}
          {btn("Load ARM sample", () => setText(SAMPLE_ARM))}
          {text && btn("Clear", () => setText(""))}
        </div>
      </div>

      {/* Input */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        spellCheck={false}
        placeholder={"Paste your ARM template (JSON) or Bicep here...\n\nresource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = { ... }"}
        style={{ width: "100%", boxSizing: "border-box", minHeight: 200, padding: 14, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e8ecf1", fontSize: 12.5, lineHeight: 1.6, fontFamily: "var(--m)", outline: "none", resize: "vertical" }}
      />

      {/* Warnings */}
      {parsed.warnings?.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {parsed.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: "#f5a623", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 8, padding: "8px 12px" }}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* Options */}
      {parsed.resources.length > 0 && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "16px 0", padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
          <Check on={includeImplicit} onChange={() => setImp(v => !v)} label="Implicit deploy-time actions" hint="joins, disk writes, role lookups" />
          <Check on={includeDelete} onChange={() => setDel(v => !v)} label="Include delete" hint="for teardown / complete-mode" />
          <Check on={includeRG} onChange={() => setRG(v => !v)} label="Template creates the resource group" />
        </div>
      )}

      {/* Results */}
      {hasResult && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0 18px" }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, color: "#e8ecf1" }}><b style={{ color: "#4fc3f7" }}>{result.stats.resourceCount}</b> resource{result.stats.resourceCount !== 1 ? "s" : ""} → <b style={{ color: "#4fc3f7" }}>{result.stats.actionCount}</b> action{result.stats.actionCount !== 1 ? "s" : ""}</span>
            {result.stats.implicitCount > 0 && <span style={{ fontSize: 12, color: "#647a94" }}>· {result.stats.implicitCount} implicit</span>}
            {result.stats.unresolvedCount > 0 && <span style={{ fontSize: 12, color: "#e94560" }}>· {result.stats.unresolvedCount} unmapped</span>}
          </div>

          {result.core.length > 0 && (
            <Section title="Deployment" color="#78909c" count={`${result.core.length} actions`}>
              {result.core.map((o, i) => <ActionRow key={i} {...o} />)}
            </Section>
          )}

          {result.perType.length > 0 && (
            <Section title="Per resource" color="#4fc3f7" count={`${result.perType.length} types`}>
              {result.perType.map((t, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 4px" }}>
                    <span style={{ fontFamily: "var(--m)", fontSize: 12, color: "#aeb9c9" }}>
                      <span style={{ color: "#566b85" }}>{t.type.slice(0, t.type.lastIndexOf("/") + 1)}</span>
                      <span style={{ color: "#e6edf5", fontWeight: 600 }}>{t.type.slice(t.type.lastIndexOf("/") + 1)}</span>
                    </span>
                    {t.mode === "read" && <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4fc3f7", background: "rgba(79,195,247,0.12)", borderRadius: 3, padding: "1px 6px" }}>existing · read only</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 4 }}>
                    {t.actions.map((a, j) => <ActionRow key={j} {...a} />)}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {result.implicit.length > 0 && (
            <Section title="Implicit deploy-time" color="#ab47bc" count={`${result.implicit.length} actions`}>
              {result.implicit.map((o, i) => <ActionRow key={i} {...o} />)}
            </Section>
          )}

          {result.unresolved.length > 0 && (
            <div style={{ marginBottom: 18, padding: "10px 14px", background: "rgba(233,69,96,0.06)", border: "1px solid rgba(233,69,96,0.18)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e94560", marginBottom: 6 }}>Not found in the operations dataset ({result.unresolved.length})</div>
              <div style={{ fontSize: 11, color: "#8899aa", lineHeight: 1.6, marginBottom: 6 }}>These couldn't be matched to a known Azure action — likely a preview/uncommon resource type. They're left out of the role.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {result.unresolved.map((u, i) => <span key={i} style={{ fontFamily: "var(--m)", fontSize: 11, color: "#8899aa" }}>{u}</span>)}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
            <button onClick={() => { onApply(result.allActions); setAdded(true); setTimeout(() => setAdded(false), 2000); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", background: added ? "rgba(15,155,88,0.18)" : "linear-gradient(95deg, rgba(79,195,247,0.2), rgba(171,71,188,0.18))", border: `1px solid ${added ? "rgba(15,155,88,0.5)" : "rgba(79,195,247,0.4)"}`, color: added ? "#4ade80" : "#eaf2ff", fontSize: 14, fontWeight: 600, boxShadow: added ? "none" : "0 4px 18px rgba(79,195,247,0.15)", transition: "all 0.2s" }}>
              {added ? "✓ Added to your selection" : `Add ${result.allActions.length} action${result.allActions.length !== 1 ? "s" : ""} to builder`}
            </button>
            <span style={{ fontSize: 12.5, color: "#647a94" }}>Paste another template to add more — the running total sits in the bar below ↓</span>
          </div>
        </div>
      )}
    </div>
  );
}
