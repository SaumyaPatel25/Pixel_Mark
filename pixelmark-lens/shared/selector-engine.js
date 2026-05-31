export const SelectorEngine = {
  generate: (el) => {
    // 1. data-testid / data-cy / data-test
    if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;
    if (el.dataset.cy) return `[data-cy="${el.dataset.cy}"]`;
    
    // 2. Unique ID (reject auto-generated IDs: contains numbers and is > 20 chars)
    if (el.id && !/^\d/.test(el.id) && el.id.length < 20) return `#${el.id}`;
    
    // 3. aria-label (highly stable)
    if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
    
    // 4. Semantic tag + meaningful class (filter out utility classes)
    const semanticClasses = [...el.classList].filter(c => !/^(mt|mb|ml|mr|pt|pb|pl|pr|px|py|mx|my|flex|grid|w-|h-|text-|bg-|border-|rounded|gap|p-|m-)/.test(c));
    if (semanticClasses.length) {
      const candidate = `${el.tagName.toLowerCase()}.${semanticClasses[0]}`;
      if (document.querySelectorAll(candidate).length === 1) return candidate;
    }
    
    // 5. Build minimal structural path — walk up tree until unique
    return SelectorEngine.buildMinimalPath(el);
  },

  buildMinimalPath: (el) => {
    let path = [], cur = el;
    while (cur && cur.nodeType === Node.ELEMENT_NODE) {
      let selector = cur.nodeName.toLowerCase();
      let siblings = cur.parentNode ? [...cur.parentNode.children].filter(s => s.tagName === cur.tagName) : [];
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
      }
      path.unshift(selector);
      cur = cur.parentNode;
      if (cur && document.querySelectorAll(path.join(' > ')).length === 1) break;
    }
    return path.join(' > ');
  }
};
