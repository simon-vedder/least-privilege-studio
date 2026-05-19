import React, { useState, useMemo } from "react";

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
        <span style={{ fontSize: 12, color: "#4a5568" }}>{rangeStart}–{rangeEnd} of {totalItems}</span>
        <button onClick={() => onPage(1)} disabled={page === 1} style={btnStyle(page === 1)}>«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} style={btnStyle(page === 1)}>‹ Prev</button>
        <span style={{ fontSize: 13, color: "#6b7c93", padding: "0 4px" }}>{page} / {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={btnStyle(page === totalPages)}>Next ›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages} style={btnStyle(page === totalPages)}>»</button>
      </div>
    </div>
  );
}

function RoleRow({ role, onClick }) {
  const hasData = role.dataActions && role.dataActions.length > 0;
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12,
        padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer", transition: "background 0.1s"
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8ecf1", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {role.name}
        </div>
        <div style={{ fontSize: 11, color: "#3a4556", fontFamily: "var(--m)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {role.id}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "#4a5568", fontFamily: "var(--m)", whiteSpace: "nowrap" }}>
          {role.actions.length}A{hasData ? ` · ${role.dataActions.length}D` : ""}
        </span>
        {hasData && (
          <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: "rgba(245,166,35,0.12)", color: "#f5a623", fontWeight: 700 }}>
            DATA
          </span>
        )}
        <span style={{ color: "#4a5568", fontSize: 12 }}>›</span>
      </div>
    </div>
  );
}

function PermList({ label, items, color }) {
  const [expanded, setExpanded] = useState(items.length <= 15);
  if (!items.length) return null;
  const visible = expanded ? items : items.slice(0, 10);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
        {label} <span style={{ opacity: 0.6 }}>({items.length})</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {visible.map((a, i) => (
          <div key={i} style={{ fontFamily: "var(--m)", fontSize: 11, color: "#7a8ea0", padding: "4px 8px", background: "rgba(255,255,255,0.025)", borderRadius: 4, wordBreak: "break-all", lineHeight: 1.4 }}>
            {a}
          </div>
        ))}
        {!expanded && (
          <button onClick={() => setExpanded(true)} style={{ background: "none", border: "none", color: "#4fc3f7", fontSize: 12, cursor: "pointer", textAlign: "left", padding: "4px 0", fontFamily: "inherit" }}>
            + {items.length - 10} more
          </button>
        )}
      </div>
    </div>
  );
}

function RoleDetail({ role, onBack }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawJson = useMemo(() => {
    const { _estimatedActions, ...clean } = role;
    return JSON.stringify(clean, null, 2);
  }, [role]);

  const copy = text => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) };

  const hasDataPlane = role.dataActions.length > 0 || role.notDataActions.length > 0;

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", marginBottom: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#8899aa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
      >
        ← Roles
      </button>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e8ecf1", margin: "0 0 6px" }}>{role.name}</h2>
        <div style={{ fontSize: 11, color: "#3a4556", fontFamily: "var(--m)", marginBottom: 8 }}>{role.id}</div>
        <div style={{ fontSize: 13, color: "#8899aa", lineHeight: 1.6 }}>{role.description}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(79,195,247,0.08)", border: "1px solid rgba(79,195,247,0.18)", color: "#4fc3f7" }}>
          {role.actions.length} control plane actions
        </span>
        {hasDataPlane && (
          <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.18)", color: "#f5a623" }}>
            {role.dataActions.length} data plane actions
          </span>
        )}
        <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#4a5568" }}>
          ~{role._estimatedActions} resolved ops
        </span>
      </div>

      <button
        onClick={() => setShowRaw(!showRaw)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", marginBottom: 16, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: showRaw ? "rgba(171,71,188,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${showRaw ? "rgba(171,71,188,0.35)" : "rgba(255,255,255,0.1)"}`, color: showRaw ? "#ce93d8" : "#6b7c93", fontSize: 13 }}
      >
        {showRaw ? "▾" : "▸"} Raw JSON definition
      </button>

      {showRaw && (
        <div style={{ position: "relative", marginBottom: 20 }}>
          <pre style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "14px 16px", overflowX: "auto", fontSize: 11, lineHeight: 1.6, color: "#a8c0d8", fontFamily: "var(--m)", margin: 0 }}>
            {rawJson}
          </pre>
          <button onClick={() => copy(rawJson)} style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", borderRadius: 5, cursor: "pointer", background: copied ? "rgba(15,155,88,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${copied ? "rgba(15,155,88,0.4)" : "rgba(255,255,255,0.12)"}`, color: copied ? "#0f9b58" : "#8899aa", fontSize: 11, fontFamily: "inherit" }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: hasDataPlane ? "1fr 1fr" : "1fr", gap: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(79,195,247,0.12)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#4fc3f7", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#4fc3f7", display: "inline-block" }} />
            Control Plane
          </div>
          <PermList label="Actions" items={role.actions} color="#4fc3f7" />
          <PermList label="Not Actions" items={role.notActions} color="#e94560" />
          {!role.actions.length && !role.notActions.length && <div style={{ fontSize: 12, color: "#3a4556" }}>None</div>}
        </div>
        {hasDataPlane && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,166,35,0.12)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f5a623", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "#f5a623", display: "inline-block" }} />
              Data Plane
            </div>
            <PermList label="Data Actions" items={role.dataActions} color="#f5a623" />
            <PermList label="Not Data Actions" items={role.notDataActions} color="#e94560" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function RolesCatalog({ roles }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filtered = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  }, [roles, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSearch = v => { setSearch(v); setPage(1); };
  const handlePageSize = s => { setPageSize(s); setPage(1); };

  if (selected) return <RoleDetail role={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8ecf1", margin: 0 }}>Built-in Roles</h2>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.2)", color: "#4fc3f7", fontFamily: "var(--m)" }}>
            {roles.length} total
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#4a5568", margin: 0, lineHeight: 1.5 }}>
          All Azure built-in RBAC role definitions. Click a role to view its permissions and raw JSON.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 4 }}>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by name, GUID, or description…"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 40px 10px 40px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8ecf1", fontSize: 13, fontFamily: "inherit", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "rgba(79,195,247,0.4)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.35 }}>⌕</span>
        {search && <button onClick={() => handleSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6b7c93", cursor: "pointer", fontSize: 16 }}>×</button>}
      </div>

      {search && (
        <div style={{ fontSize: 12, color: "#4a5568", marginBottom: 8, padding: "4px 2px" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
        </div>
      )}

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.07em" }}>Role Name / ID</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.07em" }}>Actions</span>
        </div>

        {!pageItems.length && (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#4a5568" }}>No roles match your search.</div>
        )}

        {pageItems.map(role => (
          <RoleRow key={role.id} role={role} onClick={() => setSelected(role)} />
        ))}
      </div>

      {filtered.length > pageSize && (
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
      )}
    </div>
  );
}
