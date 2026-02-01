import { useEffect } from 'react';
import { GraphCanvas } from './components/Canvas/GraphCanvas';
import { GlassConsole } from './components/Console/GlassConsole';
import { GlassSidebar } from './components/Sidebar/GlassSidebar';
import { initGemini } from './services/ai/geminiService';

function App() {
    useEffect(() => {
        initGemini({
            apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        });
    }, []);

    return (
        <div className="w-full h-full relative">
            {/* Sidebar */}
            <GlassSidebar />

            {/* Main canvas */}
            <GraphCanvas />

            {/* Floating input console */}
            <GlassConsole />
        </div>
    );
}

export default App;
