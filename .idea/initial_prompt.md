Act as a Senior Product Architect and Lead Frontend Engineer.
I need a comprehensive Product Requirement Document (PRD) and a Technical Implementation Plan for a Hackathon project called "Spectra". We only have 24h, so dont overdo it.

---

## 1. Project Overview
**Spectra** is a spatial AI workspace that visualizes conversations entirely as a "Tree of Thoughts."
**Core Philosophy:** "The Graph is the Chat." (No linear sidebars).
**Target Audience:** Developers/Power Users/Scientists/Visual Thinkers/Students/Brainstormers.

---

## 2. Design System: "Immersive Ethereal"
* **Layout:** Full-screen Canvas (100% width/height).
* **Background:** Fixed "Aurora Gradient" (Mesh Gradient of White/Pale Blue/Soft Violet).
* **The "Glass Console":**
    * A floating input panel fixed at the bottom-center of the screen.
    * Style: `bg-white/60`, `backdrop-blur-xl`, rounded-full or rounded-2xl, broad shadow.
    * Function: This is the only place to type. It injects new nodes into the graph.
* **Nodes:** Glassmorphism cards that live on the canvas.

---

## 3. Visualization: The "Vertical Git Graph" (Phase 2 Focus)
We are building a **Standard Git-Style Graph** using `reactflow`.

* **Direction:** Vertical (Top-to-Bottom). Root at top, newest leaves at bottom.
* **Layout:** Use `dagre` for automatic node positioning.
* **Semantic Zoom (Level-of-Detail):**
    * **Level 0 (Bird's Eye):** Small Dots + Lines.
    * **Level 1 (Mid):** Dots + Floating "Topic Labels".
    * **Level 2 (Preview):** Nodes expand into small "Glass Cards" (First 2 lines).
    * **Level 3 (Immersion):** Nodes expand to show **Full Message Content**.
* **Interaction:**
    * **Focus Mode:**
         * Clicking a node isolates the "Active Branch" (Root -> Selected Node).
         * **Visuals:** Active Branch = 100% Opacity. Inactive branches = 20% Opacity.
    * **Input Logic:** The "Glass Console" always sends messages to the **currently selected branch**.

---

## 4. Technical Architecture
* **Environment:** Client-Side SPA (React + Vite + TypeScript).
* **Styling:** Tailwind CSS.
* **State Management:** `zustand` + `persist` middleware.
    * *Constraint:* State is a "Tree", Visual is a "Graph".
* **Graph Engine:** `reactflow` with Custom Node Types.
* **AI:** Google Gemini Flash 1.5 (Streaming), but later further models may be specified.

---

## 5. Feature Roadmap

### Phase 1: The Core Foundation
* Setup Zustand store (Tree Logic).
* Implement `GraphAdapter` (Tree -> React Flow).
* **UI:** Full-screen React Flow instance.
* **UI:** The "Glass Console" (Floating Bottom Input).
* **Logic:** Typing in the console adds a child node to the selected graph node.

### Phase 2: The Vertical Graph & Zoom
* Implement `dagre` auto-layout (Top-to-Bottom).
* Create **Custom Node Components** (Zoom Level 0-3).
* Implement "Focus Mode" (Opacity dimming for inactive branches).

### Phase 3: Intelligence
* **Auto-Labeling:** Gemini summary triggers when branch depth >3.
* **Context Health:** Token usage gauge.

---

## 6. Deliverables Required Now
Please output:

1.  **File Structure:** A complete `src` tree.
2.  **State Schema:** The exact TypeScript interfaces for `TreeNode` vs `GraphNode`.
3.  **Graph Adapter Logic:** Logic for transforming the Tree State into React Flow elements.
4.  **Step-by-Step Implementation Plan:** Detailed checklist for Phase 1 & 2.