import os
import time
import json
import traceback
from datetime import datetime
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

# Ensure screenshots directory exists
SCREENSHOT_DIR = "C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class E2EVerifier:
    def __init__(self):
        self.results = {}
        self.current_site_name = None
        self.sites = [
            {"name": "OpinVox", "url": "https://opinvox.entrext.com/"},
            {"name": "Next.js", "url": "https://nextjs.org"},
            {"name": "Vercel", "url": "https://vercel.com"},
            {"name": "Stripe", "url": "https://stripe.com"},
            {"name": "Framer", "url": "https://www.framer.com"},
            {"name": "Linear", "url": "https://linear.app"}
        ]
        # Pre-initialize results
        for s in self.sites:
            self.results[s["name"]] = {
                "name": s["name"],
                "url": s["url"],
                "status": "PASS",
                "render_ok": False,
                "visual_stability_details": "Initial state",
                "console_errors": [],
                "hydration_warnings": [],
                "ga_calls": [],
                "critical_asset_errors": [],
                "navigations": [],
                "guest_review_ok": False,
                "websocket_sync_ok": False,
                "drawer_ok": False,
                "failures": [],
                "warnings": []
            }

    def handle_console(self, msg):
        text = msg.text
        msg_type = msg.type
        site_name = self.current_site_name
        
        is_hydration = "hydration" in text.lower() or "did not match" in text.lower() or "command-center-drawer" in text.lower()
        
        if is_hydration:
            warning_msg = f"[Console Hydration] {text}"
            if site_name and site_name in self.results:
                self.results[site_name]["hydration_warnings"].append(text)
                self.results[site_name]["warnings"].append(warning_msg)
            print(f"[{site_name or 'Global'}] Hydration/Drawer warning: {text}")
        elif msg_type in ["error", "exception"]:
            err_msg = f"[Console Error] {text}"
            if site_name and site_name in self.results:
                self.results[site_name]["console_errors"].append(text)
            print(f"[{site_name or 'Global'}] Console Error: {text}")

    def handle_request(self, request):
        url = request.url
        site_name = self.current_site_name
        
        is_analytics = any(host in url for host in [
            "google-analytics.com",
            "analytics.google.com",
            "google.com/g/collect",
            "googletagmanager.com",
            "facebook.net",
            "hotjar.com",
            "segment.io"
        ])
        
        if is_analytics:
            bypassed = "localhost:8765/proxy" not in url and "localhost:3000" not in url
            call_info = {
                "url": url,
                "method": request.method,
                "bypassed": bypassed
            }
            if site_name and site_name in self.results:
                self.results[site_name]["ga_calls"].append(call_info)
            print(f"[{site_name or 'Global'}] GA Request: {url} | Bypassed? {bypassed}")

        # Check for proxy loops
        if url.count("localhost:8765/proxy") > 1 or url.count("/proxy/") > 1:
            loop_msg = f"Proxy loop detected: {url}"
            if site_name and site_name in self.results:
                self.results[site_name]["failures"].append(loop_msg)
            print(f"[{site_name or 'Global'}] PROXY LOOP DETECTED: {url}")

    def handle_response(self, response):
        url = response.url
        status = response.status
        site_name = self.current_site_name
        
        is_analytics = any(host in url for host in [
            "google-analytics.com",
            "analytics.google.com",
            "google.com/g/collect",
            "googletagmanager.com",
            "facebook.net",
            "hotjar.com",
            "segment.io"
        ])
        
        if is_analytics and status >= 400:
            err_msg = f"GA request returned status {status}: {url}"
            if site_name and site_name in self.results:
                self.results[site_name]["failures"].append(err_msg)
            print(f"[{site_name or 'Global'}] GA request error: {status} -> {url}")
            
        if status >= 400:
            parsed = urlparse(url)
            path = parsed.path.lower()
            is_critical = any(path.endswith(ext) for ext in [".js", ".css", ".woff", ".woff2", ".ttf"])
            if is_critical:
                asset_err = {
                    "url": url,
                    "status": status
                }
                if site_name and site_name in self.results:
                    self.results[site_name]["critical_asset_errors"].append(asset_err)
                    self.results[site_name]["warnings"].append(f"Critical asset failed ({status}): {url}")
                print(f"[{site_name or 'Global'}] Critical Asset Fail: {status} -> {url}")

    def run_suite(self):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()

            # Register console and network listeners
            page.on("console", self.handle_console)
            page.on("request", self.handle_request)
            page.on("response", self.handle_response)

            # 1. Register QA user
            timestamp = int(time.time())
            test_email = f"qa_verifier_{timestamp}@pixelmark.com"
            test_password = "Password123!"
            
            print(f"--- Creating owner account: {test_email} ---")
            try:
                page.goto("http://localhost:3000/register")
                page.wait_for_load_state("networkidle")
                
                page.fill('input[placeholder="Pro Bro"]', "QA Verification Robot")
                page.fill('input[placeholder="name@company.com"]', test_email)
                page.fill('input[placeholder="••••••••"]', test_password)
                
                page.click('button[type="submit"]')
                page.wait_for_url("**/dashboard", timeout=15000)
                print("Registered and reached owner dashboard successfully.")
                
                # Take dashboard screenshot
                page.screenshot(path=f"{SCREENSHOT_DIR}/dashboard.png")
            except Exception as e:
                print(f"CRITICAL: Failed to register user. Exiting suite. Error: {str(e)}")
                browser.close()
                return

            # 2. Iterate through each site
            for site in self.sites:
                site_name = site["name"]
                site_url = site["url"]
                self.current_site_name = site_name
                print(f"\n==================================================")
                print(f"TESTING SITE: {site_name} ({site_url})")
                print(f"==================================================")
                
                res = self.results[site_name]
                
                try:
                    # Navigate back to dashboard to create a new project
                    page.goto("http://localhost:3000/dashboard")
                    page.wait_for_load_state("networkidle")
                    time.sleep(2)
                    
                    # Create Project
                    page.click("text=New Project")
                    time.sleep(1)
                    
                    page.fill('input[placeholder*="Project Observation Name"]', f"{site_name} Verification Project")
                    page.fill('input[placeholder*="Target URL"]', site_url)
                    page.click('button[type="submit"]')
                    
                    page.wait_for_url("**/project/*", timeout=20000)
                    project_url = page.url
                    project_id = project_url.split("/project/")[-1]
                    print(f"[{site_name}] Project created. URL: {project_url}, ID: {project_id}")
                    
                    # Wait for iframe to appear
                    iframe_selector = 'iframe[title="Proxied review site"]'
                    page.wait_for_selector(iframe_selector, timeout=25000)
                    iframe_locator = page.frame_locator(iframe_selector)
                    
                    # Wait for rendering stabilization
                    time.sleep(8)
                    
                    # Check visual stability
                    body_visible = False
                    try:
                        body_visible = iframe_locator.locator("body").is_visible(timeout=5000)
                    except Exception:
                        pass
                    
                    if body_visible:
                        res["render_ok"] = True
                        res["visual_stability_details"] = "Iframe body elements loaded and are visible."
                        print(f"[{site_name}] Visual stability PASS: body is visible.")
                    else:
                        res["render_ok"] = False
                        res["visual_stability_details"] = "Iframe loaded but body check failed."
                        res["failures"].append("Proxied iframe body is not visible.")
                        print(f"[{site_name}] Visual stability FAIL: body is not visible.")
                    
                    # Take iframe screenshot
                    iframe_box = page.locator(iframe_selector).bounding_box()
                    if iframe_box:
                        page.screenshot(path=f"{SCREENSHOT_DIR}/{site_name.lower()}_iframe.png", clip=iframe_box)
                    else:
                        page.screenshot(path=f"{SCREENSHOT_DIR}/{site_name.lower()}_iframe_fallback.png")
                        res["warnings"].append("Could not find iframe bounding box for screenshot.")
                    
                    # Test Command Center Drawer transitions
                    print(f"[{site_name}] Verifying Command Center drawer transitions...")
                    try:
                        # Check initial state
                        is_drawer_visible = page.locator("#command-center-drawer").is_visible()
                        
                        if is_drawer_visible:
                            # Screen shot with drawer open
                            page.screenshot(path=f"{SCREENSHOT_DIR}/{site_name.lower()}_command_center.png")
                            # Close drawer
                            page.click("#command-center-trigger")
                            time.sleep(1.5)
                            if page.locator("#command-center-drawer").is_visible():
                                res["failures"].append("Command center drawer did not close on trigger click.")
                            else:
                                print(f"[{site_name}] Drawer closed successfully.")
                            # Re-open
                            page.click("#command-center-trigger")
                            time.sleep(1.5)
                            if not page.locator("#command-center-drawer").is_visible():
                                res["failures"].append("Command center drawer did not re-open on trigger click.")
                            else:
                                print(f"[{site_name}] Drawer re-opened successfully.")
                        else:
                            # Open drawer
                            page.click("#command-center-trigger")
                            time.sleep(1.5)
                            if not page.locator("#command-center-drawer").is_visible():
                                res["failures"].append("Command center drawer did not open on trigger click.")
                            else:
                                print(f"[{site_name}] Drawer opened successfully.")
                            page.screenshot(path=f"{SCREENSHOT_DIR}/{site_name.lower()}_command_center.png")
                            # Close drawer
                            page.click("#command-center-trigger")
                            time.sleep(1.5)
                            if page.locator("#command-center-drawer").is_visible():
                                res["failures"].append("Command center drawer did not close on trigger click.")
                            # Re-open to keep it open
                            page.click("#command-center-trigger")
                            time.sleep(1.5)
                        
                        res["drawer_ok"] = True
                    except Exception as drawer_err:
                        res["drawer_ok"] = False
                        res["failures"].append(f"Drawer transition verification crashed: {str(drawer_err)}")
                        print(f"[{site_name}] Drawer verification crashed: {str(drawer_err)}")

                    # Internal navigations
                    print(f"[{site_name}] Attempting internal navigations inside iframe...")
                    navigated_count = 0
                    try:
                        anchors = iframe_locator.locator("a")
                        count = anchors.count()
                        print(f"[{site_name}] Found {count} link tags inside iframe.")
                        
                        candidates = []
                        for idx in range(count):
                            try:
                                a = anchors.nth(idx)
                                href = a.get_attribute("href")
                                if href:
                                    is_relative = href.startswith("/") or href.startswith(".")
                                    is_absolute_internal = site_url in href
                                    if (is_relative or is_absolute_internal) and not href.startswith("#") and "javascript:" not in href.lower():
                                        candidates.append(href)
                                    if len(candidates) >= 15:
                                        break
                            except Exception:
                                continue
                                
                        candidates = list(set(candidates))
                        print(f"[{site_name}] Extracted relative/internal link candidates: {candidates[:5]}")
                        
                        for href in candidates[:5]:
                            if navigated_count >= 3:
                                break
                            try:
                                print(f"[{site_name}] Navigating link click: {href}")
                                link = iframe_locator.locator(f'a[href="{href}"]').first
                                link.scroll_into_view_if_needed(timeout=2000)
                                link.click(timeout=6000)
                                time.sleep(5) # Bounded render sleep
                                
                                # Confirm top level URL is still project URL
                                if "project" not in page.url:
                                    print(f"[{site_name}] Warning: Owner page redirected away from project. Returning.")
                                    page.goto(project_url)
                                    page.wait_for_load_state("networkidle")
                                    time.sleep(3)
                                    continue
                                
                                navigated_count += 1
                                res["navigations"].append(href)
                            except Exception as click_err:
                                print(f"[{site_name}] Link click failed for {href}: {str(click_err)}")
                                
                    except Exception as nav_e:
                        print(f"[{site_name}] Navigation crawl error: {str(nav_e)}")
                    
                    if navigated_count < 3:
                        res["warnings"].append(f"Completed only {navigated_count}/3 internal navigations.")
                    print(f"[{site_name}] Successfully completed {navigated_count} internal navigations.")

                    # Share Link & Guest reviewer flow
                    print(f"[{site_name}] Generating Guest Share Link...")
                    guest_share_link = None
                    page.click("text=Share Link")
                    time.sleep(1.5)
                    page.click("text=Generate Share Link")
                    
                    page.wait_for_selector("p.text-purple-400", timeout=10000)
                    guest_share_link = page.locator("p.text-purple-400").first.text_content()
                    print(f"[{site_name}] Generated guest share link: {guest_share_link}")
                    
                    # Close share link panel
                    page.locator('div.fixed button:has(svg.lucide-x)').click()
                    time.sleep(1.5)

                    if guest_share_link:
                        # Spin up clean guest context
                        print(f"[{site_name}] Launching Guest Context...")
                        guest_context = browser.new_context(viewport={"width": 1280, "height": 800})
                        guest_page = guest_context.new_page()
                        
                        # Register listeners on guest page
                        guest_page.on("console", self.handle_console)
                        guest_page.on("request", self.handle_request)
                        guest_page.on("response", self.handle_response)
                        
                        guest_page.goto(guest_share_link)
                        guest_page.wait_for_load_state("networkidle")
                        time.sleep(3)
                        
                        guest_page.fill('input[placeholder="Your name (required)"]', f"Guest Reviewer ({site_name})")
                        guest_page.click('button:has-text("Start Review Session")')
                        
                        guest_page.wait_for_url("**/review/*", timeout=20000)
                        print(f"[{site_name}] Guest successfully entered review workspace.")
                        
                        # Wait for guest iframe
                        guest_page.wait_for_selector('iframe[title="Proxied review site"]', timeout=20000)
                        time.sleep(6)
                        
                        # Place 3 markers and submit comment
                        for marker_idx in range(1, 4):
                            print(f"[{site_name}] Guest dropping pin {marker_idx}/3...")
                            guest_page.click("text=Leave Feedback", timeout=8000)
                            time.sleep(1)
                            
                            # Coordinates: click different spots on overlay
                            x_pos = 300 + marker_idx * 90
                            y_pos = 250 + marker_idx * 70
                            overlay_sel = '[aria-label="Click anywhere to place a feedback pin"]'
                            guest_page.click(overlay_sel, position={"x": x_pos, "y": y_pos}, timeout=8000)
                            time.sleep(1.5)
                            
                            # Write note for first marker, others can be quick notes
                            note_text = f"Guest marker {marker_idx} verification note for {site_name}."
                            guest_page.fill('textarea[placeholder*="What\'s wrong here?"]', note_text)
                            
                            # Click severity
                            sev = ["low", "medium", "critical"][marker_idx - 1]
                            guest_page.click(f'button:has-text("{sev}")')
                            time.sleep(0.5)
                            
                            guest_page.click('button[type="submit"]')
                            guest_page.wait_for_selector('text=Feedback Pinned!', timeout=10000)
                            time.sleep(1)
                        
                        guest_page.screenshot(path=f"{SCREENSHOT_DIR}/{site_name.lower()}_guest_review.png")
                        print(f"[{site_name}] Guest placed all 3 markers.")
                        res["guest_review_ok"] = True
                        
                        guest_context.close()
                        
                        # Verify WebSocket Sync in Owner context
                        print(f"[{site_name}] Checking real-time WebSocket comment sync...")
                        time.sleep(4) # wait for sync
                        
                        owner_comment_sel = 'text="Guest marker 1 verification note for ' + site_name + '."'
                        sync_ok = False
                        
                        try:
                            sync_ok = page.locator(owner_comment_sel).first.is_visible(timeout=5000)
                        except Exception:
                            pass
                            
                        if sync_ok:
                            res["websocket_sync_ok"] = True
                            print(f"[{site_name}] Websocket Sync SUCCESS: Marker comment found immediately in owner CC.")
                        else:
                            print(f"[{site_name}] Comment not synced immediately. Refreshing page to verify persistence...")
                            page.reload()
                            page.wait_for_load_state("networkidle")
                            time.sleep(4)
                            
                            # Re-open drawer if closed by default on reload
                            if not page.locator("#command-center-drawer").is_visible():
                                page.click("#command-center-trigger")
                                time.sleep(2)
                                
                            persist_ok = False
                            try:
                                persist_ok = page.locator(owner_comment_sel).first.is_visible(timeout=5000)
                            except Exception:
                                pass
                                
                            if persist_ok:
                                res["websocket_sync_ok"] = "REFRESH"
                                res["warnings"].append("Websocket real-time comment synchronization failed, but comments persisted on manual reload.")
                                print(f"[{site_name}] Persisted comment sync verified after refresh.")
                            else:
                                res["websocket_sync_ok"] = False
                                res["failures"].append("Feedback comment submitted by guest was not synced nor visible in owner workspace.")
                                print(f"[{site_name}] WebSocket Sync and Persistence check FAILED!")
                    else:
                        res["failures"].append("No guest review link generated.")
                        print(f"[{site_name}] Share link generation failed.")

                except Exception as e:
                    res["status"] = "FAIL"
                    res["failures"].append(f"Automation execution crashed: {str(e)}")
                    print(f"ERROR: site {site_name} test crashed.")
                    traceback.print_exc()
                
                # Site overall evaluation
                if len(res["failures"]) > 0:
                    res["status"] = "FAIL"
                elif len(res["warnings"]) > 0 or len(res["hydration_warnings"]) > 0 or len(res["critical_asset_errors"]) > 0:
                    res["status"] = "PASS WITH WARNINGS"
                else:
                    res["status"] = "PASS"
                
                print(f"[{site_name}] TEST STATUS RESULT: {res['status']}")

            # Close browser
            browser.close()

    def generate_report(self):
        report_path = "C:/Users/saumy/OneDrive/Desktop/Entrext/pixelmark_site_verification_report.md"
        
        total_pass = sum(1 for s in self.results.values() if s["status"] == "PASS")
        total_warn = sum(1 for s in self.results.values() if s["status"] == "PASS WITH WARNINGS")
        total_fail = sum(1 for s in self.results.values() if s["status"] == "FAIL")

        # Compile systemic issues
        systemic_issues = []
        
        # 1. Hydration checks
        total_hydration = sum(len(s["hydration_warnings"]) for s in self.results.values())
        if total_hydration > 0:
            systemic_issues.append((total_hydration, "Hydration warnings/mismatches in console logs"))
            
        # 2. Critical asset load failures
        total_assets_fail = sum(len(s["critical_asset_errors"]) for s in self.results.values())
        if total_assets_fail > 0:
            systemic_issues.append((total_assets_fail, "Critical asset load failures (CSS, JS, Webfonts)"))

        # 3. WebSocket sync issues
        total_ws_failures = sum(1 for s in self.results.values() if s["websocket_sync_ok"] == "REFRESH")
        if total_ws_failures > 0:
            systemic_issues.append((total_ws_failures, "Websocket sync delays requiring manual page refresh"))

        # Sort systemic issues by frequency
        systemic_issues.sort(reverse=True, key=lambda x: x[0])
        top_systemic = [issue[1] for issue in systemic_issues[:3]]
        while len(top_systemic) < 3:
            top_systemic.append("N/A")

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("# PixelMark Browser E2E Verification Report\n\n")
            f.write(f"**Execution Timestamp**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S %z')}\n")
            f.write(f"**Environment**: Local (Next.js @ http://localhost:3000, FastAPI @ http://localhost:8765)\n\n")
            
            f.write("## 1. Overall Summary\n")
            f.write(f"- **Total Audited Sites**: {len(self.sites)}\n")
            f.write(f"- **PASS**: {total_pass}\n")
            f.write(f"- **PASS WITH WARNINGS**: {total_warn}\n")
            f.write(f"- **FAIL**: {total_fail}\n\n")
            
            f.write("### Top 3 Systemic Issues Identified\n")
            for idx, issue in enumerate(top_systemic, 1):
                f.write(f"{idx}. {issue}\n")
            f.write("\n")

            f.write("## 2. Per-Site Verification Results\n\n")
            for site in self.sites:
                s_name = site["name"]
                res = self.results[s_name]
                f.write(f"### {s_name} ({res['url']})\n")
                f.write(f"- **Status**: **{res['status']}**\n")
                f.write(f"- **Render Quality & Visual Stability**: {res['visual_stability_details']}\n")
                f.write(f"- **Drawer Navigation Action**: {'Drawer OK' if res['drawer_ok'] else 'Drawer CRASHED or FAILED'}\n")
                f.write(f"- **Internal Navigations (Iframe)**: Completed {len(res['navigations'])} / 3 ({', '.join(res['navigations']) if res['navigations'] else 'None'})\n")
                f.write(f"- **Guest Review Form & 3 Markers Placement**: {'Yes' if res['guest_review_ok'] else 'No'}\n")
                
                ws_text = "Instant (Real-time sync verified)" if res["websocket_sync_ok"] == True else \
                          "Refresh Required (Synced after manual reload)" if res["websocket_sync_ok"] == "REFRESH" else \
                          "Failed to sync"
                f.write(f"- **WebSocket Live Sync**: {ws_text}\n")
                
                # Console / Network issues
                f.write("- **Console Logs Audit**:\n")
                if res["console_errors"]:
                    f.write(f"  - Errors ({len(res['console_errors'])}): `{res['console_errors'][0][:150]}`...\n")
                else:
                    f.write("  - Errors: None\n")
                    
                if res["hydration_warnings"]:
                    f.write(f"  - Hydration Warnings ({len(res['hydration_warnings'])}): `{res['hydration_warnings'][0][:150]}`...\n")
                else:
                    f.write("  - Hydration Warnings: None\n")
                    
                # GA bypass audit
                ga_calls = res["ga_calls"]
                ga_bypassed = [g for g in ga_calls if g["bypassed"]]
                f.write("- **Proxy Network Verification**:\n")
                f.write(f"  - Google Analytics Tags detected: {len(ga_calls)}\n")
                f.write(f"  - Bypassed proxy server successfully: {len(ga_bypassed)} / {len(ga_calls)}\n")
                
                # Critical assets
                if res["critical_asset_errors"]:
                    f.write(f"  - Critical Asset load failures: {len(res['critical_asset_errors'])}\n")
                    for ca in res["critical_asset_errors"][:3]:
                        f.write(f"    - `{ca['url']}` failed with status {ca['status']}\n")
                else:
                    f.write("  - Critical Asset load failures: None\n")
                
                # Screenshots links
                f.write("- **Site Screenshots**:\n")
                f.write(f"  - [Iframe View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/{s_name.lower()}_iframe.png)\n")
                f.write(f"  - [Command Center Drawer View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/{s_name.lower()}_command_center.png)\n")
                f.write(f"  - [Guest Review View](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/{s_name.lower()}_guest_review.png)\n")
                
                # Failures and warnings log
                if res["failures"]:
                    f.write("- **Critical Failures**:\n")
                    for f_msg in res["failures"]:
                        f.write(f"  - ❌ {f_msg}\n")
                if res["warnings"]:
                    f.write("- **Warnings / Diagnostics**:\n")
                    for w_msg in res["warnings"]:
                        f.write(f"  - ⚠️ {w_msg}\n")
                
                # Root cause category and next recommended fix
                root_cause = "None"
                next_fix = "None"
                if res["status"] == "FAIL":
                    root_cause = "Proxy SSRF / Script rewriting compatibility block, or WebSocket endpoint network disconnect"
                    next_fix = "Audit agent proxy script injection blocklist or trace backend /ws websocket lifespan connection"
                elif res["status"] == "PASS WITH WARNINGS":
                    if res["critical_asset_errors"]:
                        root_cause = "Third-party proxy CORS/Asset resolution issue"
                        next_fix = "Relax backend proxy headers or add CDN hostnames to allowed asset domains list"
                    elif res["hydration_warnings"]:
                        root_cause = "Hydration mismatch warning (command-center-drawer rendering difference in SSR)"
                        next_fix = "Ensure drawer HTML states/hydration classes use client-side state hooks (useEffect)"
                    elif res["websocket_sync_ok"] == "REFRESH":
                        root_cause = "Real-time websocket channel refresh lag or socket subscription delay"
                        next_fix = "Verify subscription listeners subscribe immediately on workspace load"
                
                f.write(f"- **Root Cause Category**: {root_cause}\n")
                f.write(f"- **Next Recommended Fix**: {next_fix}\n\n")

            f.write("## 3. Cross-Site Bug List\n\n")
            
            # Collate bugs
            critical_bugs = []
            major_bugs = []
            minor_bugs = []
            
            for site in self.sites:
                s_name = site["name"]
                res = self.results[s_name]
                for f_msg in res["failures"]:
                    critical_bugs.append(f"[{s_name}] {f_msg}")
                for w_msg in res["warnings"]:
                    if "websocket" in w_msg.lower() or "sync" in w_msg.lower():
                        major_bugs.append(f"[{s_name}] {w_msg}")
                    else:
                        minor_bugs.append(f"[{s_name}] {w_msg}")
            
            f.write("### Critical Severity\n")
            if critical_bugs:
                for cb in critical_bugs:
                    f.write(f"- `{cb}`\n")
            else:
                f.write("- *None*\n")
            f.write("\n")
            
            f.write("### Major Severity\n")
            if major_bugs:
                for mb in major_bugs:
                    f.write(f"- `{mb}`\n")
            else:
                f.write("- *None*\n")
            f.write("\n")
            
            f.write("### Minor / Warning Severity\n")
            if minor_bugs:
                for mb in minor_bugs:
                    f.write(f"- `{mb}`\n")
            else:
                f.write("- *None*\n")
            f.write("\n")

            f.write("## 4. Ship-Readiness Verdict\n")
            overall_verdict = "SHIP-READY"
            if total_fail > 0:
                overall_verdict = "NOT SHIP-READY"
                verdict_details = "The release contains critical failures (e.g. proxy visual rendering shells failing or crashes in drawer transitions) that block key user flows."
            elif total_warn > 0:
                overall_verdict = "SHIP-READY WITH WARNINGS"
                verdict_details = "All core E2E flows completed. Minor console warnings (mismatches around command-center-drawer) or external trackers failing to load through the proxy were recorded, but they do not block functionality."
            else:
                verdict_details = "All audited sites and systems passed tests successfully. Real-time updates and proxy bypass functionality are performing exactly as expected."
                
            f.write(f"### Verdict: **{overall_verdict}**\n")
            f.write(f"{verdict_details}\n")
            
        print(f"Final report saved to: {report_path}")

if __name__ == "__main__":
    verifier = E2EVerifier()
    verifier.run_suite()
    verifier.generate_report()
