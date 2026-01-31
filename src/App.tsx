import { GraphCanvas } from './components/Canvas/GraphCanvas';
import { GlassConsole } from './components/Console/GlassConsole';
import { GlassSidebar } from './components/Sidebar/GlassSidebar';

function App() {
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
