const SESSION_START = Date.now();

console.log("[ADI UI] panel loaded");

const selectionEl = document.getElementById("selection");

/* -------------------------------------------------------
   Clear stale analysis every popup open
-------------------------------------------------------- */
chrome.storage.local.remove([
  "lastAnalysis",
  "lastAnalysisError"
]);

hydrate();

/* -------------------------------------------------------
   Runtime message listener (live updates)
-------------------------------------------------------- */
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === "SELECTION_UPDATED") {
    renderSelection(msg.payload);
    return;
  }

  if (msg.type === "ANALYSIS_RESULT") {
    renderAnalysis(msg.payload);
    return;
  }

  if (msg.type === "ANALYSIS_ERROR") {
    renderError(msg.payload);
  }
});

/* -------------------------------------------------------
   Hydration from storage
-------------------------------------------------------- */
function hydrate() {
  selectionEl.textContent = "Highlight text on a page";

  chrome.storage.local.get(
    ["lastSelection", "lastAnalysis", "lastAnalysisAt", "lastAnalysisError"],
    (res) => {
      // Only render analysis created AFTER popup opened
      if (
        res.lastAnalysis &&
        res.lastAnalysisAt &&
        res.lastAnalysisAt >= SESSION_START
      ) {
        renderAnalysis(res.lastAnalysis);
        return;
      }

      // Otherwise stay blank
      selectionEl.textContent = "Highlight text on a page";
    }
  );
}


/* -------------------------------------------------------
   Rendering helpers
-------------------------------------------------------- */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSelection(payload) {
  const title = payload?.title ? escapeHtml(payload.title) : "";
  const text = payload?.text ? escapeHtml(payload.text.slice(0, 300)) : "";

  selectionEl.innerHTML = `
    <em>${text}</em>
    ${title ? `<br /><small>${title}</small>` : ""}
    <div class="loading">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;
}

function renderAnalysis(result) {
  const summary = escapeHtml(result.summary);
  const items = (result.insights || [])
    .map((i) => `<li>${escapeHtml(i)}</li>`)
    .join("");

  selectionEl.innerHTML = `
    <strong>${summary}</strong>
    <ul>${items}</ul>
  `;
}

function renderError(err) {
  const msg = err?.message
    ? escapeHtml(err.message)
    : "Unknown analysis error";

  selectionEl.innerHTML = `
    <strong>Analysis error</strong><br />
    <small>${msg}</small>
  `;
}
