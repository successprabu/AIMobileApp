/** Accordion logic mirror for drawer sections. */
function singleExpanded(openKey) {
  const keys = ["home", "masters", "transactions", "reports", "more"];
  const out = {};
  for (const k of keys) {
    out[k] = k === openKey;
  }
  return out;
}

function toggle(prev, key) {
  const isOpen = prev[key] ?? false;
  return singleExpanded(isOpen ? null : key);
}

let state = singleExpanded("home");
if (!state.home || state.transactions) throw new Error("initial: only home open");

state = toggle(state, "reports");
if (!state.reports || state.home) throw new Error("open reports should close home");

state = toggle(state, "reports");
if (Object.values(state).some(Boolean)) throw new Error("tap open section again should collapse all");

state = toggle(state, "transactions");
if (!state.transactions || state.reports) throw new Error("only transactions open");

console.log("Drawer accordion tests passed.");
