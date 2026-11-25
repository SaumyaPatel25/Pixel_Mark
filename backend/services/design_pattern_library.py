"""
Curated UIverse.io & Dribbble Design Pattern Library + Website Theme Color Adapter.

Provides:
1. Real-time extraction of a website's Theme Palette (background polarity, primary brand accent,
   WCAG 2.1 AA/AAA contrasting foreground text, glow rgba, surface glass, and border tokens).
2. A curated library of production-grade UI patterns & micro-interactions inspired by
   Uiverse.io (buttons, glass navs, tactile cards, focus rings) and Dribbble
   (editorial hero typography, community event CTAs, bento surfaces).
3. Theme adaptation (`adapt_pattern_to_theme`) that transforms every asset's CSS & code spec
   to match the target website's actual theme colors BEFORE presenting suggestions to the client.
4. Color sanitizer (`sanitize_css_colors_to_theme`) that strips default browser/clashing colors
   (such as #0000EE) from LLM outputs and enforces WCAG contrast.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple


# Colors that should never be treated as intentional brand accents
BANNED_DEFAULT_COLORS = {
    "#0000ee",
    "#0000ff",
    "#551a8b",
    "#ff0000",
    "rgb(0, 0, 238)",
    "rgb(0, 0, 255)",
    "blue",
}


def _hex_to_rgb(hex_color: str) -> Optional[Tuple[int, int, int]]:
    if not isinstance(hex_color, str):
        return None
    h = hex_color.strip().lstrip("#")
    if len(h) == 3 and all(c in "0123456789abcdefABCDEF" for c in h):
        h = "".join(c * 2 for c in h)
    if len(h) != 6 or not all(c in "0123456789abcdefABCDEF" for c in h):
        return None
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    r = max(0, min(255, int(r)))
    g = max(0, min(255, int(g)))
    b = max(0, min(255, int(b)))
    return f"#{r:02X}{g:02X}{b:02X}"


def _relative_luminance(rgb: Tuple[int, int, int]) -> float:
    def channel(c: int) -> float:
        s = c / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def _contrast_ratio(rgb1: Tuple[int, int, int], rgb2: Tuple[int, int, int]) -> float:
    l1 = _relative_luminance(rgb1)
    l2 = _relative_luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def _saturation(rgb: Tuple[int, int, int]) -> float:
    r, g, b = [x / 255.0 for x in rgb]
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx == mn:
        return 0.0
    l = (mx + mn) / 2.0
    d = mx - mn
    return d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)


def _adjust_brightness(rgb: Tuple[int, int, int], factor: float) -> Tuple[int, int, int]:
    """Adjust brightness by factor (>1 lightens, <1 darkens)."""
    r, g, b = rgb
    if factor >= 1.0:
        t = min(1.0, factor - 1.0)
        return (
            int(r + (255 - r) * t),
            int(g + (255 - g) * t),
            int(b + (255 - b) * t),
        )
    return (
        int(r * factor),
        int(g * factor),
        int(b * factor),
    )


def _pick_wcag_text_color(bg_rgb: Tuple[int, int, int]) -> str:
    """Returns #FFFFFF or #0F172A whichever achieves higher WCAG 2.1 contrast."""
    white = (255, 255, 255)
    slate = (15, 23, 42)
    return "#FFFFFF" if _contrast_ratio(bg_rgb, white) >= _contrast_ratio(bg_rgb, slate) else "#0F172A"


def extract_site_theme(site_fingerprint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Derives a cohesive, WCAG-compliant Theme Palette from the target website's DOM fingerprint.
    Adapts to light vs dark polarity and selects the real brand accent (never #0000EE).
    """
    raw_colors = site_fingerprint.get("dominant_colors") or site_fingerprint.get("colors") or []
    valid_hexes: List[str] = []
    for c in raw_colors:
        if not isinstance(c, str):
            continue
        c_norm = c.strip()
        if c_norm.lower() in BANNED_DEFAULT_COLORS:
            continue
        rgb = _hex_to_rgb(c_norm)
        if rgb:
            valid_hexes.append(_rgb_to_hex(*rgb))

    # Also inspect existing CTA button background colors if available
    cta_buttons = site_fingerprint.get("cta_buttons") or site_fingerprint.get("ctas") or []
    cta_accent_candidates: List[str] = []
    for btn in cta_buttons:
        if not isinstance(btn, dict):
            continue
        styles = btn.get("styles") or {}
        bg = styles.get("backgroundColor") or ""
        if isinstance(bg, str) and bg.startswith("#") and bg.lower() not in BANNED_DEFAULT_COLORS:
            rgb = _hex_to_rgb(bg)
            if rgb:
                cta_accent_candidates.append(_rgb_to_hex(*rgb))

    # Determine background polarity from first dominant color (body bg is sampled first in stage-agent.js)
    is_dark = False
    bg_hex = "#FFFFFF"
    if valid_hexes:
        first_rgb = _hex_to_rgb(valid_hexes[0])
        if first_rgb:
            lum = _relative_luminance(first_rgb)
            is_dark = lum < 0.35
            bg_hex = valid_hexes[0]

    # Find best chromatic brand accent (saturation >= 0.18, not near-white/near-black)
    accent_hex: Optional[str] = None
    best_sat = 0.0
    for candidate in cta_accent_candidates + valid_hexes:
        rgb = _hex_to_rgb(candidate)
        if not rgb:
            continue
        lum = _relative_luminance(rgb)
        sat = _saturation(rgb)
        # Skip pure white/cream/black neutrals when looking for chromatic accent
        if 0.03 < lum < 0.88 and sat > max(0.18, best_sat):
            best_sat = sat
            accent_hex = candidate

    # If the site is purely monochrome/editorial (no chromatic colors), pick an intentional,
    # refined high-contrast editorial accent that harmonizes with its polarity
    if not accent_hex:
        if is_dark:
            accent_hex = "#6366F1"  # Refined indigo for dark monochrome sites
        else:
            # For light editorial sites (like cream/off-white/black), deep charcoal-ink or refined indigo
            accent_hex = "#18181B"

    primary_rgb = _hex_to_rgb(accent_hex) or (24, 24, 27)
    primary_text = _pick_wcag_text_color(primary_rgb)

    # Hover color: slightly lighter on dark primary, slightly darker on light primary
    if _relative_luminance(primary_rgb) < 0.2:
        hover_rgb = _adjust_brightness(primary_rgb, 1.18)
    else:
        hover_rgb = _adjust_brightness(primary_rgb, 0.88)
    primary_hover = _rgb_to_hex(*hover_rgb)

    primary_glow = f"rgba({primary_rgb[0]}, {primary_rgb[1]}, {primary_rgb[2]}, 0.28)"
    primary_glow_strong = f"rgba({primary_rgb[0]}, {primary_rgb[1]}, {primary_rgb[2]}, 0.42)"

    if is_dark:
        surface = "rgba(15, 23, 42, 0.78)"
        surface_solid = "#0F172A"
        border = "rgba(255, 255, 255, 0.12)"
        text_primary = "#F8FAFC"
        text_muted = "#CBD5E1"
        shadow_color = "rgba(0, 0, 0, 0.45)"
    else:
        surface = "rgba(255, 255, 255, 0.84)"
        surface_solid = "#FFFFFF"
        border = "rgba(15, 23, 42, 0.10)"
        text_primary = "#0F172A"
        text_muted = "#475569"
        shadow_color = "rgba(15, 23, 42, 0.12)"

    return {
        "is_dark": is_dark,
        "background": bg_hex,
        "primary": accent_hex,
        "primary_hover": primary_hover,
        "primary_text": primary_text,
        "primary_glow": primary_glow,
        "primary_glow_strong": primary_glow_strong,
        "surface": surface,
        "surface_solid": surface_solid,
        "border": border,
        "text_primary": text_primary,
        "text_muted": text_muted,
        "shadow_color": shadow_color,
        "palette_swatches": [bg_hex, accent_hex, primary_text],
    }


# ─── CURATED UIVERSE.IO & DRIBBBLE PATTERN LIBRARY ───────────────────────────
# Every asset uses {{TOKEN}} placeholders so it is adapted to the site's exact theme
# BEFORE being suggested or injected into the DOM.

DESIGN_PATTERNS: List[Dict[str, Any]] = [
    {
        "id": "uiverse-pill-glow-cta",
        "title": "Elevated Pill CTA with Theme Glow",
        "category": "cta",
        "impact_tag": "CRO",
        "source_platform": "Uiverse.io",
        "benchmark_name": "Uiverse.io • Magnetic Pill CTA",
        "benchmark_url": "https://uiverse.io/buttons",
        "benchmark_pattern": "pill_glow_cta",
        "description": "Transform the primary action into a tactile, pill-shaped focal button with your site's own accent color, WCAG-compliant contrast, and a smooth hover lift.",
        "developer_directive": "Developer should upgrade the primary CTA using a theme-matched pill button ({{PRIMARY}} fill, {{PRIMARY_TEXT}} text) with cubic-bezier hover lift and subtle ambient glow.",
        "css_mutations": {
            "background-color": "{{PRIMARY}}",
            "color": "{{PRIMARY_TEXT}}",
            "padding": "12px 28px",
            "border-radius": "9999px",
            "font-weight": "600",
            "display": "inline-flex",
            "align-items": "center",
            "justify-content": "center",
            "gap": "8px",
            "border": "1px solid {{BORDER}}",
            "box-shadow": "0 8px 20px -4px {{PRIMARY_GLOW}}",
            "transition": "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, background-color 0.2s ease",
        },
        "hover_css": {
            "background-color": "{{PRIMARY_HOVER}}",
            "transform": "translateY(-2px)",
            "box-shadow": "0 14px 28px -4px {{PRIMARY_GLOW_STRONG}}",
        },
        "developer_code_spec": (
            '<a className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full '
            'font-semibold transition-all duration-200 hover:-translate-y-0.5" '
            'style={{ backgroundColor: "{{PRIMARY}}", color: "{{PRIMARY_TEXT}}", '
            'boxShadow: "0 8px 20px -4px {{PRIMARY_GLOW}}" }}>...</a>'
        ),
    },
    {
        "id": "dribbble-event-rsvp-cta",
        "title": "Theme-Matched Event Action Pill",
        "category": "event_cta",
        "impact_tag": "CRO",
        "source_platform": "Dribbble",
        "benchmark_name": "Dribbble • Luma-Style Event CTA",
        "benchmark_url": "https://dribbble.com/search/event-landing-page",
        "benchmark_pattern": "split_hero",
        "description": "Elevate event discovery and RSVP conversion by turning the primary link into a crisp, high-contrast pill button harmonized with your existing brand palette.",
        "developer_directive": "Developer should style the primary Events/RSVP trigger as a high-contrast pill button in {{PRIMARY}} with {{PRIMARY_TEXT}} typography and soft elevation.",
        "css_mutations": {
            "background-color": "{{PRIMARY}}",
            "color": "{{PRIMARY_TEXT}}",
            "padding": "10px 24px",
            "border-radius": "9999px",
            "font-weight": "600",
            "letter-spacing": "-0.01em",
            "box-shadow": "0 6px 18px -3px {{PRIMARY_GLOW}}",
            "transition": "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
        },
        "hover_css": {
            "background-color": "{{PRIMARY_HOVER}}",
            "transform": "translateY(-1.5px)",
            "box-shadow": "0 12px 24px -4px {{PRIMARY_GLOW_STRONG}}",
        },
        "developer_code_spec": (
            '<button className="px-6 py-2.5 rounded-full font-semibold transition-all hover:-translate-y-0.5" '
            'style={{ backgroundColor: "{{PRIMARY}}", color: "{{PRIMARY_TEXT}}" }}>'
            "Explore Events</button>"
        ),
    },
    {
        "id": "dribbble-editorial-hero-type",
        "title": "Editorial Headline Hierarchy",
        "category": "heading",
        "impact_tag": "Typography",
        "source_platform": "Dribbble",
        "benchmark_name": "Dribbble • Editorial Typography Scale",
        "benchmark_url": "https://dribbble.com/search/editorial-typography-hero",
        "benchmark_pattern": "editorial_typography",
        "description": "Tighten headline letter-spacing (-0.025em) and optimize line-height (1.15) with crisp theme-matched contrast to give the hero immediate editorial authority.",
        "developer_directive": "Developer should apply tight negative tracking (-0.025em), 1.15 line-height, and bold weight (800) in {{TEXT_PRIMARY}} to anchor the hero visual hierarchy.",
        "css_mutations": {
            "letter-spacing": "-0.025em",
            "line-height": "1.15",
            "font-weight": "800",
            "color": "{{TEXT_PRIMARY}}",
        },
        "hover_css": {},
        "developer_code_spec": (
            '<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15]" '
            'style={{ color: "{{TEXT_PRIMARY}}" }}>...</h1>'
        ),
    },
    {
        "id": "uiverse-frosted-nav-pill",
        "title": "Frosted Glass Navigation Surface",
        "category": "nav",
        "impact_tag": "Polish",
        "source_platform": "Uiverse.io",
        "benchmark_name": "Uiverse.io • Frosted Glass Header",
        "benchmark_url": "https://uiverse.io/cards",
        "benchmark_pattern": "sticky_cta_ribbon",
        "description": "Add a modern frosted-glass backdrop, subtle theme-matched hairline border, and soft elevation to keep navigation crisp while scrolling.",
        "developer_directive": "Developer should apply backdrop-filter blur(14px), translucent surface ({{SURFACE}}), and hairline border ({{BORDER}}) to the header navigation bar.",
        "css_mutations": {
            "background-color": "{{SURFACE}}",
            "backdrop-filter": "blur(14px)",
            "-webkit-backdrop-filter": "blur(14px)",
            "border-bottom": "1px solid {{BORDER}}",
            "box-shadow": "0 8px 24px -6px {{SHADOW_COLOR}}",
            "transition": "background-color 0.25s ease, box-shadow 0.25s ease",
        },
        "hover_css": {},
        "developer_code_spec": (
            '<header className="sticky top-0 z-40 backdrop-blur-md border-b" '
            'style={{ backgroundColor: "{{SURFACE}}", borderColor: "{{BORDER}}" }}>...</header>'
        ),
    },
    {
        "id": "uiverse-tactile-card-lift",
        "title": "Tactile Surface & Hover Elevation",
        "category": "focused",
        "impact_tag": "Polish",
        "source_platform": "Uiverse.io",
        "benchmark_name": "Uiverse.io • Tactile Surface Micro-Card",
        "benchmark_url": "https://uiverse.io/cards",
        "benchmark_pattern": "tactile_card",
        "description": "Refine this component with 8pt padding rhythm, a subtle theme-adapted border, rounded corners, and a smooth hover lift interaction.",
        "developer_directive": "Developer should wrap this component with 12px radius, {{BORDER}} hairline border, and smooth hover elevation using {{PRIMARY_GLOW}}.",
        "css_mutations": {
            "border-radius": "12px",
            "border": "1px solid {{BORDER}}",
            "box-shadow": "0 4px 14px -2px {{SHADOW_COLOR}}",
            "transition": "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, border-color 0.22s ease",
        },
        "hover_css": {
            "transform": "translateY(-2px)",
            "border-color": "{{PRIMARY}}",
            "box-shadow": "0 12px 24px -6px {{PRIMARY_GLOW}}",
        },
        "developer_code_spec": (
            '<div className="rounded-xl border transition-all duration-200 hover:-translate-y-0.5" '
            'style={{ borderColor: "{{BORDER}}" }}>...</div>'
        ),
    },
]


def _fill_tokens(text: str, theme: Dict[str, Any]) -> str:
    replacements = {
        "{{PRIMARY}}": theme["primary"],
        "{{PRIMARY_HOVER}}": theme["primary_hover"],
        "{{PRIMARY_TEXT}}": theme["primary_text"],
        "{{PRIMARY_GLOW}}": theme["primary_glow"],
        "{{PRIMARY_GLOW_STRONG}}": theme["primary_glow_strong"],
        "{{SURFACE}}": theme["surface"],
        "{{SURFACE_SOLID}}": theme["surface_solid"],
        "{{BORDER}}": theme["border"],
        "{{TEXT_PRIMARY}}": theme["text_primary"],
        "{{TEXT_MUTED}}": theme["text_muted"],
        "{{SHADOW_COLOR}}": theme["shadow_color"],
    }
    out = text
    for token, val in replacements.items():
        out = out.replace(token, str(val))
    return out


def adapt_pattern_to_theme(
    pattern: Dict[str, Any],
    selector: str,
    theme: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Adapts a curated Uiverse.io / Dribbble pattern to the target website's theme colors
    and generates ready-to-inject `css_rules` (including :hover rules).
    """
    adapted_mutations: Dict[str, str] = {}
    for prop, val in (pattern.get("css_mutations") or {}).items():
        adapted_mutations[prop] = _fill_tokens(str(val), theme)

    base_body = " ".join(
        f"{k}: {v if '!important' in v else v + ' !important'};"
        for k, v in adapted_mutations.items()
    )
    css_rules_parts = [f"{selector} {{ {base_body} }}"]

    hover_css = pattern.get("hover_css") or {}
    if hover_css:
        hover_body = " ".join(
            f"{k}: {_fill_tokens(str(v), theme)} !important;"
            for k, v in hover_css.items()
        )
        css_rules_parts.append(f"{selector}:hover {{ {hover_body} }}")

    return {
        "id": pattern["id"],
        "title": pattern["title"],
        "impact_tag": pattern["impact_tag"],
        "selector": selector,
        "description": _fill_tokens(pattern["description"], theme),
        "developer_directive": _fill_tokens(pattern["developer_directive"], theme),
        "source_platform": pattern["source_platform"],
        "benchmark_name": pattern["benchmark_name"],
        "benchmark_url": pattern["benchmark_url"],
        "benchmark_pattern": pattern["benchmark_pattern"],
        "developer_code_spec": _fill_tokens(pattern.get("developer_code_spec", ""), theme),
        "theme_colors": theme["palette_swatches"],
        "css_mutations": adapted_mutations,
        "css_rules": " ".join(css_rules_parts),
    }


def sanitize_css_colors_to_theme(
    css_mutations: Dict[str, Any],
    css_rules: str,
    selector: str,
    theme: Dict[str, Any],
) -> Tuple[Dict[str, Any], str]:
    """
    Strips harsh/banned default colors (like #0000EE, #0000FF, raw 'blue') from LLM-generated
    CSS mutations and replaces them with the target site's WCAG-verified theme colors.
    """
    cleaned: Dict[str, Any] = {}
    has_bg = False
    for k, v in (css_mutations or {}).items():
        val_str = str(v).strip()
        val_lower = val_str.lower()
        prop_lower = k.strip().lower()

        if any(bad in val_lower for bad in BANNED_DEFAULT_COLORS):
            if "background" in prop_lower:
                val_str = theme["primary"]
                has_bg = True
            elif prop_lower == "color":
                val_str = theme["primary_text"] if has_bg else theme["primary"]
            elif "border" in prop_lower:
                val_str = re.sub(r"#0000[eEfF]{2}|#0000[fF]{2}", theme["primary"], val_str, flags=re.IGNORECASE)
            elif "shadow" in prop_lower:
                val_str = f"0 10px 20px -4px {theme['primary_glow']}"
        elif "background" in prop_lower:
            has_bg = True

        cleaned[k] = val_str

    # Ensure text color has valid WCAG contrast if background-color was set
    bg_val = cleaned.get("background-color") or cleaned.get("background")
    if isinstance(bg_val, str):
        bg_rgb = _hex_to_rgb(bg_val)
        if bg_rgb:
            text_val = cleaned.get("color")
            text_rgb = _hex_to_rgb(str(text_val)) if text_val else None
            if not text_rgb or _contrast_ratio(bg_rgb, text_rgb) < 4.5:
                cleaned["color"] = _pick_wcag_text_color(bg_rgb)

    if cleaned:
        body = " ".join(
            f"{k}: {v if '!important' in str(v) else str(v) + ' !important'};"
            for k, v in cleaned.items()
        )
        rebuilt_rules = f"{selector} {{ {body} }}"
        # Preserve any :hover block from css_rules if present, sanitizing banned colors inside it
        hover_match = re.search(r"([^{}]*:hover\s*\{[^}]*\})", css_rules or "", flags=re.IGNORECASE)
        if hover_match:
            hover_block = hover_match.group(1)
            for bad in ("#0000EE", "#0000ee", "#0000FF", "#0000ff"):
                hover_block = hover_block.replace(bad, theme["primary_hover"])
            rebuilt_rules = f"{rebuilt_rules} {hover_block}"
        return cleaned, rebuilt_rules

    sanitized_rules = css_rules or ""
    for bad in ("#0000EE", "#0000ee", "#0000FF", "#0000ff"):
        sanitized_rules = sanitized_rules.replace(bad, theme["primary"])
    return cleaned, sanitized_rules


def get_pattern_catalog_summary() -> str:
    """Compact summary of available Uiverse.io & Dribbble patterns for LLM prompt grounding."""
    lines = []
    for p in DESIGN_PATTERNS:
        lines.append(
            f"- {p['id']} ({p['source_platform']}): {p['benchmark_name']} | {p['benchmark_url']} | impact={p['impact_tag']}"
        )
    return "\n".join(lines)
