export class LLMClient {
    constructor() {
        // These will be loaded from chrome.storage or hardcoded for a professional MVP
        this.providers = [
            { id: 'groq', model: 'llama-3.3-70b-versatile' },
            { id: 'gemini', model: 'gemini-1.5-flash' }
        ];
    }

    async complete(messages, onProgress) {
        // In the extension, we route through the background.js fetch
        // API Key should be loaded from chrome.storage or env
        const groqKey = ""; // TODO: Load from chrome.storage.local
        
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages,
                    stream: !!onProgress
                })
            });

            if (!response.ok) throw new Error("Groq Failed");

            if (onProgress) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResult = "";
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const raw = line.slice(6);
                            if (raw === "[DONE]") break;
                            try {
                                const json = JSON.parse(raw);
                                const text = json.choices[0].delta.content || "";
                                fullResult += text;
                                onProgress(text);
                            } catch (e) {}
                        }
                    }
                }
                return fullResult;
            } else {
                const json = await response.json();
                return json.choices[0].message.content;
            }
        } catch (e) {
            console.error("LLM Error:", e);
            throw e;
        }
    }
}
