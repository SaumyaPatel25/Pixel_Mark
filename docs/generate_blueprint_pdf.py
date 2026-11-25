import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' 
    and maintain clean, executive running headers and footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Don't draw headers/footers on page 1 (Executive Cover)
        if self._pageNumber > 1:
            # Header line
            self.drawString(54, letter[1] - 36, "STAGE 2.0 | Next-Gen AI Architecture & Product Blueprint")
            self.drawRightString(letter[0] - 54, letter[1] - 36, "Strategic & Confidential")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)
            
            # Footer line
            self.line(54, 45, letter[0] - 54, 45)
            self.drawString(54, 32, "STAGE: The Autonomous Website Review & Realtime Collaboration Engine")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(letter[0] - 54, 32, page_text)
            
        self.restoreState()

def build_pdf(filename="docs/STAGE_NextGen_AI_Architecture_and_Features.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    # 54pt = 0.75 in margins
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=50,
        rightMargin=50,
        topMargin=48,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Palette
    PRIMARY = colors.HexColor("#0F172A")        # Dark Slate
    ACCENT = colors.HexColor("#4F46E5")         # Indigo
    ACCENT_LIGHT = colors.HexColor("#F5F3FF")   # Tinted Indigo
    SUCCESS = colors.HexColor("#059669")        # Emerald
    SUCCESS_LIGHT = colors.HexColor("#ECFDF5")  # Soft Emerald
    MUTED = colors.HexColor("#334155")          # Readable Slate
    CARD_BG = colors.HexColor("#F8FAFC")        # Soft Light Grey
    BORDER_COLOR = colors.HexColor("#CBD5E1")   # Slate border
    HIGHLIGHT_BORDER = colors.HexColor("#818CF8")

    # Typography
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=ACCENT,
        spaceAfter=14
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=ACCENT,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=MUTED,
        spaceAfter=6
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=PRIMARY
    )
    
    success_style = ParagraphStyle(
        'BodySuccess',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=SUCCESS
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=body_style,
        fontSize=8.5,
        leading=12,
        textColor=PRIMARY
    )

    story = []

    # =========================================================================
    # PAGE 1: EXECUTIVE OVERVIEW & TOURNAMENT SYNTHESIS
    # =========================================================================
    story.append(Paragraph("STAGE 2.0: NEXT-GEN AI ARCHITECTURE & PRODUCT BLUEPRINT", title_style))
    story.append(Paragraph("Competitive Synthesis via 100-Strategy Arena Elimination Tournament | Top 1% SaaS Product & Systems Design", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=0, spaceAfter=10))
    
    # Executive Metadata Table
    meta_data = [
        [
            Paragraph("<b>Target Audience:</b> Digital Agencies, Dev Teams & Clients", body_style),
            Paragraph("<b>AI Model Cost:</b> $0.00 Base via Omni-Route + BYOK Vault", body_style),
        ],
        [
            Paragraph("<b>Client Interaction:</b> Voice/Chat-to-DOM with Instant Crop", body_style),
            Paragraph("<b>Developer Bridge:</b> Native AI IDE / MCP (Cursor, Windsurf, VS Code)", body_style),
        ]
    ]
    t_meta = Table(meta_data, colWidths=[255, 255])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Executive Vision & Strategic Paradigm Shift", h1_style))
    story.append(Paragraph(
        "Current visual feedback tools (Marker.io, BugHerd, Jam.dev) operate as <b>passive digital sticky notes</b>. "
        "The client manually clicks a pixel, types a vague description, and the developer receives an unstructured ticket lacking code context. "
        "This broken feedback loop creates endless Slack back-and-forth, delayed client approvals, and lost agency billables.<br/><br/>"
        "<b>STAGE 2.0 redefines this entire market:</b> transforming the review canvas into an <b>active, autonomous co-pilot</b>. "
        "Clients can speak or type in plain language to see immediate visual adjustments right on their live staging site. "
        "Simultaneously, developers receive exact CSS/Tailwind diffs, console logs, and automated pull requests directly inside their native AI IDEs (Cursor, Windsurf, Claude Code). "
        "Best of all, this is achieved with <b>zero platform AI inference cost</b> via an intelligent Omni-Route and Bring-Your-Own-Key (BYOK) architecture.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("The 4 Core Architectural Pillars", h1_style))
    pillars_data = [
        [
            Paragraph("<b>1. Conversational DOM Quick-Edit</b><br/>Clients speak or chat; STAGE mutates the live staging DOM locally and crops the exact element screenshot in 10ms.", body_style),
            Paragraph("<b>2. Autonomous Audit & Inspo Engine</b><br/>AI analyzes site structure and crawls top-tier reference sites (Stripe, Linear) to generate visual suggestions and auto-pinned markers.", body_style)
        ],
        [
            Paragraph("<b>3. Native AI IDE Bridge (MCP Server)</b><br/>Developers query open pins and generate code fixes directly inside Cursor, Windsurf, or VS Code without leaving their editor.", body_style),
            Paragraph("<b>4. Zero-Cost Omni-Route & BYOK</b><br/>Free Groq Llama 3.3, Groq Whisper, and Gemini Flash routing combined with encrypted user API key vaults.", body_style)
        ]
    ]
    t_pillars = Table(pillars_data, colWidths=[255, 255])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ACCENT_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, HIGHLIGHT_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_pillars)
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: THE ARENA 100-STRATEGY TOURNAMENT & NON-OVERLOAD DOM SYSTEM
    # =========================================================================
    story.append(Paragraph("1. The Arena Tournament Methodology (100 Elimination Rounds)", h1_style))
    story.append(Paragraph(
        "Using the open-source <b>Arena Skill methodology</b> (multi-agent competitive tournament), we simulated "
        "<b>100 distinct architectural and product strategies</b> across 5 rigorous elimination rounds to extract the absolute peak configuration for STAGE 2.0:",
        body_style
    ))

    arena_stages = [
        [
            Paragraph("<b>Tournament Round</b>", body_bold),
            Paragraph("<b>Flawed Approaches Eliminated</b>", body_bold),
            Paragraph("<b>Winning Champion Principles</b>", body_bold)
        ],
        [
            Paragraph("<b>Round 1 (100 &rarr; 32)</b><br/>Token Overhead & Client Usability", body_style),
            Paragraph("&bull; Sending entire 2MB DOM trees to LLMs.<br/>&bull; Requiring chrome extensions for clients.<br/>&bull; Complex multi-field ticket forms.", body_style),
            Paragraph("<b>Micro-DOM Bounding Boxes:</b> Extract only visible element snippets (&lt;2KB). Zero-install web canvas with voice memo triggers.", success_style)
        ],
        [
            Paragraph("<b>Round 2 (32 &rarr; 16)</b><br/>Developer Ergonomics & Context", body_style),
            Paragraph("&bull; Forcing devs into another web dashboard.<br/>&bull; Subjective bug tickets without code lines.<br/>&bull; Static screenshots without console logs.", body_style),
            Paragraph("<b>IDE-Native Flow via MCP:</b> Devs query and fix bugs directly inside Cursor, Windsurf, or VS Code. Auto-generated Git PRs.", success_style)
        ],
        [
            Paragraph("<b>Round 3 (16 &rarr; 8)</b><br/>Zero-Cost Economics & Resilience", body_style),
            Paragraph("&bull; Hard-locking to expensive $0.05/call APIs.<br/>&bull; Server-side headless browser screenshot queues.<br/>&bull; Single point of API downtime.", body_style),
            Paragraph("<b>Omni-Route + BYOK Architecture:</b> 100% free default tier (Groq Whisper, Llama 3.3, Gemini Flash) with client/dev custom API key vaults.", success_style)
        ],
        [
            Paragraph("<b>Finals (8 &rarr; 4 &rarr; 1)</b><br/>DOM Proxy Safety & Auto-Audit", body_style),
            Paragraph("&bull; Breaking client sites with unsandboxed CSS.<br/>&bull; Generic chatbot advice detached from visual layout.", body_style),
            Paragraph("<b>Ephemeral CSS Staging + Autonomous Reference Inspo Engine:</b> Instant local crop, before/after ghost slider, auto-placed audit pins.", success_style)
        ]
    ]
    t_arena = Table(arena_stages, colWidths=[120, 195, 195])
    t_arena.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_arena)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2. Merging the DOM System on Canvas Without System Overload", h1_style))
    story.append(Paragraph(
        "<b>The Technical Risk:</b> Serializing full HTML over WebSockets or running full-page MutationObservers freezes low-end client laptops and floods the backend. "
        "STAGE solves this through an <b>Ephemeral Micro-DOM Bounding Box Protocol</b> implemented in <code>stage-agent.js</code>:",
        body_style
    ))

    dom_features = [
        "<b>1. Scoped Bounding-Box Extraction:</b> When the client speaks or clicks, STAGE only serializes the target element and its immediate 1-level parent/children (&lt;2KB payload), completely ignoring unseen background DOM trees.",
        "<b>2. Ephemeral In-Memory CSS Injection:</b> Style changes (color, padding, typography) are previewed locally via an isolated <code>&lt;style id='stage-ephemeral-staging'&gt;</code> tag in the proxy iframe. The client's production code is never touched.",
        "<b>3. Client-Side High-Speed Canvas Cropping:</b> Using native browser <code>createImageBitmap</code>, STAGE crops the element's exact bounding box locally in 10ms. No expensive server-side Puppeteer instances needed!",
        "<b>4. The 'Client Confirmation Gate':</b> The client is shown a compact pill: <i>'Reviewing edit: Change CTA to Emerald. [Confirm & Pin] [Undo]'</i>. Pins are only persisted once approved, preventing noisy accidental markers."
    ]
    for df in dom_features:
        story.append(Paragraph(f"&bull; {df}", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: TOP 5 CLIENT-SIDE CHAMPION FEATURES
    # =========================================================================
    story.append(Paragraph("3. Top 5 Client-Side Champion Features", h1_style))
    story.append(Paragraph(
        "Clients want maximum convenience and zero technical jargon. These 5 features remove every barrier between client thought and actionable feedback:",
        body_style
    ))

    c_cards = [
        [
            Paragraph("<b>1. Voice & Chat-to-DOM Quick-Editor with Instant Element Crop</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> The client clicks the microphone icon or types in a floating pill: <i>'Make the pricing headline punchier and change the primary button to emerald green'</i>.<br/>"
                "<b>The Automation:</b> STAGE locates the element, applies the visual styling locally on the live site, auto-crops a crystal-clear screenshot of the element, and asks: <i>'I updated the preview. Look good?'</i>.<br/>"
                "<b>The Confirmation Handshake:</b> The client clicks <b>Confirm & Pin</b>. Only then is the feedback committed, notifying the developer with zero guesswork.",
                body_style
            )
        ],
        [
            Paragraph("<b>2. Autonomous Website Audit & Reference-Inspo Engine</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> The client clicks <i>'Audit My Site with AI'</i> or supplies an inspirational reference URL (e.g. <i>'Make my hero feel like Stripe or Linear'</i>).<br/>"
                "<b>The Automation:</b> AI scans the live website hierarchy, analyzes contrast ratios, typography scale, and conversion friction, comparing it against the reference benchmark.<br/>"
                "<b>The Output:</b> It automatically drops 5 to 8 interactive suggestion pins across the page with ready-made visual mockup cards and human-friendly recommendations.",
                body_style
            )
        ],
        [
            Paragraph("<b>3. The Ghost Comparison Slider (Before vs. AI Proposed Redesign)</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> When AI suggests visual improvements (e.g. spacing, hierarchy, button contrast), a split-screen slider appears directly on top of the live website.<br/>"
                "<b>The Benefit:</b> The client can drag the slider left and right to see their current site vs. the proposed AI upgrade in realtime before committing a single pin.",
                body_style
            )
        ],
        [
            Paragraph("<b>4. Guest Magic-Links with Zero-Login Collaboration</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> Agencies send one secure link (e.g. <code>stage.entrext.com/review/acme?token=xyz</code>).<br/>"
                "<b>The Benefit:</b> Clients enter their name and start speaking or typing feedback immediately. No passwords, no signup barriers, no email confirmations required.",
                body_style
            )
        ],
        [
            Paragraph("<b>5. Smart Copy & Layout Guardrails (Safe Text Editing)</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> Clients can click any copy to edit text inline. STAGE's AI checks character lengths and warns if new text will break the mobile layout or push CTA buttons below the fold.",
                body_style
            )
        ]
    ]

    t_c_cards = Table(c_cards, colWidths=[510])
    t_c_cards.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_c_cards)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: TOP 5 DEVELOPER-SIDE CHAMPION FEATURES
    # =========================================================================
    story.append(Paragraph("4. Top 5 Developer-Side Champion Features", h1_style))
    story.append(Paragraph(
        "Developers dread vague feedback. They require exact DOM selectors, reproduction logs, clean code diffs, and the freedom to work inside their preferred AI editor:",
        body_style
    ))

    d_cards = [
        [
            Paragraph("<b>1. Native AI IDE Bridge via STAGE MCP Server (Cursor, Windsurf, Claude Code, VS Code)</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> Developers configure STAGE's Model Context Protocol (MCP) server once in their IDE.<br/>"
                "<b>In-IDE Commands:</b> The dev simply asks their editor: <i>'@stage show me open pins on the hero section'</i> or <i>'@stage apply pin #14 to src/components/Hero.tsx'</i>.<br/>"
                "<b>The Dev Superpower:</b> The developer never leaves their code editor. STAGE feeds the client's screenshot, selector, and CSS diff straight into the IDE AI, which writes the code locally!",
                body_style
            )
        ],
        [
            Paragraph("<b>2. Auto-Generated Git Pull Requests & Tailwind / CSS Diffs</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> For every client-confirmed pin or visual change, STAGE computes the exact CSS or Tailwind delta.<br/>"
                "<b>1-Click Action:</b> Devs click <i>'Create GitHub PR'</i>. STAGE branches off main, generates clean commits with before/after screenshots attached, and opens a review-ready PR.",
                body_style
            )
        ],
        [
            Paragraph("<b>3. Full DevTools Black-Box Telemetry (Console, Network & Environment)</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> When a client submits feedback or an error occurs, STAGE automatically snapshots the last 30 console logs, failed network requests (4xx/5xx), OS, viewport, and scroll offset.<br/>"
                "<b>Eliminates:</b> Zero back-and-forth asking <i>'Which browser were you on?'</i> or <i>'Can you inspect element?'</i>.",
                body_style
            )
        ],
        [
            Paragraph("<b>4. Playwright & Cypress Automated Regression Test Generator</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> For functional feedback (e.g. <i>'Clicking submit does nothing'</i>), STAGE generates a ready-to-run Playwright test script.<br/>"
                "<b>The Dev Benefit:</b> Devs run <code>npx playwright test</code> to reproduce and verify the fix locally before pushing to staging.",
                body_style
            )
        ],
        [
            Paragraph("<b>5. Bi-Directional Sync with Linear, Jira, & GitHub Issues</b>", h2_style),
            Paragraph(
                "<b>How it works:</b> Pins automatically sync to Linear or Jira with screenshot cards. When the dev merges the PR or closes the ticket, STAGE automatically marks the pin as resolved and notifies the client.",
                body_style
            )
        ]
    ]

    t_d_cards = Table(d_cards, colWidths=[510])
    t_d_cards.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_d_cards)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: ZERO-COST OMNI-ROUTE & DESIGN ENGINE
    # =========================================================================
    story.append(Paragraph("5. Zero-Cost AI Omni-Route & BYOK Vault Architecture", h1_style))
    story.append(Paragraph(
        "A major failure point of AI SaaS platforms is uncontrollable token costs that scale linearly with users. "
        "STAGE utilizes a <b>Zero-Cost Hierarchical Omni-Route</b> with fallback to <b>Bring Your Own Key (BYOK)</b>:",
        body_style
    ))

    omni_data = [
        [
            Paragraph("<b>Tier / Role</b>", body_bold),
            Paragraph("<b>Provider & Model</b>", body_bold),
            Paragraph("<b>Cost to Platform</b>", body_bold),
            Paragraph("<b>Function in STAGE</b>", body_bold)
        ],
        [
            Paragraph("<b>Free Omni Tier 1</b><br/>Voice Transcription", body_style),
            Paragraph("Groq Whisper Large v3", body_style),
            Paragraph("<b>$0.00 (Free Tier)</b>", success_style),
            Paragraph("Sub-second transcription of client voice memos directly on canvas.", body_style)
        ],
        [
            Paragraph("<b>Free Omni Tier 2</b><br/>DOM Analysis & Extraction", body_style),
            Paragraph("Groq Llama 3.3 70B Versatile", body_style),
            Paragraph("<b>$0.00 (Free Quota)</b>", success_style),
            Paragraph("Parses micro-DOM snippets, identifies selectors, and crafts CSS diffs.", body_style)
        ],
        [
            Paragraph("<b>Free Omni Tier 3</b><br/>Site Audit & Visual Search", body_style),
            Paragraph("Google Gemini 2.0 Flash (Free API)", body_style),
            Paragraph("<b>$0.00 (15 RPM Free)</b>", success_style),
            Paragraph("Scans page architecture, performs internet benchmark research, and audits UX.", body_style)
        ],
        [
            Paragraph("<b>User BYOK Vault</b><br/>Client & Dev Custom Keys", body_style),
            Paragraph("OpenAI / Anthropic Claude / DeepSeek / Custom OpenRouter", body_style),
            Paragraph("<b>$0.00 (Billed to User)</b>", success_style),
            Paragraph("Users can input their own keys in Workspace Settings. Stored with AES-256-GCM encryption.", body_style)
        ]
    ]

    t_omni = Table(omni_data, colWidths=[110, 130, 95, 175])
    t_omni.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_omni)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Design-Heavy UI/UX Skills Engine", h1_style))
    story.append(Paragraph(
        "When the AI scans a client website, it evaluates the visual layout against elite design heuristics before suggesting any changes:",
        body_style
    ))

    design_points = [
        "<b>1. Color Contrast & WCAG AA/AAA Compliance:</b> Automatically flags unreadable text overlays and computes the nearest accessible hex code.",
        "<b>2. Spacing Rhythm & Visual Hierarchy:</b> Detects inconsistent padding, broken 8pt grids, and unaligned container margins.",
        "<b>3. Conversion Optimization (CRO) Heuristics:</b> Identifies buried CTAs, excessive form fields, and low-contrast buy buttons, benchmarking against high-performing SaaS layouts.",
        "<b>4. Reference Asset Alignment:</b> Ingests brand styleguides or inspiration links (Stripe, Apple, Linear) and recommends typography pairings, border radii, and drop shadows."
    ]
    for dp in design_points:
        story.append(Paragraph(f"&bull; {dp}", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: IMPLEMENTATION ROADMAP & STRATEGIC SUMMARY
    # =========================================================================
    story.append(Paragraph("6. Phased Implementation Roadmap", h1_style))
    
    roadmap_data = [
        [
            Paragraph("<b>Phase</b>", body_bold),
            Paragraph("<b>Deliverables & Technical Scope</b>", body_bold),
            Paragraph("<b>Impact & Strategic Value</b>", body_bold)
        ],
        [
            Paragraph("<b>Phase 1: Quick Wins</b><br/>(1-2 Weeks)", body_style),
            Paragraph("&bull; Client Voice/Chat-to-DOM Quick Editor.<br/>&bull; Local browser bounding-box screenshot cropping.<br/>&bull; BYOK Key Vault + Groq Free Omni-Route.", body_style),
            Paragraph("<b>10x Faster Feedback:</b> Clients speak instead of typing; zero API bill for the platform.", body_style)
        ],
        [
            Paragraph("<b>Phase 2: IDE & Dev Bridge</b><br/>(2-3 Weeks)", body_style),
            Paragraph("&bull; <code>stage-mcp</code> server for Cursor, Windsurf, & VS Code.<br/>&bull; 1-Click Git PR & Tailwind Diff generator.<br/>&bull; Console & Network telemetry snapshotting.", body_style),
            Paragraph("<b>Developer Retention:</b> Devs fix client bugs without ever leaving their editor.", body_style)
        ],
        [
            Paragraph("<b>Phase 3: Autonomous AI</b><br/>(3-4 Weeks)", body_style),
            Paragraph("&bull; Autonomous Website UX & Conversion Audit.<br/>&bull; Reference Benchmark Crawler (e.g. Stripe, Linear).<br/>&bull; Ghost comparison split-screen slider.", body_style),
            Paragraph("<b>Market Moat:</b> STAGE shifts from passive bug tracker to an active AI design co-pilot.", body_style)
        ]
    ]
    t_road = Table(roadmap_data, colWidths=[120, 240, 150])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_road)
    story.append(Spacer(1, 14))

    # Executive Summary Callout Box
    callout_data = [[
        Paragraph(
            "<b>The Bottom Line:</b> By empowering non-technical clients to speak their intent and see immediate visual DOM adjustments, "
            "while giving developers exact Git pull requests and a direct Cursor/Windsurf MCP pipeline, STAGE bridges the single most expensive "
            "communication gap in modern web development. Operating on a zero-cost Omni-Route with BYOK security, STAGE delivers a world-class "
            "SaaS experience that scales sustainably with infinite margins.",
            callout_style
        )
    ]]
    t_call = Table(callout_data, colWidths=[510])
    t_call.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), SUCCESS_LIGHT),
        ('BOX', (0,0), (-1,-1), 1.5, SUCCESS),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_call)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated executive PDF at: {filename}")

if __name__ == "__main__":
    build_pdf()
