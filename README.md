# Project Spectra

**Project Spectra** is a visual, graph-based AI chat interface that empowers you to explore non-linear conversation paths with Google's Gemini models. By visualizing chats as a tree of nodes, you can branch off discussions, manage context effectively, and maintain a clear overview of complex inquiries.

## 🌟 Features

- **Visual Chat Graph**: Conversations are displayed as expert-designed graph nodes. Branch off from any message to explore alternative ideas without losing your original context.
- **Flexible Model Switching**: Seamlessly toggle between Gemini models (Pro, Flash, Lite) or use a specialized Debug mode for testing layout and logic.
- **Smart Context Management**:
  - **Context-Aware History**: The AI understands the specific branch history you are currently viewing.
  - **Health Battery**: A visual indicator tracks your token usage against the context window limit.
  - **Pruning (Beta)**: Summarize and collapse node sequences to reclaim tokens and clean up the visual workspace.
- **Interactive Graph**:
  - **Multi-Select**: Group nodes for batch operations.
  - **Deep Zoom & Pan**: Infinite canvas with smooth zooming controls.
- **Modern UI**: A sleek, glassmorphic interface built with TailwindCSS for a premium feel.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **State Management**: Zustand (with local persistence)
- **Visualization**: React Flow (Customized with Dagre layout)
- **AI Integration**: Google Generative AI via Serverless Functions
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd project-spectra
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the Application**:
   Since the project uses serverless functions for the API, it is recommended to run with Vercel Dev:
   ```bash
   npx vercel dev
   ```
   *Alternatively, you can run `npm run dev` for frontend-only development, but API calls will fail without the backend function.*

## 🎮 Controls

| Action | Control | Description |
|--------|---------|-------------|
| **Select Node** | `Left Click` | Selects a single message node. |
| **Focus / Branch** | `Double Left Click` | Focuses on a node, making it the active context for new messages. |
| **Multi-Select** | `Right Click` | Add nodes to selection (Single Click). |
| **Zoom** | `Hold Right Click + Drag` | Drag Up to Zoom In, Down to Zoom Out. |
| **Pan** | `Hold Left Click + Drag` | Move around the canvas. |
| **Scroll** | `Mouse Wheel` | Vertical scroll. |

## 🏗️ Project Structure

- **`src/components`**: Core UI components (`GlassConsole` for chat, `GraphCanvas` for visualization, `GlassSidebar` for navigation).
- **`src/store`**: Zustand stores (`useTreeStore`, `useSessionStore`) managing the complex graph state.
- **`src/adapters`**: Logic for converting the linear/tree data into React Flow graph layout positions.
- **`api/`**: Serverless functions handling secure communication with the Gemini API.

## Known Bugs

- Unfortunately the text selection feature broke last minute.
