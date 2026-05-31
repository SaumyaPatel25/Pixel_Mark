from datetime import datetime, timezone
from typing import Optional

SEVERITY_EMOJI = {"P0": "🔴", "P1": "🟠", "P2": "🟡", "P3": "⚪"}
SEVERITY_LABEL = {"P0": "Critical", "P1": "High", "P2": "Medium", "P3": "Low"}
CATEGORY_LABEL = {
    "visual_bug": "Visual Bug",
    "functional_bug": "Functional Bug",
    "ux_issue": "UX Issue",
    "performance": "Performance",
    "accessibility": "Accessibility",
    "copy_error": "Copy / Text Error",
}

def build_report(project: dict, comments: list[dict]) -> str:
    now = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
    total = len(comments)
    open_c = [c for c in comments if c.get("status") != "resolved"]
    resolved_c = [c for c in comments if c.get("status") == "resolved"]
    
    # Severity counts
    sev_counts = {"P0": 0, "P1": 0, "P2": 0, "P3": 0, None: 0}
    for c in comments:
        sev = c.get("severity")
        if sev in sev_counts:
            sev_counts[sev] += 1
        else:
            sev_counts[None] += 1
            
    # Category breakdown
    cat_counts: dict[str, int] = {}
    for c in comments:
        cat = c.get("category", "uncategorized")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        
    # Sort by severity: P0 → P1 → P2 → P3 → None
    sev_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3, None: 4}
    sorted_comments = sorted(comments, key=lambda c: sev_order.get(c.get("severity"), 4))
    
    lines = []
    
    # ── Header ────────────────────────────────────────────────────────
    lines += [
        f"# 🔬 PixelMark Audit Report",
        f"## {project['name']}",
        f"",
        f"> **Target:** [{project['target_url']}]({project['target_url']})",
        f"> **Generated:** {now}",
        f"> **Report ID:** `{project['id'][:8].upper() or 'N/A'}`",
        f"",
        "---",
        "",
    ]
    
    # ── Executive Summary ─────────────────────────────────────────────
    lines += [
        "## 📊 Executive Summary",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total Issues | **{total}** |",
        f"| Open | **{len(open_c)}** |",
        f"| Resolved | **{len(resolved_c)}** |",
        f"| 🔴 Critical (P0) | **{sev_counts.get('P0', 0)}** |",
        f"| 🟠 High (P1) | **{sev_counts.get('P1', 0)}** |",
        f"| 🟡 Medium (P2) | **{sev_counts.get('P2', 0)}** |",
        f"| ⚪ Low (P3) | **{sev_counts.get('P3', 0)}** |",
        "",
    ]
    
    # ── Category Breakdown ────────────────────────────────────────────
    if cat_counts:
        lines += ["## 📂 Issue Breakdown by Category", ""]
        for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
            label = CATEGORY_LABEL.get(cat, cat.replace("_", " ").title())
            bar = "█" * count + "░" * max(0, 10 - count)
            lines.append(f"- **{label}**: {bar} {count}")
        lines.append("")
        
    # ── Session Intelligence (rage clicks + hesitations) ──────────────
    rage_clicks = []
    hesitations = []
    for c in comments:
        session = c.get("session_data") or {}
        rage_clicks += session.get("rageClicks", [])
        hesitations += session.get("hesitations", [])
        
    if rage_clicks or hesitations:
        lines += ["## 🧠 Session Intelligence", ""]
        if rage_clicks:
            lines.append(f"**⚡ Rage Clicks Detected ({len(rage_clicks)})**")
            for r in rage_clicks[:5]:
                lines.append(f"- `{r.get('selector', 'unknown')}` — clicked {r.get('count', '?')}× in 1.5s")
        if hesitations:
            lines.append(f"\n**⏸ Hesitation Points ({len(hesitations)})**")
            for h in hesitations[:5]:
                lines.append(f"- `{h.get('selector', 'unknown')}` — hovered {h.get('duration', '?')}ms without acting")
        lines.append("")
        
    lines += ["---", "", "## 🐛 Issue Log", ""]
    
    # ── Individual Issues ─────────────────────────────────────────────
    for i, c in enumerate(sorted_comments, 1):
        sev = c.get("severity")
        sev_badge = f"{SEVERITY_EMOJI.get(sev, '⚪')} {SEVERITY_LABEL.get(sev, 'Unclassified')}"
        status_badge = "✅ Resolved" if c.get("status") == "resolved" else "🔓 Open"
        cat_label = CATEGORY_LABEL.get(c.get("category"), "Uncategorized")
        selector = c.get("component_selector") or "unknown"
        ai_summary = c.get("ai_summary") or c.get("text", "")[:60]
        suggested_fix = c.get("suggested_fix", "")
        tester = c.get("tester_name", "Anonymous")
        
        ts = c.get("created_at", "")
        if ts:
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                ts = dt.strftime("%b %d, %Y %H:%M UTC")
            except Exception:
                pass
                
        position = f"X: {c.get('x', 0):.1f}% / Y: {c.get('y', 0):.1f}%"
        score = c.get("selector_score")
        score_label = f"(stability: {score}/100)" if score else ""
        
        lines += [
            f"### Issue #{i} — {ai_summary}",
            f"",
            f"| Field | Value |",
            f"|-------|-------|",
            f"| **Severity** | {sev_badge} |",
            f"| **Category** | {cat_label} |",
            f"| **Status** | {status_badge} |",
            f"| **Component** | `{selector}` {score_label} |",
            f"| **Position** | {position} |",
            f"| **Tester** | {tester} |",
            f"| **Reported** | {ts} |",
            f"",
            f"**Feedback:**",
            f"> {c.get('text', '')}",
            f"",
        ]
        
        if suggested_fix:
            lines += [
                f"**💡 Suggested Fix:**",
                f"> {suggested_fix}",
                f"",
            ]
            
        if c.get("screenshot_url") and c["screenshot_url"].startswith("data:image"):
            # We don't embed base64 directly as it breaks markdown readability,
            # but we show it's available.
            lines += [
                f"**📸 Screenshot:**",
                f"Available in visual audit viewport.",
                f"",
            ]
            
        lines.append("---")
        lines.append("")
        
    # ── Footer ────────────────────────────────────────────────────────
    lines += [
        "## ✅ Recommended Action Plan",
        "",
        "Address issues in this order for maximum impact:",
        "",
    ]
    
    priority_issues = [c for c in sorted_comments if c.get("severity") in ("P0", "P1") and c.get("status") != "resolved"]
    if priority_issues:
        for j, c in enumerate(priority_issues[:5], 1):
            fix = c.get("suggested_fix", "Review and fix this component")
            lines.append(f"{j}. **[{c.get('severity')}]** `{c.get('component_selector', 'unknown')}` — {fix}")
    else:
        lines.append("_No P0/P1 issues remaining. Good work! 🎉_")
        
    lines += [
        "",
        "---",
        f"*Generated by [PixelMark OS](https://pixelmark.dev) · {now}*",
    ]
    
    return "\n".join(lines)
