console.log("[ADI UI] panel loaded");

const selectionEl = document.getElementById("selection");


chrome.storage.local.get("lastSelection", (res) => {
  if (res.lastSelection?.text) {
    renderSelection(res.lastSelection);
  } else {
    selectionEl.textContent = "Highlight text on a page";
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SELECTION_UPDATED") {
    renderSelection(msg.payload);
  }

  if (msg.type === "ANALYSIS_RESULT") {
    renderAnalysis(msg.payload);
  }
});


function renderSelection(payload) {
  selectionEl.innerHTML = `
    <em>${payload.text.slice(0, 300)}</em>
    <br />
    <small>${payload.title}</small>
    <br />
    <span style="opacity: 0.7;">Analyzing…</span>
  `;
}


function renderAnalysis(result) {
  selectionEl.innerHTML = `
    <strong>${result.summary}</strong>
    <ul>
      ${result.insights.map(i => `<li>${i}</li>`).join("")}
    </ul>
  `;
}
