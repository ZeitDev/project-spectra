import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    runtime: 'edge',
};

// @ts-ignore
const apiKey = process.env.GEMINI_API_KEY;

export default async function handler(request: Request) {
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const body = await request.json();
        const { action, modelType, prompt, history, content, messages } = body;

        // Debug mode handling
        if (modelType === 'debug') {
            if (action === 'stream') {
                const stream = new ReadableStream({
                    async start(controller) {
                        const dummyText = "Console: *empty debug response, no api call made*";
                        await new Promise(resolve => setTimeout(resolve, 500));
                        controller.enqueue(new TextEncoder().encode(dummyText));
                        controller.close();
                    }
                });
                return new Response(stream, {
                    headers: { 'Content-Type': 'text/plain' },
                });
            } else if (action === 'generateLabel') {
                return new Response(JSON.stringify({ result: 'New Topic' }), { headers: { 'Content-Type': 'application/json' } });
            } else if (action === 'generateNodeSummary') {
                return new Response(JSON.stringify({ result: `Debug Summary: ${content?.slice(0, 20)}...` }), { headers: { 'Content-Type': 'application/json' } });
            } else if (action === 'summarizeBranch') {
                return new Response(JSON.stringify({ result: "Summary Placeholder" }), { headers: { 'Content-Type': 'application/json' } });
            }
        }

        // --- Model Selection ---
        let modelName = 'gemini-2.0-flash-lite';
        if (modelType === 'pro') modelName = 'gemini-2.5-pro'; // Fallback to 1.5 Pro if needed, using 2.5 per codebase hint
        if (modelType === 'fast') modelName = 'gemini-2.5-flash';
        if (modelType === 'lite') modelName = 'gemini-2.5-flash-lite';
        // Note: Using the model mapping logic from original service, but cleaned up.
        // If the codebase had 'gemini-1.5-flash' for labels, we stick to that or use the dynamic one.
        // For labels, the original code used 'gemini-1.5-flash' specifically.

        const model = genAI.getGenerativeModel({ model: modelName });

        // --- Actions ---

        if (action === 'stream') {
            // context is an array of strings. We map to history object.
            // Original logic: history = context.map((msg, i) => ({ role: i%2===0?'user':'model', parts: [{text: msg}] }))
            const chatHistory = (history || []).map((msg: string, i: number) => ({
                role: i % 2 === 0 ? 'user' : 'model',
                parts: [{ text: msg }],
            }));

            const chat = model.startChat({
                history: chatHistory,
            });

            const result = await chat.sendMessageStream(prompt);

            // Create a readable stream for the response
            const stream = new ReadableStream({
                async start(controller) {
                    const encoder = new TextEncoder();
                    try {
                        for await (const chunk of result.stream) {
                            const text = chunk.text();
                            controller.enqueue(encoder.encode(text));
                        }
                        controller.close();
                    } catch (err) {
                        controller.error(err);
                    }
                },
            });

            return new Response(stream, {
                headers: { 'Content-Type': 'text/plain' },
            });
        }

        if (action === 'generateLabel') {
            const labelModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Keep original model for labels
            const labelPrompt = `Summarize the following conversation snippet into a short, 3-5 word title:\n\n${(messages || []).join('\n')}`;
            const result = await labelModel.generateContent(labelPrompt);
            return new Response(JSON.stringify({ result: result.response.text().trim() }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (action === 'generateNodeSummary') {
            // Original used 'gemini-2.0-flash-lite' (via variable in original code)
            // Use the passed modelType specific logic or default
            const summaryPrompt = `Summarize the following text into a very short, single sentence (max 12 words). Content:\n\n${content}`;
            const result = await model.generateContent(summaryPrompt);
            let summary = result.response.text().trim();
            if (summary.startsWith('"') && summary.endsWith('"')) {
                summary = summary.slice(1, -1);
            }
            return new Response(JSON.stringify({ result: summary }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (action === 'summarizeBranch') {
            const branchPrompt = `Summarize the following conversation sequence into a single cohesive message that captures the key points, decisions, and context. Preserve the original meaning and intent.\n\nSequence:\n${(content || []).join('\n---\n')}`;
            const result = await model.generateContent(branchPrompt);
            return new Response(JSON.stringify({ result: result.response.text().trim() }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
