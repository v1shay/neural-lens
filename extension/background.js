/**
 * Background service worker for Agentic Data Insight
 */

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "TEXT_SELECTED") {
    console.log("[ADI Background] Received selection:", message.payload);
  }
});
