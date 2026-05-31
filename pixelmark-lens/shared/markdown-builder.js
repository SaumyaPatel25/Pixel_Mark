// Helper: Basic Color Naming Logic
const COLOR_MAP = {
    '#a855f7': 'Accent Purple',
    '#3b82f6': 'Brand Blue',
    '#10b981': 'Emerald Green',
    '#f43f5e': 'Critical Red',
    '#000000': 'Pure Black',
    '#ffffff': 'Pure White',
    '#00f0ff': 'Cyber Cyan'
};

function nameColor(val) {
    const hex = val.toLowerCase();
    return COLOR_MAP[hex] || 'Custom Color';
}

function buildColorTable(styles) {
    const roles = ['color', 'backgroundColor', 'borderColor', 'outlineColor'];
    let rows = '';
    const seen = new Set();

    roles.forEach(role => {
        const val = styles[role];
        if (val && val !== 'transparent' && val !== 'rgba(0, 0, 0, 0)' && !seen.has(val)) {
            rows += `| ${role} | \`${val}\` | ${nameColor(val)} |\n`;
            seen.add(val);
        }
    });
    return rows || '| Status | No distinct colors detected | - |\n';
}

export function buildReport(elementData, pipelineOutput) {
    return {
        filename: `pixelmark-lens_${elementData.tagName.toLowerCase()}_${Date.now()}.md`,
        content: `
# Component Analysis: ${elementData.tagName.toLowerCase()}${elementData.id ? '#' + elementData.id : ''}
> Captured from: ${elementData.pageUrl}
> ${new Date().toISOString()}

---

## Identity
- **Selector:** \`${elementData.selector}\`
- **Element:** ${elementData.tagName} ${elementData.id ? '/ #' + elementData.id : ''}
- **Label:** "${elementData.innerText || 'None'}"
- **Component Type:** ${pipelineOutput.pass1.componentType}
- **Design Language:** ${pipelineOutput.pass1.designLanguage}

---

## Color System
| Role | Value | Format |
|------|-------|--------|
${buildColorTable(elementData.styles)}

## Typography
| Property | Value |
|----------|-------|
| Font | ${elementData.styles.fontFamily} |
| Size | ${elementData.styles.fontSize} |
| Weight | ${elementData.styles.fontWeight} |
| Line Height | ${elementData.styles.lineHeight} |
| Letter Spacing | ${elementData.styles.letterSpacing} |

## Box Model
- Dimensions: ${elementData.styles.width} × ${elementData.styles.height}
- Padding: ${elementData.styles.padding}
- Border: ${elementData.styles.borderWidth} ${elementData.styles.borderStyle} ${elementData.styles.borderColor}
- Border Radius: ${elementData.styles.borderRadius}

## Effects
- Shadow: \`${elementData.styles.boxShadow || 'None'}\`
- Backdrop: \`${elementData.styles.backdropFilter || 'None'}\`
- Transition: \`${elementData.styles.transition || 'None'}\`

## Viewport Context
- Position: X ${elementData.relativePosition?.xPercent || 0}% / Y ${elementData.relativePosition?.yPercent || 0}%
- Breakpoint: ${elementData.currentBreakpoint || 'Desktop'}

---

## Recreation Prompt
${pipelineOutput.pass2.prompt}

---

## Code
\`\`\`tsx
${pipelineOutput.pass3.code}
\`\`\`
    `.trim()
    };
}
