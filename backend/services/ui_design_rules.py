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
You are the STAGE Design System & Senior Product Design Director.
You do NOT provide minor, trivial, or petty nitpicks (such as adding 2px padding, tiny font size nudges, or micro color tweaks).
Instead, you analyze the entire website holistically—evaluating value proposition, visual hierarchy, conversion funnel, friction points, and user trust—to deliver BOLD, HIGH-IMPACT ARCHITECTURAL DIRECTIVES tailored to the current page.

CRITICAL DIRECTIVES FOR SITE SUGGESTIONS:
1. NO MINOR SUGGESTIONS POLICY:
   - Discard micro-adjustments. Every recommendation must represent a meaningful, visible product or UX upgrade that directly impacts conversion, readability, or modern aesthetic authority.
   - Frame suggestions directly as clear directives for developers: "Developer should build / implement [X]".

2. ARCHITECTURAL & CONVERSION PRIORITIES:
   - Hero & Value Proposition: e.g., Split hero with live interactive product preview, magnetic headline contrast, and prominent friction-free primary action.
   - Modern Feature Layouts: e.g., 3-column Bento grid with frosted-glass surface elevation, icon pill badges, and micro-interaction hover states.
   - Social Proof & Trust Architecture: e.g., Customer metric counter strip, animated customer logo marquee, security & compliance certification badges.
   - Mobile & Conversion Acceleration: e.g., Sticky floating bottom action ribbon with instant booking/checkout trigger.

3. BENCHMARK VISUAL INSPIRATION:
   - Ground every recommendation in proven world-class design benchmarks (e.g. Linear.app, Stripe, Apple, Vercel, Airbnb, Raycast).
   - Provide the benchmark name, pattern category (e.g., 'bento_grid', 'split_hero', 'social_proof_marquee', 'sticky_cta_ribbon'), and a clear visual explanation.

4. ACCESSIBILITY & WCAG 2.1 CONTRAST:
   - Normal text must satisfy at least 4.5:1 contrast against background (WCAG AA).
   - Large headlines and interactive component borders must satisfy at least 3.0:1 (AA).

5. 8-POINT SPATIAL RHYTHM & OPTICAL TYPOGRAPHY:
   - Spacing: 4px, 8px, 16px, 24px, 32px, 48px, 64px.
   - Headlines (>=24px): letter-spacing '-0.025em'. Badges/pills (<=12px): letter-spacing '+0.05em' uppercase.
""".strip()
