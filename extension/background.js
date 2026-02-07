// background.js — Manifest V3 service worker
// Central orchestrator for Agentic Data Insight

console.log("[INSIGHT ON] hey twin");

/* -------------------------------------------------------
   SAFE BROADCAST (MV3 popup may not exist)
-------------------------------------------------------- */
function safeBroadcast(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      // Silence "Receiving end does not exist" when popup isn't open.
      void chrome.runtime.lastError;
    });
  } catch {
    // Popup not open — expected in MV3
  }
}

/* -------------------------------------------------------
   Lifecycle logs
-------------------------------------------------------- */
chrome.runtime.onInstalled.addListener(() => {
  console.log("[INSIGHT ON] we installed");
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[INSIGHT ON] onStartup");
});

/* -------------------------------------------------------
   One-off message listener (content scripts)
-------------------------------------------------------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case "TEXT_SELECTED":
      console.log("[ADI BG] Text received:", message.payload);

      chrome.storage.local.set({
        lastSelection: message.payload
      });

      safeBroadcast({
        type: "SELECTION_UPDATED",
        payload: message.payload
      });

      analyzeSelection(message.payload);

      sendResponse({ ok: true });
      break;

    default:
      console.warn("[ADI BG] Unknown message:", message.type);
  }

  return true;
});

/* -------------------------------------------------------
   MV3 PORT + ANALYSIS PIPELINE (ORIGINAL STRUCTURE)
-------------------------------------------------------- */

const ports = new Set();

chrome.runtime.onConnect.addListener((port) => {
  console.log("[ADI BG] Port connected:", port.name);
  ports.add(port);

  port.onMessage.addListener((msg) => {
    if (!msg || !msg.type) return;

    if (msg.type === "TEXT_SELECTED") {
      console.log("[ADI BG] Port text received:", msg.payload);

      chrome.storage.local.set({
        lastSelection: msg.payload
      });

      // Broadcast to all live ports
      ports.forEach((p) => {
        try {
          p.postMessage({
            type: "SELECTION_UPDATED",
            payload: msg.payload
          });
        } catch {
          ports.delete(p); // 🔧 prune dead ports
        }
      });

      safeBroadcast({
        type: "SELECTION_UPDATED",
        payload: msg.payload
      });

      analyzeSelection(msg.payload);
    }
  });

  port.onDisconnect.addListener(() => {
    console.log("[ADI BG] Port disconnected:", port.name);
    ports.delete(port);
  });
});

/* -------------------------------------------------------
   Analysis pipeline (backend → storage → UI hydration)
-------------------------------------------------------- */

async function analyzeSelection(payload) {
  const controller = new AbortController();
  // Ollama can be slow; keep this comfortably above typical generation time.
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: payload.text }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Backend responded ${response.status}`);
    }

    const result = await response.json();

    // Persist for popup hydration
    chrome.storage.local.set({
      lastAnalysis: result,
      lastAnalysisError: null,
      lastAnalysisAt: Date.now()
    });

    // Broadcast to live ports only
    ports.forEach((p) => {
      try {
        p.postMessage({
          type: "ANALYSIS_RESULT",
          payload: result
        });
      } catch {
        ports.delete(p);
      }
    });

    safeBroadcast({
      type: "ANALYSIS_RESULT",
      payload: result
    });

  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[ADI BG] Analysis failed:", err);

    const errorPayload = {
      message: "Backend not running or request timed out"
    };

    chrome.storage.local.set({
      lastAnalysisError: errorPayload,
      lastAnalysis: null,
      lastAnalysisAt: Date.now()
    });

    ports.forEach((p) => {
      try {
        p.postMessage({
          type: "ANALYSIS_ERROR",
          payload: errorPayload
        });
      } catch {
        ports.delete(p);
      }
    });

    safeBroadcast({
      type: "ANALYSIS_ERROR",
      payload: errorPayload
    });
  }
}
