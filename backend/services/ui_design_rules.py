"""
UI Design Heuristics Engine & Design System Rules for STAGE Copilot.

This module defines the architectural UI/UX design heuristics enforced across
STAGE Copilot:
1. WCAG 2.1 AA/AAA contrast compliance.
2. 8-point spatial grid rhythm (padding, margins, gap: 4px, 8px, 16px, 24px, 32px, 48px).
3. Modular typography scale with optical letter-tracking (-0.025em on headlines, +0.05em on badges).
4. Modern component polish (subtle borders rgba(255,255,255,0.08), double box-shadows, rounded radii).
5. Conversion Rate Optimization (CRO) single primary CTA visibility.
"""

from typing import Dict, Any, List

# 8-point spatial rhythm scale (px)
SPACING_SCALE: List[int] = [4, 8, 16, 24, 32, 48, 64]

# WCAG 2.1 contrast threshold ratios
WCAG_CONTRAST_RATIOS: Dict[str, float] = {
    "AA_NORMAL": 4.5,      # Normal text (< 18pt or < 14pt bold)
    "AA_LARGE": 3.0,       # Large text (>= 18pt or >= 14pt bold)
    "AAA_NORMAL": 7.0,     # Enhanced contrast normal text
    "AAA_LARGE": 4.5,      # Enhanced contrast large text
    "UI_COMPONENTS": 3.0   # Non-text contrast for UI components & boundaries
}

# Modular typography scale & optical tracking
TYPOGRAPHY_SCALE: Dict[str, Any] = {
    "caption": "12px",
    "small": "14px",
    "body": "16px",
    "h3": "20px",
    "h2": "24px",
    "h1": "32px",
    "display": "48px",
    "line_heights": {
        "display": 1.15,
        "h1": 1.2,
        "h2": 1.3,
        "body": 1.5,
    },
    "optical_tracking": {
        "headlines": "-0.025em",  # Tighten large headings for cohesive visual mass
        "badges": "+0.05em",      # Loosen small uppercase badges/labels for legibility
        "body": "normal"
    }
}

# Modern component surface polish
MODERN_COMPONENT_POLISH: Dict[str, str] = {
    "subtle_border": "1px solid rgba(255, 255, 255, 0.08)",
    "subtle_border_light": "1px solid rgba(0, 0, 0, 0.08)",
    "soft_double_shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    "floating_double_shadow": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    "radius_sm": "6px",
    "radius_md": "8px",
    "radius_lg": "12px",
    "radius_pill": "9999px"
}

# Conversion Rate Optimization (CRO) rules
CRO_PRINCIPLES: Dict[str, str] = {
    "single_primary_cta": "Every viewport / hero section MUST have exactly ONE high-contrast primary CTA.",
    "secondary_cta_ghost": "Secondary actions must use outline, ghost, or muted styling to prevent split attention.",
    "button_padding_rhythm": "Primary buttons should follow the 8pt rhythm (e.g. 12px 24px or 16px 32px)."
}

# Master System Prompt for AI Copilot and Site Context Analysis
UI_DESIGN_SYSTEM_PROMPT = """
You are the STAGE Design System & UI Heuristics Engine.
You uphold the highest standards of digital interface engineering, visual hierarchy, accessibility, and conversion rate optimization (CRO).

When inspecting elements, recommending UI changes, or generating CSS mutations, ALWAYS strictly apply these design laws:

1. ACCESSIBILITY & WCAG 2.1 CONTRAST:
   - Body & normal text must satisfy at least 4.5:1 contrast against its background (WCAG AA) or 7:1 (WCAG AAA).
   - Large headlines (>=18pt or >=14pt bold) and interactive UI component borders must satisfy at least 3.0:1 (AA) or 4.5:1 (AAA).
   - If dark text is placed on dark background or light on light, adjust color to achieve high contrast.

2. 8-POINT SPATIAL RHYTHM:
   - All padding, margins, flex/grid gaps must strictly adhere to the 8pt scale: 4px, 8px, 16px, 24px, 32px, 48px, 64px.
   - Button padding: Standardize primary CTA buttons to '12px 24px' (or '16px 32px' for hero banners, '8px 16px' for compact toolbars).

3. MODULAR TYPOGRAPHY & OPTICAL TRACKING:
   - Headlines (H1, H2, Hero titles >= 24px): apply letter-spacing '-0.025em' to tighten visual mass and line-height 1.15 to 1.25.
   - Small badges, pill tags, and uppercase metadata (<=12px): apply letter-spacing '+0.05em' to maximize legibility.
   - Body copy (14px-16px): line-height 1.5 to 1.6 with normal tracking.

4. MODERN COMPONENT POLISH:
   - Subtle boundaries: apply 1px subtle borders (e.g., '1px solid rgba(255, 255, 255, 0.08)' in dark themes or '1px solid rgba(0, 0, 0, 0.08)' in light themes).
   - Depth & Shadows: use soft double box-shadows (e.g., '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)').
   - Border radius: use standard radii ('8px' for controls, '12px' for cards/containers, '9999px' for pills).

5. CONVERSION OPTIMIZATION (CRO):
   - Single primary CTA: ensure the primary conversion action stands out with an unmistakable accent color, ample padding, and visual dominance.
   - Secondary actions must remain muted or ghost/outline style to eliminate decision fatigue.
""".strip()
