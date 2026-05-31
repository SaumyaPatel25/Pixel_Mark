import { SelectorEngine } from '../shared/selector-engine.js';

(function() {
    let hoverEl = null;

    document.addEventListener('mouseover', (e) => {
        if (hoverEl) hoverEl.style.outline = '';
        hoverEl = e.target;
        hoverEl.style.outline = '3px solid #00f0ff';
        hoverEl.style.outlineOffset = '-3px';
    });

    document.addEventListener('click', async (e) => {
        if (!e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();

        const el = e.target;
        const styles = window.getComputedStyle(el);
        
        const elementData = {
            tagName: el.tagName,
            id: el.id,
            innerText: el.innerText.slice(0, 100),
            selector: SelectorEngine.generate(el),
            pageUrl: window.location.href,
            styles: {
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                fontFamily: styles.fontFamily,
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
                lineHeight: styles.lineHeight,
                width: styles.width,
                height: styles.height,
                padding: styles.padding,
                margin: styles.margin,
                borderRadius: styles.borderRadius,
                boxShadow: styles.boxShadow,
                border: styles.border
            }
        };

        // Notify Service Worker
        chrome.runtime.sendMessage({ type: 'START_PIPELINE', data: elementData });
        
        // Notify Popup (if open)
        chrome.runtime.sendMessage({ type: 'CAPTURE_TRIGGERED' });
    }, true);
})();
