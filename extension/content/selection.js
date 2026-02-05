console.log("[INSIGHT] content script loaded");

let port = null;
let lastText = "";
let lastTime = 0;

function getPort() {
  if (!port) {
    port = chrome.runtime.connect({ name: "adi-port" });

    port.onDisconnect.addListener(() => {
      console.warn("[INSIGHT] Port disconnected, resetting");
      port = null;
    });
  }
  return port;
}

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const text = selection.toString().trim();
  if (!text) return;

  // Debounce identical selections
  const now = Date.now();
  if (text === lastText && now - lastTime < 800) return;

  lastText = text;
  lastTime = now;

  const payload = {
    text,
    url: window.location.href,
    title: document.title,
    timestamp: now
  };

  console.log("[INSIGHT] Selected text:", payload);

  try {
    getPort().postMessage({
      type: "TEXT_SELECTED",
      payload
    });
  } catch (e) {
    console.warn("[INSIGHT] selection send failed", e);
  }

  // Persist for UI panel hydration
  chrome.storage.local.set({
    lastSelection: payload
  });
});
