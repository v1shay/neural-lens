# Neural Lens
> Real-time, in-context data analysis from on-page user selections, backed by a modular analysis pipeline.

---

## Features
- Real-time capture of user-selected content directly from the browser  
- Manifest V3 Chrome extension with persistent background processing  
- FastAPI backend for structured analysis and response routing  
- Modular analysis pipeline that can be extended with new models or tools  
- Shared context between page state, user input, and backend analysis  

---

## Why This Exists
Most tools that analyze text or content lose context. They require copy-pasting, manual prompts, or switching tabs, which breaks flow and strips away the surrounding information that often matters most.

Neural Lens keeps analysis where the data already lives: on the page, in real time, with full awareness of what the user is actually looking at.

---

## How It Works
Neural Lens is split cleanly between the browser and the backend.

1. A user selects text or content on a webpage  
2. The Manifest V3 extension captures the selection along with page context  
3. This context is sent to a FastAPI backend  
4. The backend routes the data through a modular analysis pipeline  
5. Results are returned to the extension for display or further action  

Each part is isolated so new analysis modules can be added without touching the rest of the system.

---

## Tech Stack
- **Frontend:** Chrome Extension (Manifest V3)  
- **Backend:** FastAPI  
- **Language:** Python, JavaScript  
- **Architecture:** Modular analysis pipeline  

---

## Project Structure
```text
neural-lens/
├── extension/
│   ├── background.js
│   ├── content.js
│   └── manifest.json
├── backend/
│   ├── main.py
│   ├── routers/
│   └── analyzers/
├── shared/
└── README.md
