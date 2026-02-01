/**
 * Gemini AI Service
 * Implements Google Generative AI streaming via serverless function
 */

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

/**
 * Initialize the Gemini service
 * (Kept for compatibility, but no longer needs API key on client)
 */
export function initGemini(config: GeminiConfig): void {
    // No-op for client side API key handling
    console.log('[Spectra] Gemini service initialized (server-side)');
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
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'stream',
                modelType: options.model,
                prompt,
                history: context,
            }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true });
            fullText += chunkText;
            if (options.onChunk) {
                options.onChunk(chunkText);
            }
        }

        // Flush any remaining text
        const remaining = decoder.decode();
        if (remaining) {
            fullText += remaining;
            if (options.onChunk) options.onChunk(remaining);
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
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generateLabel',
                messages,
            }),
        });

        if (!response.ok) return 'New Topic';
        const data = await response.json();
        return data.result || 'New Topic';
    } catch (e) {
        console.warn('Failed to generate label', e);
        return 'Conversation';
    }
}

/**
 * Generate a concise short summary for a node (for zoomed-out views)
 */
export async function generateNodeSummary(content: string, modelType: AppModelType): Promise<string> {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generateNodeSummary',
                content,
                modelType,
            }),
        });

        if (!response.ok) return content.slice(0, 50) + '...';
        const data = await response.json();
        return data.result || '';
    } catch (e) {
        console.warn('Failed to generate summary', e);
        return content.slice(0, 50) + '...';
    }
}

/**
 * Summarize a sequence of nodes into a cohesive single message
 */
export async function summarizeBranchContext(contents: string[], model: AppModelType): Promise<string> {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'summarizeBranch',
                content: contents,
                modelType: model,
            }),
        });

        if (!response.ok) return "Summary Placeholder";
        const data = await response.json();
        return data.result || "Summary Placeholder";
    } catch (e) {
        console.warn('Failed to generate branch summary', e);
        return "Failed to generate summary";
    }
}

