import httpx
from typing import Optional

SEVERITY_TO_LABEL = {
    "P0": "critical",
    "P1": "bug",
    "P2": "enhancement",
    "P3": "documentation",
}

CATEGORY_TO_LABEL = {
    "visual_bug": "visual",
    "functional_bug": "bug",
    "ux_issue": "ux",
    "performance": "performance",
    "accessibility": "accessibility",
    "copy_error": "copy",
}

def build_issue_body(comment: dict, project: dict) -> str:
    """Builds a rich GitHub Issue body from an PixelMark comment"""
    lines = [
        f"## 🔬 PixelMark Feedback Report",
        f"",
        f"| Field | Value |",
        f"|-------|-------|",
        f"| **Severity** | `{comment.get('severity', 'Unclassified')}` |",
        f"| **Category** | `{comment.get('category', 'unknown')}` |",
        f"| **Component** | `{comment.get('component_selector', 'unknown')}` |",
        f"| **Page** | {comment.get('page_url', project.get('target_url', ''))} |",
        f"| **Tester** | {comment.get('tester_name', 'Anonymous')} |",
        f"| **Position** | X: {comment.get('x', 0):.1f}% / Y: {comment.get('y', 0):.1f}% |",
        f"",
        f"### Feedback",
        f"> {comment.get('text', '')}",
        f"",
    ]
    
    if comment.get("suggested_fix"):
        lines += [f"### 💡 Suggested Fix", f"> {comment['suggested_fix']}", f""]
        
    if comment.get("screenshot_url") and comment["screenshot_url"].startswith("data:image"):
        lines += [
            f"### 📸 Screenshot",
            f"<details><summary>View Screenshot</summary>",
            f"",
            f"![Screenshot]({comment['screenshot_url']})",
            f"",
            f"</details>",
            f"",
        ]
        
    lines += [
        "---",
        f"*Created by [PixelMark OS](https://pixelmark.dev) · Project: {project.get('name', '')}*"
    ]
    return "\n".join(lines)

async def push_to_github(
    comments: list[dict],
    project: dict,
    github_token: str,
    github_repo: str,  # format: "owner/repo"
) -> dict:
    """
    Creates GitHub Issues for every unresolved comment.
    Returns: { created: int, failed: int, urls: [issue_url, ...], errors: [...] }
    """
    results = {"created": 0, "failed": 0, "urls": [], "errors": []}
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    # Step 1: Ensure required labels exist in the repo
    labels_to_create = [
        {"name": "critical", "color": "d73a4a", "description": "P0 - App breaking"},
        {"name": "ux", "color": "e4e669", "description": "UX issue"},
        {"name": "visual", "color": "0075ca", "description": "Visual bug"},
        {"name": "accessibility", "color": "5319e7", "description": "Accessibility issue"},
        {"name": "performance", "color": "f9d0c4", "description": "Performance issue"},
        {"name": "copy", "color": "e4e669", "description": "Copy/text error"},
        {"name": "pixelmark", "color": "a855f7", "description": "Reported via PixelMark"},
    ]
    
    async with httpx.AsyncClient(timeout=15) as client:
        for label in labels_to_create:
            try:
                await client.post(
                    f"https://api.github.com/repos/{github_repo}/labels",
                    headers=headers,
                    json=label
                )
                # 422 = label already exists, that's fine
            except Exception:
                pass
                
        # Step 2: Create an issue for each comment
        for comment in comments:
            if comment.get("status") == "resolved":
                continue  # Skip already resolved issues
                
            ai_summary = comment.get("ai_summary") or comment.get("text", "")[:60]
            sev = comment.get("severity", "P3")
            title = f"[{sev}] {ai_summary}"
            
            issue_labels = ["pixelmark"]
            if sev in SEVERITY_TO_LABEL:
                issue_labels.append(SEVERITY_TO_LABEL[sev])
            cat = comment.get("category")
            if cat in CATEGORY_TO_LABEL:
                issue_labels.append(CATEGORY_TO_LABEL[cat])
                
            try:
                resp = await client.post(
                    f"https://api.github.com/repos/{github_repo}/issues",
                    headers=headers,
                    json={
                        "title": title,
                        "body": build_issue_body(comment, project),
                        "labels": issue_labels,
                    }
                )
                
                if resp.status_code == 201:
                    results["created"] += 1
                    results["urls"].append(resp.json().get("html_url"))
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Comment {comment['id'][:8]}: {resp.text[:100]}")
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(str(e)[:100])
                
    return results
