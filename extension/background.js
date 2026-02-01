// background.js — Manifest V3 service worker
// Central orchestrator for Agentic Data Insight

// This log confirms the service worker was registered
console.log("[INSIGHT ON] hey twin");

// Fired when the extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
  console.log("[INSIGHT ON] we installed");
});

// Fired when Chrome starts
chrome.runtime.onStartup.addListener(() => {
  console.log("[INSIGHT ON] onStartup");
});

// SAFE message listener (MV3-compliant)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case "TEXT_SELECTED":
      // Centralized handling point for selection data
      // (AI + vision will plug in here later)
      console.log("[ADI BG] Text received:", message.payload);

      // Acknowledge receipt (prevents MV3 race errors)
      sendResponse({ ok: true });
      break;

    default:
      console.warn("[ADI BG] Unknown message:", message.type);
  }

  // REQUIRED in MV3 if sendResponse is used
  return true;
});
