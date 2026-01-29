/**
 * Captures highlighted text on the page and sends it to the extension.
 */

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : "";

  if (!selectedText) return;

  console.log("[ADI] Selected text:", selectedText);

  chrome.runtime.sendMessage({
    type: "TEXT_SELECTED",
    payload: {
      text: selectedText,
      url: window.location.href,
      title: document.title
    }
  });
});
