const container = document.getElementById('status-container');
const template = document.getElementById('pipeline-template');
let reportData = null;

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CAPTURE_TRIGGERED') {
        container.innerHTML = '';
        container.appendChild(template.content.cloneNode(true));
    }

    if (message.type === 'PIPELINE_PROGRESS') {
        const item = document.querySelector(`.pass-item[data-pass="${message.pass}"]`);
        if (!item) return;
        
        const box = item.querySelector('.stream-box');
        const indicator = item.querySelector('.status-indicator');
        
        indicator.textContent = 'STREAMING';
        indicator.className = 'status-indicator text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400';
        box.textContent += message.partial;
        box.scrollTop = box.scrollHeight;
    }

    if (message.type === 'PIPELINE_COMPLETE') {
        document.querySelectorAll('.status-indicator').forEach(el => {
            el.textContent = 'COMPLETE';
            el.className = 'status-indicator text-[8px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400';
        });

        const btn = document.getElementById('download-report');
        btn.classList.remove('hidden');
        reportData = message.report;
        
        btn.addEventListener('click', () => {
            const blob = new Blob([reportData.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = reportData.filename;
            a.click();
        });
    }

    if (message.type === 'PIPELINE_ERROR') {
        container.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">Error: ${message.detail}</div>`;
    }
});
