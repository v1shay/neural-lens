/**
 * Logs highlighted text on any page.
 * This confirms the extension is alive.
 */

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : "";

  if (selectedText.length > 0) {
    console.log("[Agentic Data Insight] Selected text:", selectedText);
  }
});
