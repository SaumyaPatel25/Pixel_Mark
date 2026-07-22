import { LLMClient } from '../shared/llm-client.js';
import { buildReport } from '../shared/markdown-builder.js';

const llm = new LLMClient();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_PIPELINE') {
        runFullPipeline(request.data);
        return true; // Keep channel open
    }
});

async function runFullPipeline(elementData) {
    const pipelineData = {};

    try {
        // --- Pass 1: Classification ---
        sendProgress(1, 'streaming', 'Analyzing Identity...');
        const pass1Response = await llm.complete([
            { role: "system", content: "You are a UI component analyst. Return valid JSON only: { \"componentType\": \"...\", \"designLanguage\": \"...\", \"complexityScore\": 1-10, \"keyCharacteristics\": [] }" },
            { role: "user", content: `Analyze this element: ${elementData.tagName}\nText: ${elementData.innerText}\nStyles: ${JSON.stringify(elementData.styles)}` }
        ], (chunk) => sendProgress(1, 'streaming', chunk));
        
        pipelineData.pass1 = JSON.parse(pass1Response.replace(/```json|```/g, ''));

        // --- Pass 2: Prompt Engineering ---
        sendProgress(2, 'streaming', 'Crafting Recreation Prompt...');
        const pass2Response = await llm.complete([
            { role: "system", content: "You are an expert at writing prompts for AI coding assistants. Create a single, precise, technical prompt to recreate this UI component based on the provided analysis and raw styles." },
            { role: "user", content: `Analysis: ${JSON.stringify(pipelineData.pass1)}\nRaw Styles: ${JSON.stringify(elementData.styles)}` }
        ], (chunk) => sendProgress(2, 'streaming', chunk));
        
        pipelineData.pass2 = { prompt: pass2Response };

        // --- Pass 3: Code Generation ---
        sendProgress(3, 'streaming', 'Generating Production-Ready Code...');
        const pass3Response = await llm.complete([
            { role: "system", content: "You are a senior React/Tailwind engineer. Generate only valid, production-ready TSX code for the provided component prompt." },
            { role: "user", content: `Prompt: ${pass2Response}\nIdentity: ${elementData.tagName}` }
        ], (chunk) => sendProgress(3, 'streaming', chunk));

        pipelineData.pass3 = { code: pass3Response };

        // --- Completion ---
        const finalReport = buildReport(elementData, pipelineData);
        chrome.runtime.sendMessage({ type: 'PIPELINE_COMPLETE', report: finalReport });

    } catch (e) {
        console.error("PIPELINE ERROR:", e);
        chrome.runtime.sendMessage({ type: 'PIPELINE_ERROR', detail: e.message });
    }
}

function sendProgress(pass, status, partial) {
    chrome.runtime.sendMessage({
        type: 'PIPELINE_PROGRESS',
        pass,
        status,
        partial
    });
}
