import React, { useState, useMemo, useEffect } from "react";
import { roleCoversOp, pn, mw } from "./shared.js";

const PAGE_SIZES = [25, 50, 100];

function PaginationBar({ page, totalPages, pageSize, onPage, onPageSize, totalItems, rangeStart, rangeEnd }) {
  const btnStyle = (disabled) => ({
    padding: "5px 10px", borderRadius: 6, fontSize: 13, cursor: disabled ? "default" : "pointer",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: disabled ? "#3a4556" : "#8899aa", fontFamily: "inherit", opacity: disabled ? 0.5 : 1
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", padding: "14px 0", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#4a5568" }}>Rows per page:</span>
        {PAGE_SIZES.map(s => (
          <button key={s} onClick={() => onPageSize(s)} style={{ ...btnStyle(false), background: pageSize === s ? "rgba(79,195,247,0.12)" : "rgba(255,255,255,0.04)", border: pageSize === s ? "1px solid rgba(79,195,247,0.3)" : "1px solid rgba(255,255,255,0.1)", color: pageSize === s ? "#4fc3f7" : "#6b7c93" }}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#4a5568" }}>{rangeStart}–{rangeEnd} of {totalItems.toLocaleString()}</span>
        <button onClick={() => onPage(1)} disabled={page === 1} style={btnStyle(page === 1)}>«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} style={btnStyle(page === 1)}>‹ Prev</button>
        <span style={{ fontSize: 13, color: "#6b7c93", padding: "0 4px" }}>{page} / {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={btnStyle(page === totalPages)}>Next ›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages} style={btnStyle(page === totalPages)}>»</button>
      </div>
    </div>
  );
}

function Hl({ text, query }) {
  if (!query || !query.trim()) return text;
  const words = query.trim().split(/\s+/).filter(Boolean);
  const pat = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const parts = text.split(new RegExp(`(${pat})`, 'gi'));
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    i % 2 === 1
      ? <mark key={i} style={{ background: "rgba(79,195,247,0.2)", color: "#4fc3f7", borderRadius: 2, padding: "0 1px" }}>{p}</mark>
      : <span key={i}>{p}</span>
  );
}

function TypeBadge({ isDataAction }) {
  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
      background: isDataAction ? "rgba(245,166,35,0.12)" : "rgba(79,195,247,0.08)",
      color: isDataAction ? "#f5a623" : "#4fc3f7",
      border: `1px solid ${isDataAction ? "rgba(245,166,35,0.2)" : "rgba(79,195,247,0.15)"}`,
    }}>
      {isDataAction ? "Data" : "Control"}
    </span>
  );
}

function RoleRow({ role, opAction, isDataAction, onAddRoleToStudio }) {
  const [expanded, setExpanded] = useState(false);

  // Find the matching pattern(s) within this role
  const matchingPatterns = useMemo(() => {
    const pool = isDataAction ? (role.dataActions || []) : (role.actions || []);
    return pool.filter(p => mw(p, opAction));
  }, [role, opAction, isDataAction]);

  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
      {/* Role header row */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#c8d6e5", lineHeight: 1.3, flex: 1 }}>{role.name}</div>
          <button
            onClick={() => onAddRoleToStudio(role)}
            style={{ flexShrink: 0, padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.25)", color: "#4fc3f7", whiteSpace: "nowrap" }}
          >
            + Studio
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(79,195,247,0.08)", border: "1px solid rgba(79,195,247,0.12)" }}
          >
            <span style={{ fontSize: 9, color: "#4fc3f7", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Control</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4fc3f7", fontFamily: "var(--m)" }}>
              {role.actions.some(a => a.includes("*")) ? `~${(role._estimatedActions || 1).toLocaleString()}` : role.actions.length}
            </span>
            <span style={{ fontSize: 9, color: "#4fc3f7", opacity: 0.6 }}>{expanded ? "▴" : "▾"}</span>
          </button>
          {role.dataActions.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.12)" }}
            >
              <span style={{ fontSize: 9, color: "#f5a623", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Data</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f5a623", fontFamily: "var(--m)" }}>{role.dataActions.length}</span>
              <span style={{ fontSize: 9, color: "#f5a623", opacity: 0.6 }}>{expanded ? "▴" : "▾"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded: action patterns */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "10px 12px", background: "rgba(0,0,0,0.15)" }}>
          {/* Matching patterns highlighted */}
          {matchingPatterns.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0f9b58", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Matching pattern{matchingPatterns.length !== 1 ? "s" : ""}
              </div>
              {matchingPatterns.map(p => (
                <div key={p} style={{ fontFamily: "var(--m)", fontSize: 11, color: "#0f9b58", padding: "3px 8px", background: "rgba(15,155,88,0.08)", border: "1px solid rgba(15,155,88,0.2)", borderRadius: 4, marginBottom: 2, wordBreak: "break-all" }}>
                  {p}
                </div>
              ))}
            </div>
          )}

          {/* All control plane actions */}
          {role.actions.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#4fc3f7", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, opacity: 0.7 }}>
                Control plane ({role.actions.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {role.actions.map(a => (
                  <div key={a} style={{ fontFamily: "var(--m)", fontSize: 10, color: matchingPatterns.includes(a) ? "#0f9b58" : "#4a5568", padding: "2px 6px", borderRadius: 3, wordBreak: "break-all" }}>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All data plane actions */}
          {role.dataActions.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#f5a623", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, opacity: 0.7 }}>
                Data plane ({role.dataActions.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {role.dataActions.map(a => (
                  <div key={a} style={{ fontFamily: "var(--m)", fontSize: 10, color: matchingPatterns.includes(a) ? "#0f9b58" : "#4a5568", padding: "2px 6px", borderRadius: 3, wordBreak: "break-all" }}>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OpDetail({ op, opsDescMap, roles, onClose, onAddOpToStudio, onAddRoleToStudio }) {
  const isDataAction = op.type === "dataAction";
  const description = opsDescMap[op.action] || "";
  const provider = op.action.split("/")[0];

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose() };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const matchingRoles = useMemo(() => {
    return roles
      .filter(role => roleCoversOp(role, op.action, isDataAction))
      .sort((a, b) => (a._estimatedActions || 1) - (b._estimatedActions || 1));
  }, [roles, op.action, isDataAction]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.35)", cursor: "pointer" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: Math.min(680, window.innerWidth),
        background: "#0b0b1e", borderLeft: "1px solid rgba(255,255,255,0.1)",
        overflowY: "auto", zIndex: 100, boxShadow: "-16px 0 56px rgba(0,0,0,0.7)"
      }}>
      {/* Gradient header zone */}
      <div style={{ padding: "20px 24px 20px", background: `linear-gradient(160deg, ${isDataAction ? "rgba(245,166,35,0.08)" : "rgba(79,195,247,0.07)"} 0%, rgba(171,71,188,0.04) 60%, transparent 100%)`, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TypeBadge isDataAction={isDataAction} />
            <span style={{ fontSize: 11, color: "#4a5568" }}>{isDataAction ? "Data Plane" : "Control Plane"}</span>
          </div>
          <button onClick={onClose} style={{ flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#8899aa", fontSize: 14, cursor: "pointer", padding: "4px 10px", fontFamily: "inherit" }}>
            ✕
          </button>
        </div>
        <div style={{ fontFamily: "var(--m)", fontSize: 13, color: "#c8d6e5", wordBreak: "break-all", lineHeight: 1.6, marginBottom: 10, padding: "10px 14px", background: "rgba(0,0,0,0.25)", borderRadius: 8, border: `1px solid ${isDataAction ? "rgba(245,166,35,0.15)" : "rgba(79,195,247,0.12)"}` }}>
          {op.action}
        </div>
        {description ? (
          <div style={{ fontSize: 14, color: "#a0b4c8", lineHeight: 1.7 }}>{description}</div>
        ) : (
          <div style={{ fontSize: 13, color: "#3a4556", fontStyle: "italic" }}>No description available</div>
        )}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Provider + Add to Studio */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6 }}>
            <span style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.06em" }}>Provider</span>
            <span style={{ fontSize: 12, color: "#8899aa" }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#c8d6e5" }}>{pn(provider)}</span>
            <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--m)" }}>({provider})</span>
          </div>
          <button
            onClick={() => onAddOpToStudio(op)}
            style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: "rgba(79,195,247,0.12)", border: "1px solid rgba(79,195,247,0.3)", color: "#4fc3f7" }}
          >
            + Add to Studio
          </button>
        </div>

        {/* Roles */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#8899aa" }}>
              Covered by {matchingRoles.length} role{matchingRoles.length !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: 11, color: "#3a4556" }}>sorted by specificity · click counts to expand</span>
          </div>

          {!matchingRoles.length && (
            <div style={{ fontSize: 12, color: "#4a5568", padding: "14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, textAlign: "center" }}>
              No built-in role explicitly covers this operation.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {matchingRoles.map(role => (
              <RoleRow
                key={role.id}
                role={role}
                opAction={op.action}
                isDataAction={isDataAction}
                onAddRoleToStudio={onAddRoleToStudio}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function OperationsCatalog({ categories, roles, opsDescMap, onAddOpToStudio, onAddRoleToStudio }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | control | data
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedOp, setSelectedOp] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Flatten all ops from categories
  const allOps = useMemo(() => {
    const ops = [];
    for (const cat of categories) {
      for (const prov of cat.providers) {
        for (const type of prov.types) {
          for (const ag of type.actions) {
            for (const op of ag.ops) {
              ops.push({ ...op, provider: prov.namespace, typeName: type.name, categoryName: cat.name });
            }
          }
        }
      }
    }
    return ops.sort((a, b) => a.action.localeCompare(b.action));
  }, [categories]);

  const providerList = useMemo(() => Array.from(new Set(allOps.map(o => o.provider))).sort(), [allOps]);

  const filtered = useMemo(() => {
    let ops = allOps;
    if (typeFilter === "control") ops = ops.filter(o => o.type !== "dataAction");
    if (typeFilter === "data") ops = ops.filter(o => o.type === "dataAction");
    if (providerFilter !== "all") ops = ops.filter(o => o.provider === providerFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const words = q.split(/\s+/).filter(Boolean);
      ops = ops.filter(o => {
        const hay = o.action.toLowerCase() + " " + (opsDescMap[o.action] || "").toLowerCase();
        return words.every(w => hay.includes(w));
      });
    }
    return ops;
  }, [allOps, search, typeFilter, providerFilter, opsDescMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSearch = v => { setSearch(v); setPage(1); };
  const handleType = v => { setTypeFilter(v); setPage(1); };
  const handleProvider = v => { setProviderFilter(v); setPage(1); };
  const handlePageSize = s => { setPageSize(s); setPage(1); };

  const controlCount = useMemo(() => allOps.filter(o => o.type !== "dataAction").length, [allOps]);
  const dataCount = useMemo(() => allOps.filter(o => o.type === "dataAction").length, [allOps]);

  return (
    <div style={{ position: "relative" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8ecf1", margin: 0 }}>Operations</h2>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.2)", color: "#4fc3f7", fontFamily: "var(--m)" }}>
            {allOps.length.toLocaleString()} total
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#4a5568", margin: 0, lineHeight: 1.5 }}>
          All Azure RBAC permission operations. Click any operation to see its description, plane type, and which built-in roles include it.
        </p>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Filter by action path or description…  e.g. virtualMachines/read, blob, start"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 40px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8ecf1", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = "rgba(79,195,247,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.35 }}>⌕</span>
          {search && <button onClick={() => handleSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6b7c93", cursor: "pointer", fontSize: 16 }}>×</button>}
        </div>

        {/* Type filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {[["all", `All (${allOps.length.toLocaleString()})`], ["control", `Control (${controlCount.toLocaleString()})`], ["data", `Data (${dataCount.toLocaleString()})`]].map(([id, label]) => (
            <button key={id} onClick={() => handleType(id)} style={{
              padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: typeFilter === id ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              background: typeFilter === id ? (id === "data" ? "rgba(245,166,35,0.12)" : "rgba(79,195,247,0.1)") : "rgba(255,255,255,0.04)",
              border: typeFilter === id ? (id === "data" ? "1px solid rgba(245,166,35,0.3)" : "1px solid rgba(79,195,247,0.3)") : "1px solid rgba(255,255,255,0.1)",
              color: typeFilter === id ? (id === "data" ? "#f5a623" : "#4fc3f7") : "#6b7c93"
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Provider filter */}
        <select
          value={providerFilter}
          onChange={e => handleProvider(e.target.value)}
          style={{
            padding: "9px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            fontFamily: "inherit", background: "rgba(255,255,255,0.05)",
            border: providerFilter !== "all" ? "1px solid rgba(79,195,247,0.3)" : "1px solid rgba(255,255,255,0.1)",
            color: providerFilter !== "all" ? "#4fc3f7" : "#6b7c93",
            outline: "none",
          }}
        >
          <option value="all">All Providers</option>
          {providerList.map(p => (
            <option key={p} value={p}>{pn(p)}</option>
          ))}
        </select>
      </div>

      {/* Results summary */}
      {(search || typeFilter !== "all" || providerFilter !== "all") && (
        <div style={{ fontSize: 12, color: "#4a5568", marginBottom: 8 }}>
          {filtered.length.toLocaleString()} operation{filtered.length !== 1 ? "s" : ""} match{filtered.length === 1 ? "es" : ""}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 130px", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.07em" }}>Type</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.07em" }}>Operation</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.07em" }}>Provider</span>
        </div>

        {!pageItems.length && (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#4a5568" }}>
            No operations match your filters.
          </div>
        )}

        {pageItems.map(op => {
          const desc = opsDescMap[op.action];
          const provShort = pn(op.provider);
          return (
            <div
              key={op.action}
              onClick={() => setSelectedOp(op)}
              style={{ display: "grid", gridTemplateColumns: "60px 1fr 130px", alignItems: "center", gap: 12, padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.035)", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <TypeBadge isDataAction={op.type === "dataAction"} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--m)", fontSize: 11, color: "#8899aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <Hl text={op.action} query={search} />
                </div>
                {desc && (
                  <div style={{ fontSize: 11, color: "#4a5568", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                    <Hl text={desc} query={search} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#4a5568", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {provShort}
              </div>
            </div>
          );
        })}
      </div>

      <PaginationBar
        page={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={handlePageSize}
        totalItems={filtered.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />

      {selectedOp && (
        <OpDetail
          op={selectedOp}
          opsDescMap={opsDescMap}
          roles={roles}
          onClose={() => setSelectedOp(null)}
          onAddOpToStudio={onAddOpToStudio}
          onAddRoleToStudio={onAddRoleToStudio}
        />
      )}
    </div>
  );
}
