# Spectra - Hackathon Project Tasks

## Planning Phase
- [x] Analyze project requirements and constraints
- [x] Create comprehensive PRD & Implementation Plan
- [x] Get user approval on architecture

## Phase 1: Core Foundation (Setup)
- [/] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up project structure (`/src/...`)
- [ ] Implement Zustand store with tree logic
- [ ] Build `GraphAdapter` (Tree → React Flow)
- [ ] Create full-screen React Flow canvas with Aurora gradient
- [ ] Build "Glass Console" floating input component
- [ ] Wire console to add child nodes to selected graph node

## Phase 2: Vertical Graph & Semantic Zoom
- [ ] Integrate `dagre` auto-layout (Top-to-Bottom)
- [ ] Create custom node components (Zoom Levels 0-3)
- [ ] Implement "Focus Mode" with opacity dimming
- [ ] Add semantic zoom behavior based on viewport scale

## Phase 3: Intelligence (Time Permitting)
- [ ] Implement `geminiService.ts` with streaming support
- [ ] Wire `addNode` to trigger Gemini response
- [ ] Add auto-labeling for Level 1 nodes
