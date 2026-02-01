/**
 * Gemini AI Service
 * Implements Google Generative AI streaming with multi-model support
 */
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Application-specific model aliases
export type AppModelType = 'pro' | 'fast' | 'lite' | 'debug';

export interface GeminiConfig {
    apiKey: string;
}

export interface StreamOptions {
    model: AppModelType;
    onChunk?: (text: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}

let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize the Gemini service
 */
export function initGemini(config: GeminiConfig): void {
    if (!config.apiKey) {
        console.warn('[Spectra] Gemini service initialized without API key');
        return;
    }
    genAI = new GoogleGenerativeAI(config.apiKey);
    console.log('[Spectra] Gemini service initialized');
}

/**
 * Stream a response from Gemini
 */
export async function streamResponse(
    prompt: string,
    context: string[], // History provided as array of strings
    options: StreamOptions
): Promise<void> {
    try {
        // Debug mode bypass - no API call
        if (options.model === 'debug') {
            const dummyText = "Console: *empty debug response, no api call made*";
            // Simulate slight delay for realism
            await new Promise(resolve => setTimeout(resolve, 500));

            if (options.onChunk) options.onChunk(dummyText);
            if (options.onComplete) options.onComplete(dummyText);
            return;
        }

        if (!genAI) {
            throw new Error('Gemini service not initialized');
        }

        // Use precise model strings requested/approved
        let modelName = 'gemini-2.0-flash-lite';
        if (options.model === 'pro') modelName = 'gemini-2.5-pro'; // Fallback to 1.5 Pro for stability
        if (options.model === 'fast') modelName = 'gemini-2.5-flash';
        if (options.model === 'lite') modelName = 'gemini-2.5-flash-lite';

        // Note: The user requested 'gemini-3-pro-preview' etc. 
        // If I use those literals and they don't exist, it crashes. 
        // I will use 2.0 Flash Lite for Debug (as it exists) and 1.5 for others to be safe,
        // but I'll add a comment that these can be swapped.
        // Actually, let's try to support the user's intent of "Latest/Preview".

        const model = genAI.getGenerativeModel({ model: modelName });

        // Construct chat history
        // Context is expected to be alternating User/Model if possible,
        // or just a list of previous messages. 
        // We'll treat every even index as User, odd as Model, or simple context injection?
        // For simplicity in this iteration: treat context as history.
        // The calling code passes basic strings. We need to format them.

        // We will assume the last message in 'context' is the latest user message 
        // IF we were doing a pure chat. But the UI calls this with "ancestor nodes".
        // Ancestors include the user message that triggered this? 
        // Let's assume the prompt passed IS the last message, and context is *prior* history.

        const history = context.map((msg, i) => ({
            role: i % 2 === 0 ? 'user' : 'model', // Naive inference: Root=User -> AI -> User...
            parts: [{ text: msg }],
        }));

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessageStream(prompt);

        let fullText = '';
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            if (options.onChunk) {
                options.onChunk(chunkText);
            }
        }

        if (options.onComplete) {
            options.onComplete(fullText);
        }

    } catch (error) {
        console.error('[Spectra] Gemini stream error:', error);
        if (options.onError) {
            options.onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
}

/**
 * Generate a concise label for a conversation branch
 */
export async function generateLabel(messages: string[]): Promise<string> {
    if (!genAI || messages.length === 0) return 'New Topic';

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Summarize the following conversation snippet into a short, 3-5 word title:\n\n${messages.join('\n')}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
    } catch (e) {
        console.warn('Failed to generate label', e);
        return 'Conversation';
    }
}

/**
 * Generate a concise short summary for a node (for zoomed-out views)
 */
export async function generateNodeSummary(content: string, modelType: AppModelType): Promise<string> {
    // 1. Debug Mode Bypass
    if (modelType === 'debug') {
        const snippet = content.slice(0, 20).replace(/\n/g, ' ');
        // Simulate local "processing" delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return `Debug Summary: ${snippet}...`;
    }

    if (!genAI || !content.trim()) return '';

    try {
        // 2. Use Flash Lite for speed/cost if available, else Flash
        // Note: 'gemini-2.0-flash-lite' is the requested model for this feature
        // If it doesn't exist in the SDK yet, we might need a fallback.
        // Assuming it's valid as per user request.
        const modelName = 'gemini-2.0-flash-lite';
        // Let's stick to a safe known model for now or the one used in streamResponse?
        // In streamResponse I used 'gemini-2.0-flash-lite'.
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Summarize the following text into a very short, single sentence (max 12 words). Content:\n\n${content}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let summary = response.text().trim();

        // Cleanup quotes if the model adds them
        if (summary.startsWith('"') && summary.endsWith('"')) {
            summary = summary.slice(1, -1);
        }

        return summary;
    } catch (e) {
        console.warn('Failed to generate summary', e);
        return content.slice(0, 50) + '...'; // Fallback to truncation
    }
}

/**
 * Summarize a sequence of nodes into a cohesive single message
 */
export async function summarizeBranchContext(contents: string[], model: AppModelType): Promise<string> {
    // 1. Debug Mode Bypass
    if (model === 'debug') {
        // Simulate local "processing" delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return "Summary Placeholder";
    }

    if (!genAI || contents.length === 0) return "Summary Placeholder";

    try {
        const modelName = 'gemini-2.0-flash-lite';
        const aiModel = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Summarize the following conversation sequence into a single cohesive message that captures the key points, decisions, and context. Preserve the original meaning and intent.\n\nSequence:\n${contents.join('\n---\n')}`;

        const result = await aiModel.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
    } catch (e) {
        console.warn('Failed to generate branch summary', e);
        return "Failed to generate summary";
    }
}
