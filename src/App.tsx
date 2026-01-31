import { GraphCanvas } from './components/Canvas/GraphCanvas';
import { GlassConsole } from './components/Console/GlassConsole';

function App() {
    return (
        <div className="w-full h-full relative">
            {/* Main canvas */}
            <GraphCanvas />

            {/* Floating input console */}
            <GlassConsole />
        </div>
    );
}

export default App;
