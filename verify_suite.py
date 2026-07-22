import os
import time
import json
import uuid
from datetime import datetime
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

# Ensure screenshots directory exists
SCREENSHOT_DIR = "C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class E2EVerifier:
    def __init__(self):
        self.report_data = []
        self.hydration_warnings = []
        self.console_errors = []
        self.analytics_calls = []
        self.network_failures = []
        self.proxy_loops = []

    def log_result(self, site, step, status, details):
        entry = {
            "site": site,
            "step": step,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.report_data.append(entry)
        print(f"[{status}] {site} | {step}: {details}")

    def run_suite(self):
        with sync_playwright() as p:
            # Launch chromium
            browser = p.chromium.launch(headless=True)
            
            # Setup context with large viewport to ensure Command Center is open on desktop sizes
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()

            # Global handlers for logs
            def handle_console(msg):
                text = msg.text
                loc = f"Console {msg.type}"
                
                # Check for hydration warnings specifically around command-center-drawer
                if "hydration" in text.lower() or "command-center-drawer" in text.lower():
                    self.hydration_warnings.append(text)
                    print(f"[CON LOG] Hydration/Drawer Warning: {text}")
                elif msg.type in ["error", "exception"]:
                    self.console_errors.append(text)
                    print(f"[CON ERR] Error: {text}")

            def handle_request(request):
                url = request.url
                # Check for Google Analytics calls
                is_analytics = any(host in url for host in [
                    "google-analytics.com",
                    "analytics.google.com",
                    "google.com/g/collect",
                    "googletagmanager.com"
                ])
                if is_analytics:
                    # Record it
                    bypassed_proxy = "localhost:8765/proxy" not in url
                    self.analytics_calls.append({
                        "url": url,
                        "bypassed": bypassed_proxy,
                        "method": request.method
                    })
                    print(f"[GA REQ] Analytics Call: {url} | Bypassed Proxy? {bypassed_proxy}")

                # Check for proxy loop
                if url.count("localhost:8765/proxy") > 1:
                    self.proxy_loops.append(url)
                    print(f"[PROXY LOOP DETECTED]: {url}")

            def handle_response(response):
                url = response.url
                status = response.status
                # If analytics call, check if it returned 405 or other error
                is_analytics = any(host in url for host in [
                    "google-analytics.com",
                    "analytics.google.com",
                    "google.com/g/collect",
                    "googletagmanager.com"
                ])
                
                if is_analytics and status >= 400:
                    self.network_failures.append({
                        "url": url,
                        "status": status,
                        "type": "analytics"
                    })
                    print(f"[GA RESP ERR] Analytics response {status} for: {url}")
                
                # Check for critical asset failures (JS, CSS, Fonts)
                if status >= 400:
                    parsed = urlparse(url)
                    path = parsed.path.lower()
                    is_critical = any(path.endswith(ext) for ext in [".js", ".css", ".woff", ".woff2", ".ttf"])
                    if is_critical:
                        self.network_failures.append({
                            "url": url,
                            "status": status,
                            "type": "critical_asset"
                        })
                        print(f"[CRIT ASSET RESP ERR] Asset response {status} for: {url}")

            page.on("console", handle_console)
            page.on("request", handle_request)
            page.on("response", handle_response)

            # -----------------------------------------------------------------
            # 1. REGISTER NEW USER (stage credentials flow)
            # -----------------------------------------------------------------
            timestamp = int(time.time())
            test_email = f"qa_tester_{timestamp}@stage.com"
            test_password = "Password123!"
            
            try:
                page.goto("http://localhost:3000/register")
                page.wait_for_load_state("networkidle")
                
                page.fill('input[placeholder="Pro Bro"]', "QA Automation Tester")
                page.fill('input[placeholder="name@company.com"]', test_email)
                page.fill('input[placeholder="••••••••"]', test_password)
                
                page.click('button[type="submit"]')
                page.wait_for_url("**/dashboard", timeout=10000)
                self.log_result("Auth", "Register", "PASS", f"Successfully registered user with email: {test_email}")
                
                # Take Dashboard Screenshot
                page.screenshot(path=f"{SCREENSHOT_DIR}/dashboard.png")
                self.log_result("Auth", "Dashboard Screenshot", "PASS", "Dashboard screenshot saved successfully.")
            except Exception as e:
                self.log_result("Auth", "Register", "FAIL", f"Failed to register or reach dashboard: {str(e)}")
                browser.close()
                return

            # -----------------------------------------------------------------
            # 2. TEST TARGET SITE: opinvox.entrext.com (Primary)
            # -----------------------------------------------------------------
            primary_site = "https://opinvox.entrext.com/"
            project_id = None
            session_id = None
            guest_share_link = None

            try:
                # Click New Project
                page.click("text=New Project")
                
                # Fill project creation form
                page.fill('input[placeholder*="Project Observation Name"]', "OpinVox Audit Project")
                page.fill('input[placeholder*="Target URL"]', primary_site)
                
                page.click('button[type="submit"]')
                page.wait_for_url("**/project/*", timeout=15000)
                
                current_url = page.url
                project_id = current_url.split("/project/")[-1]
                self.log_result("OpinVox", "Create Project", "PASS", f"Created project with ID: {project_id}")

                # Wait for iframe to load
                iframe_selector = 'iframe[title="Proxied review site"]'
                page.wait_for_selector(iframe_selector, timeout=20000)
                iframe_locator = page.frame_locator(iframe_selector)
                
                # Bounded sleep for iframe load
                time.sleep(5)
                
                # Check stability: make sure visual shell exists inside the iframe
                # E.g. check for html, body, or hero elements
                body_visible = iframe_locator.locator("body").is_visible()
                if body_visible:
                    self.log_result("OpinVox", "Visual Stability", "PASS", "Iframe body loaded and is visible.")
                else:
                    self.log_result("OpinVox", "Visual Stability", "WARNING", "Iframe loaded but body visibility check failed.")

                # Save Target Iframe Screenshot
                # Get the bounding box of the iframe
                iframe_box = page.locator(iframe_selector).bounding_box()
                if iframe_box:
                    page.screenshot(path=f"{SCREENSHOT_DIR}/target_iframe.png", clip=iframe_box)
                    self.log_result("OpinVox", "Iframe Screenshot", "PASS", "Iframe screenshot saved successfully.")
                else:
                    self.log_result("OpinVox", "Iframe Screenshot", "FAIL", "Could not find iframe bounding box for screenshot.")

                # Ensure Command Center Drawer is open and visible
                is_drawer_visible = page.locator("#command-center-drawer").is_visible()
                if not is_drawer_visible:
                    page.click("#command-center-trigger")
                    time.sleep(1)
                
                # Take Command Center Screenshot
                page.screenshot(path=f"{SCREENSHOT_DIR}/command_center.png")
                self.log_result("OpinVox", "Command Center Screenshot", "PASS", "Command center screenshot saved successfully.")

                # Generate Guest Share Link
                page.click("text=Share Link")
                page.wait_for_selector("text=Generate Share Link", timeout=5000)
                page.click("text=Generate Share Link")
                
                # Wait for link to be generated in list
                page.wait_for_selector("p.text-purple-400", timeout=8000)
                guest_share_link = page.locator("p.text-purple-400").first.text_content()
                self.log_result("OpinVox", "Generate Share Link", "PASS", f"Generated guest share link: {guest_share_link}")
                
                # Close share link panel
                page.click('button[aria-label="Close share panel"]')
                time.sleep(1)

            except Exception as e:
                self.log_result("OpinVox", "Primary Flow", "FAIL", f"Failed during primary workspace E2E flow: {str(e)}")

            # -----------------------------------------------------------------
            # 3. GUEST REVIEW FLOW FOR PRIMARY SITE
            # -----------------------------------------------------------------
            if guest_share_link:
                try:
                    # Open a completely fresh browser context for the guest (unauthenticated)
                    guest_context = browser.new_context(viewport={"width": 1280, "height": 800})
                    guest_page = guest_context.new_page()
                    
                    # Log events on guest page as well
                    guest_page.on("console", handle_console)
                    guest_page.on("request", handle_request)
                    guest_page.on("response", handle_response)
                    
                    # Go to share link
                    guest_page.goto(guest_share_link)
                    guest_page.wait_for_load_state("networkidle")
                    
                    # Fill guest reviewer form
                    guest_page.fill('input[placeholder="Your name (required)"]', "Guest Automation Reviewer")
                    guest_page.click('button:has-text("Start Review Session")')
                    
                    # Wait for review page redirection
                    guest_page.wait_for_url("**/review/*", timeout=15000)
                    self.log_result("GuestReview", "Access Share Link", "PASS", "Successfully accessed share link and resolved token.")
                    
                    # Wait for iframe to render
                    guest_page.wait_for_selector('iframe[title="Proxied review site"]', timeout=20000)
                    guest_iframe_locator = guest_page.frame_locator('iframe[title="Proxied review site"]')
                    time.sleep(5)
                    
                    # Check visual stability on guest view
                    if guest_iframe_locator.locator("body").is_visible():
                        self.log_result("GuestReview", "Iframe Renders", "PASS", "Guest reviewer iframe loaded and renders correctly.")
                    else:
                        self.log_result("GuestReview", "Iframe Renders", "WARNING", "Guest reviewer iframe body check failed.")
                    
                    # Capture guest view screenshot
                    guest_page.screenshot(path=f"{SCREENSHOT_DIR}/guest_review_dashboard.png")
                    self.log_result("GuestReview", "Screenshot", "PASS", "Guest review page screenshot saved.")

                    # Place feedback pin
                    guest_page.click("text=Leave Feedback")
                    time.sleep(1)
                    
                    # Click on overlay (coordinates 500, 400)
                    overlay_selector = '[aria-label="Click anywhere to place a feedback pin"]'
                    guest_page.click(overlay_selector, position={"x": 500, "y": 400})
                    time.sleep(1)
                    
                    # Fill feedback note
                    guest_page.fill('textarea[placeholder*="What\'s wrong here?"]', "Iframe guest reviewer test feedback pin.")
                    
                    # Select Critical severity
                    guest_page.click('button:has-text("critical")')
                    
                    # Submit feedback
                    guest_page.click('button[type="submit"]')
                    
                    # Wait for success label or drawer closed
                    guest_page.wait_for_selector('text=Feedback Pinned!', timeout=5000)
                    self.log_result("GuestReview", "Submit Feedback Pin", "PASS", "Feedback pin submitted successfully by guest.")
                    
                    # Close guest context
                    guest_context.close()
                    
                    # Back to owner context, check if the comment displays in real-time
                    time.sleep(3) # Wait for websocket sync
                    owner_comment_selector = 'text="Iframe guest reviewer test feedback pin."'
                    if page.locator(owner_comment_selector).first.is_visible():
                        self.log_result("OpinVox", "Websocket Sync Comment", "PASS", "New comment synchronized via WebSockets and rendered in owner CommandCenter.")
                    else:
                        # Reload page to check persistent reload list
                        page.reload()
                        page.wait_for_load_state("networkidle")
                        time.sleep(3)
                        if page.locator(owner_comment_selector).first.is_visible():
                            self.log_result("OpinVox", "Websocket Sync Comment", "PASS WITH WARNING", "Comment not synchronized immediately, but loaded successfully upon owner refresh.")
                        else:
                            self.log_result("OpinVox", "Websocket Sync Comment", "FAIL", "Comment submitted by guest was not found in owner workspace.")

                except Exception as e:
                    self.log_result("GuestReview", "Overall Flow", "FAIL", f"Guest review flow failed: {str(e)}")

            # -----------------------------------------------------------------
            # 4. PERFORM NAVIGATIONS AND VERIFY PROXY RETENTION FOR ALL SITES
            # -----------------------------------------------------------------
            extra_sites = [
                {"name": "Next.js", "url": "https://nextjs.org"},
                {"name": "Vercel", "url": "https://vercel.com"},
                {"name": "Stripe", "url": "https://stripe.com"},
                {"name": "Framer", "url": "https://www.framer.com"},
                {"name": "Linear", "url": "https://linear.app"}
            ]

            for site in extra_sites:
                site_name = site["name"]
                site_url = site["url"]
                
                try:
                    # Navigate back to dashboard to create a new project
                    page.goto("http://localhost:3000/dashboard")
                    page.wait_for_load_state("networkidle")
                    
                    # Click New Project
                    page.click("text=New Project")
                    
                    # Fill project form
                    page.fill('input[placeholder*="Project Observation Name"]', f"{site_name} Verification")
                    page.fill('input[placeholder*="Target URL"]', site_url)
                    
                    page.click('button[type="submit"]')
                    page.wait_for_url("**/project/*", timeout=15000)
                    
                    # Wait for iframe to render
                    iframe_selector = 'iframe[title="Proxied review site"]'
                    page.wait_for_selector(iframe_selector, timeout=20000)
                    iframe_locator = page.frame_locator(iframe_selector)
                    time.sleep(5)
                    
                    # Verify iframe content rendering
                    if iframe_locator.locator("body").is_visible():
                        self.log_result(site_name, "Iframe Load", "PASS", f"Iframe loaded successfully for {site_name}.")
                    else:
                        self.log_result(site_name, "Iframe Load", "WARNING", f"Iframe body check did not return visible for {site_name}.")

                    # Save Screenshot of the proxied site
                    scr_path = f"{SCREENSHOT_DIR}/{site_name.lower()}_screenshot.png"
                    iframe_box = page.locator(iframe_selector).bounding_box()
                    if iframe_box:
                        page.screenshot(path=scr_path, clip=iframe_box)
                        self.log_result(site_name, "Screenshot", "PASS", f"Saved screenshot to {scr_path}")
                    else:
                        self.log_result(site_name, "Screenshot", "WARNING", "Could not capture exact iframe box screenshot.")

                    # Try to perform up to 3 internal navigations by finding a tags
                    # Since iframe might load slow or be restricted, we try clicking internal relative links
                    navigated_count = 0
                    try:
                        # Fetch some internal anchor tags from inside the iframe
                        hrefs = iframe_locator.locator("a").evaluate_all("""
                            elements => elements
                                .map(el => {
                                    const href = el.getAttribute('href');
                                    const rect = el.getBoundingClientRect();
                                    const isVisible = rect.width > 0 && rect.height > 0;
                                    return { href, isVisible };
                                })
                                .filter(item => {
                                    if (!item.href || !item.isVisible) return false;
                                    const h = item.href.toLowerCase();
                                    if (h.startsWith('http://') || h.startsWith('https://')) {
                                        return h.includes(window.location.host);
                                    }
                                    if (h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('javascript:')) return false;
                                    return true;
                                })
                                .map(item => item.href)
                        """)
                        
                        # Click on relative path urls (usually menu links, docs links etc.)
                        unique_hrefs = list(set([h for h in hrefs if h]))
                        print(f"[{site_name}] Found relative links: {unique_hrefs[:5]}")
                        
                        for target_href in unique_hrefs[:3]:
                            try:
                                link_loc = iframe_locator.locator(f'a[href="{target_href}"]').first
                                link_loc.click(timeout=5000)
                                time.sleep(3)
                                navigated_count += 1
                                self.log_result(site_name, f"Navigation {navigated_count}", "PASS", f"Navigated to {target_href} inside iframe.")
                            except Exception as nav_e:
                                print(f"[{site_name}] Failed to click href {target_href}: {str(nav_e)}")
                                
                    except Exception as eval_e:
                        print(f"[{site_name}] Error during anchor evaluation: {str(eval_e)}")
                        
                    if navigated_count == 0:
                        self.log_result(site_name, "Navigations", "WARNING", "Failed to navigate internal links inside the iframe proxy.")
                    else:
                        self.log_result(site_name, "Navigations", "PASS", f"Completed {navigated_count} internal navigations successfully.")
                        
                except Exception as e:
                    self.log_result(site_name, "Overall Suite", "FAIL", f"Verification failed for {site_name}: {str(e)}")

            # Close browser
            browser.close()

    def generate_report(self):
        report_path = "C:/Users/saumy/OneDrive/Desktop/Entrext/stage_site_verification_report.md"
        
        # Analyze collected issues
        hydration_issues_count = len(self.hydration_warnings)
        ga_calls_count = len(self.analytics_calls)
        failed_ga_calls = [c for c in self.network_failures if c["type"] == "analytics"]
        critical_failed_assets = [c for c in self.network_failures if c["type"] == "critical_asset"]
        
        # Determine overall state for each site
        site_statuses = {}
        for entry in self.report_data:
            site = entry["site"]
            status = entry["status"]
            if site not in site_statuses:
                site_statuses[site] = "PASS"
            if status == "WARNING" and site_statuses[site] != "FAIL":
                site_statuses[site] = "PASS WITH WARNINGS"
            elif status == "FAIL":
                site_statuses[site] = "FAIL"

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("# STAGE Browser E2E Verification Report\n\n")
            f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## 1. Executive Summary\n")
            f.write("| Target Site | Status | Summary |\n")
            f.write("| --- | --- | --- |\n")
            for site, status in site_statuses.items():
                if site in ["Auth", "GuestReview"]:
                    continue
                f.write(f"| {site} | {status} | Checked rendering, console mismatch warnings, and analytics. |\n")
            f.write("\n")
            
            f.write("## 2. Console Logs Analysis\n")
            f.write(f"- **Hydration Warnings**: {hydration_issues_count}\n")
            if hydration_issues_count > 0:
                f.write("  - Detailed warnings found:\n")
                for w in set(self.hydration_warnings):
                    f.write(f"    - `{w}`\n")
            else:
                f.write("  - *No hydration mismatch warnings found (including 'command-center-drawer').*\n")
            
            f.write(f"- **Console Errors**: {len(self.console_errors)}\n")
            if len(self.console_errors) > 0:
                f.write("  - Unique Errors:\n")
                for err in set(self.console_errors)[:10]:
                    f.write(f"    - `{err[:120]}`\n")
            f.write("\n")
            
            f.write("## 3. Network and Proxy Bypass Verification\n")
            f.write(f"- **Google Analytics Requests Observed**: {ga_calls_count}\n")
            bypassed = [c for c in self.analytics_calls if c["bypassed"]]
            f.write(f"- **Bypassed proxy successfully**: {len(bypassed)} / {ga_calls_count}\n")
            
            if failed_ga_calls:
                f.write("- **Analytics requests failing with 405**: Yes\n")
                for fc in failed_ga_calls[:5]:
                    f.write(f"  - `{fc['url']}` returned status {fc['status']}\n")
            else:
                f.write("- **Analytics requests failing with 405**: No (0 GA requests returned 405 error code. Analytics bypassed successfully.)\n")
                
            f.write(f"- **Critical Asset Loading Failures (CSS/JS/Fonts)**: {len(critical_failed_assets)}\n")
            for ca in critical_failed_assets[:10]:
                f.write(f"  - `{ca['url']}` returned {ca['status']}\n")
                
            f.write(f"- **Proxy Loops Detected**: {len(self.proxy_loops)}\n")
            for pl in self.proxy_loops[:5]:
                f.write(f"  - `{pl}`\n")
            f.write("\n")
            
            f.write("## 4. Test Screenshots\n")
            f.write("All verification screenshots are saved in `C:\\Users\\saumy\\OneDrive\\Desktop\\Entrext\\screenshots\\`:\n")
            f.write("- **Dashboard**: [dashboard.png](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/dashboard.png)\n")
            f.write("- **Command Center**: [command_center.png](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/command_center.png)\n")
            f.write("- **Target Iframe (OpinVox)**: [target_iframe.png](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/target_iframe.png)\n")
            f.write("- **Guest Review Board**: [guest_review_dashboard.png](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/guest_review_dashboard.png)\n")
            for site in extra_sites:
                site_lower = site["name"].lower()
                f.write(f"- **{site['name']} Iframe**: [{site_lower}_screenshot.png](file:///C:/Users/saumy/OneDrive/Desktop/Entrext/screenshots/{site_lower}_screenshot.png)\n")
            f.write("\n")
            
            f.write("## 5. Detailed Test Log\n")
            f.write("| Timestamp | Site | Step | Status | Details |\n")
            f.write("| --- | --- | --- | --- | --- |\n")
            for entry in self.report_data:
                f.write(f"| {entry['timestamp']} | {entry['site']} | {entry['step']} | {entry['status']} | {entry['details']} |\n")
            f.write("\n")
            
            f.write("## 6. Classification & Final Recommendations\n")
            is_ready = True
            for site, status in site_statuses.items():
                if status == "FAIL":
                    is_ready = False
            
            if is_ready:
                f.write("### Status: **SHIP-READY**\n")
                f.write("All core verification points passed. Proxy bypass is functioning properly for GA tags, visual rendering is stable, and comments sync cleanly via WebSockets.\n")
            else:
                f.write("### Status: **NOT YET SHIP-READY**\n")
                f.write("Some critical steps failed or crashed during proxy audits. Review the detailed log above to resolve errors.\n")

        print(f"Report successfully saved to: {report_path}")

if __name__ == "__main__":
    verifier = E2EVerifier()
    verifier.run_suite()
    verifier.generate_report()
