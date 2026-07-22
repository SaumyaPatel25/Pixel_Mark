export interface PresetItem {
  id: string
  name: string
  category: 'Typography' | 'Buttons' | 'Cards' | 'Sections' | 'Media'
  iconName: string
  previewText: string
  htmlTemplate: string
}

export const PRESET_LIBRARY: PresetItem[] = [
  // 1. Typography
  {
    id: 'preset_gradient_heading',
    name: 'Gradient Hero Heading',
    category: 'Typography',
    iconName: 'Type',
    previewText: 'High-impact 48px gradient title with cyan/purple glow',
    htmlTemplate: `<h1 style="font-size:44px; font-weight:800; background: linear-gradient(135deg, #38bdf8 0%, #c084fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0 0 16px 0; line-height: 1.15;">Accelerate Product Delivery</h1>`
  },
  {
    id: 'preset_section_subheading',
    name: 'Subheading Excerpt',
    category: 'Typography',
    iconName: 'AlignLeft',
    previewText: 'Clean 18px text block for section descriptions',
    htmlTemplate: `<p style="font-size: 18px; color: #94a3b8; line-height: 1.6; max-width: 600px; margin: 0 0 24px 0;">Build, test, and ship visual QA workflows directly inside your browser with real-time DOM feedback.</p>`
  },

  // 2. Buttons
  {
    id: 'preset_primary_button',
    name: 'Glow CTA Button',
    category: 'Buttons',
    iconName: 'MousePointerClick',
    previewText: 'Cyan primary button with hover glow & shadow',
    htmlTemplate: `<button style="background-color: #06b6d4; color: #090d16; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 10px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px -5px rgba(6, 182, 212, 0.4);"><span>Get Started Free</span> →</button>`
  },
  {
    id: 'preset_secondary_button',
    name: 'Glass Outline Button',
    category: 'Buttons',
    iconName: 'Square',
    previewText: 'Dark frosted glass secondary button',
    htmlTemplate: `<button style="background: rgba(255,255,255,0.05); color: #f8fafc; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; backdrop-filter: blur(12px);">View Documentation</button>`
  },

  // 3. Cards
  {
    id: 'preset_feature_card',
    name: 'Dark Feature Card',
    category: 'Cards',
    iconName: 'LayoutCard',
    previewText: 'Card with icon badge, title, and body copy',
    htmlTemplate: `<div style="background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; font-family: sans-serif;"><div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(6,182,212,0.15); color: #06b6d4; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; margin-bottom: 16px;">⚡</div><h3 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0;">Instant QA Overlay</h3><p style="font-size: 14px; color: #94a3b8; margin: 0; line-height: 1.5;">Pin visual markers and tweak styles on live pages without modifying source code.</p></div>`
  },
  {
    id: 'preset_testimonial_card',
    name: 'User Review Quote',
    category: 'Cards',
    iconName: 'Quote',
    previewText: 'Quote testimonial card with avatar placeholder',
    htmlTemplate: `<div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(192,132,252,0.2); border-radius: 16px; padding: 24px;"><p style="font-size: 15px; font-style: italic; color: #cbd5e1; margin: 0 0 16px 0;">"STAGE transformed how our engineering team reviews staging deployments."</p><div style="display: flex; align-items: center; gap: 12px;"><div style="width: 36px; height: 36px; border-radius: 50%; background: #38bdf8;"></div><div><div style="font-size: 13px; font-weight: 700; color: #ffffff;">Alex Rivera</div><div style="font-size: 11px; color: #64748b;">Lead QA Engineer</div></div></div></div>`
  },

  // 4. Sections
  {
    id: 'preset_cta_banner',
    name: 'Gradient CTA Banner',
    category: 'Sections',
    iconName: 'Sparkles',
    previewText: 'Full width callout section with heading & button',
    htmlTemplate: `<section style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%); border: 1px solid rgba(99,102,241,0.3); border-radius: 20px; padding: 48px 32px; text-align: center;"><h2 style="font-size: 32px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">Ready to streamline your QA?</h2><p style="font-size: 16px; color: #a5b4fc; margin: 0 0 24px 0;">Join over 5,000 developers building better web experiences.</p><button style="background: #06b6d4; color: #000; font-weight: 700; padding: 14px 28px; border-radius: 12px; border: none; cursor: pointer;">Start Free Trial</button></section>`
  },
  {
    id: 'preset_two_col_section',
    name: 'Two Column Split Section',
    category: 'Sections',
    iconName: 'Columns',
    previewText: 'Side-by-side text content & graphic panel',
    htmlTemplate: `<div style="display: flex; gap: 32px; align-items: center; padding: 32px; background: #0b101d; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);"><div style="flex: 1;"><h3 style="font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 12px 0;">Automated visual regression</h3><p style="font-size: 14px; color: #94a3b8; margin: 0;">Compare side-by-side snapshots to detect layout shifts and typography regressions before release.</p></div><div style="flex: 1; height: 180px; background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(168,85,247,0.1)); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 13px;">[ Preview Asset ]</div></div>`
  },

  // 5. Media
  {
    id: 'preset_hero_image',
    name: 'App Screenshot Mockup',
    category: 'Media',
    iconName: 'Image',
    previewText: 'Framed image container with cyan glow shadow',
    htmlTemplate: `<div style="width: 100%; height: 260px; background: #0f172a; border-radius: 16px; border: 1px solid rgba(6,182,212,0.3); overflow: hidden; box-shadow: 0 20px 50px -10px rgba(6,182,212,0.2); display: flex; flex-direction: column;"><div style="height: 28px; background: #090d16; border-b: 1px solid rgba(255,255,255,0.08); display: flex; items-center; gap: 6px; padding: 0 12px;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div><div style="width: 8px; height: 8px; border-radius: 50%; background: #eab308;"></div><div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></div></div><div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 14px; font-weight: 600;">[ Interactive App Preview ]</div></div>`
  }
]
