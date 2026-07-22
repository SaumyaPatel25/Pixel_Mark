'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Send, 
  Shield, 
  FileText, 
  Lock, 
  HelpCircle, 
  ChevronDown, 
  Globe, 
  Briefcase, 
  Code, 
  TrendingUp,
  BookOpen
} from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

// Define Article interface for indexability
interface Article {
  title: string;
  category: string;
  readTime: string;
  summary: string;
}

export default function CompanyClient() {
  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: 'other',
    reason: '',
    message: ''
  });

  // FAQ State (Open/Close for UX, but HTML remains fully indexable)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const recipient = 'saumyavishwam@gmail.com';
    const subject = encodeURIComponent(`STAGE Inquiry - ${formData.name} (${formData.role})`);
    
    const bodyText = `Name: ${formData.name}
Email: ${formData.email}
Organization: ${formData.organization}
Interest Role: ${formData.role}
Reason for reaching out: ${formData.reason}

Message:
${formData.message}`;

    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  // Blog previews data - crawlable and SEO-rich
  const blogArticles: Article[] = [
    {
      title: 'Building Better Website Review Workflows for High-Velocity Teams',
      category: 'Workflow Design',
      readTime: '6 min read',
      summary: 'Why traditional screenshots and Slack threads fail during visual QA. We explore the structural impact of in-context website annotations and how precise link-sharing collapses iteration cycles.'
    },
    {
      title: 'The Silent Cost of Vague Feedback: Why Visual Precision Matters in Web Development',
      category: 'Productivity & QA',
      readTime: '5 min read',
      summary: 'Every "this button looks misaligned" without coordinates or viewport metadata consumes engineering hours. A case for precise, element-scoped feedback as the foundation of modern visual sign-offs.'
    },
    {
      title: 'How Collaborative QA Review Layers Accelerate Visual Approvals and Code Shipments',
      category: 'Engineering Culture',
      readTime: '8 min read',
      summary: 'Bridging the design-to-code gap. How creating secure client review links allows designers, product owners, and QA professionals to collaborate directly on the live DOM layer.'
    }
  ];

  // FAQ Items - Rich in search terms for SEO
  const faqItems = [
    {
      q: 'What is STAGE and how does it help website review?',
      a: 'STAGE is a visual website feedback and QA bug reporting platform. It allows users to create secure review sessions on live web pages where team members and clients can pin annotations, share mockups, and review website changes in real-time, drastically reducing visual iteration cycles.'
    },
    {
      q: 'How does the collaborative visual feedback layer work?',
      a: 'STAGE overlays a lightweight interaction layer over your target website. Reviewers can click directly on any element to leave comment pins. This visual feedback captures precise DOM coordinates, device details, and viewport sizes, presenting it inside a structured review session.'
    },
    {
      q: 'Can I use STAGE for client reviews and website sign-offs?',
      a: 'Yes, STAGE is built specifically for agencies, designers, and developer teams who need clear client approvals. You can generate secure, shareable client review links that do not require your clients to install extensions or log in to leave annotations.'
    }
  ];

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text selection:bg-purple-500/20 selection:text-[#253B80] overflow-x-hidden font-sans">
      {/* Navigation */}
      <MarketingNav />

      {/* Main Content Area */}
      <main className="pt-28 pb-12">
        
        {/* ================= SECTION 1: HERO ================= */}
        <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-widest text-[#253B80] bg-white/70 border border-pm-border px-3.5 py-1.5 rounded-full shadow-[0_2px_12px_-4px_rgba(41,54,129,0.04)]">
              Entrext Labs presents
            </span>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight text-[#1D264F] max-w-4xl mx-auto leading-[1.1]">
              About STAGE &amp; the Future of Visual Collaboration
            </h1>
            <p className="text-base md:text-lg text-pm-muted max-w-2xl mx-auto font-sans leading-relaxed">
              We build precise, lightweight tools that bridge the gap between design revisions and codebase deployment. Making website review simple, fast, and collaborative.
            </p>
          </motion.div>
        </section>

        {/* ================= SECTION 2: THE WELCOME CALLOUT BANNER ================= */}
        <section className="max-w-4xl mx-auto px-6 mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative bg-white border border-[#253B80]/15 rounded-3xl p-8 md:p-12 text-center overflow-hidden shadow-[0_16px_40px_-20px_rgba(37,59,128,0.06)]"
          >
            {/* Subtle glow background */}
            <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[#E2F3F5]/40 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-[180px] h-[180px] bg-[#C7B4D6]/30 rounded-full blur-[40px] pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Open Partnership</span>
              <blockquote className="font-display font-extrabold text-2xl md:text-3xl tracking-tight text-[#1D264F] max-w-2xl mx-auto leading-snug">
                “Builders, developers, and investors are all welcome.”
              </blockquote>
              <p className="text-xs font-mono font-medium text-pm-muted max-w-lg mx-auto leading-relaxed">
                Whether you are seeking custom integrations, wanting to contribute ideas, or aligned with our design philosophy, we invite you to connect.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ================= SECTION 3: STORY ================= */}
        <section id="story" className="max-w-5xl mx-auto px-6 py-16 border-t border-pm-border/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Origin Narrative</span>
              <h2 className="font-display font-extrabold text-3xl tracking-tight text-[#1D264F]">
                How STAGE Started
              </h2>
              <p className="text-xs text-pm-muted font-mono leading-relaxed">
                The journey from fragmented screenshots to a precise visual collaboration layer.
              </p>
            </div>
            
            <div className="lg:col-span-8 space-y-8 font-sans text-pm-muted leading-relaxed text-sm md:text-base">
              <p>
                Every team building for the web encounters the same friction: review feedback is inherently imprecise. A designer notices a structural misalignment; a QA tester spots a visual bug; a client wants a copy change. They take screenshots, draw red circles, write Slack descriptions, or open Jira tickets. 
              </p>
              <p className="border-l-2 border-[#253B80]/40 pl-6 my-6 italic text-[#1D264F] font-medium bg-[#253B80]/2 p-4 rounded-r-xl">
                "The core insight was simple: why capture static mockups when the feedback belongs directly on the live DOM of the web page?"
              </p>
              <p>
                STAGE was born to resolve this disconnect. Instead of static mockups or complex setup pipelines, STAGE lets product teams instantly launch a secure review session. Anyone can click, point, and leave a visual feedback pin directly on the live website. It captures element-level context, screen size, and system metadata automatically.
              </p>
              <p>
                Today, the platform is crafted and maintained by a **solo developer** focused on stability, layout safety, and visual speed. By removing organizational overhead, we ensure every update is designed with strict performance guidelines.
              </p>
              <p>
                Looking forward, our high-level vision is anchored in developing even cleaner review workflows, stronger team collaboration controls, and more reliable website review experiences—helping you get visual sign-offs at maximum speed.
              </p>
            </div>
          </div>
        </section>

        {/* ================= SECTION 4: COMPANY PHILOSOPHY ================= */}
        <section id="company" className="max-w-5xl mx-auto px-6 py-16 border-t border-pm-border/30">
          <div className="space-y-4 mb-12">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Platform Principles</span>
            <h2 className="font-display font-extrabold text-3xl tracking-tight text-[#1D264F]">
              The STAGE Philosophy
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-pm-border rounded-2xl p-6 space-y-4 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-[#E2F3F5] text-[#164448] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#1D264F]">Visual Precision</h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Feedback belongs exactly where it is observed. We focus on capturing exact coordinates, element selectors, and DOM layout information automatically.
              </p>
            </div>
            
            <div className="bg-white border border-pm-border rounded-2xl p-6 space-y-4 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-[#C7B4D6] text-[#8A75A4] flex items-center justify-center">
                <Code className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#1D264F]">Built for Developers</h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                We format feedback to be instantly actionable. Every pin provides details like viewport width, browser type, and custom QA reports, ready for staging fixes.
              </p>
            </div>
            
            <div className="bg-white border border-pm-border rounded-2xl p-6 space-y-4 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-[#FCE2E1] text-[#6E2522] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#1D264F]">Lightweight &amp; Fast</h3>
              <p className="text-xs text-pm-muted leading-relaxed">
                Review sessions should load instantly. We prevent bloating, avoiding bulky dependencies, to ensure visual review is the fastest step in your launch process.
              </p>
            </div>
          </div>
        </section>

        {/* ================= SECTION 5: BLOG (Featured Topics) ================= */}
        <section id="blog" className="max-w-5xl mx-auto px-6 py-16 border-t border-pm-border/30">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Featured Topics</span>
              <h2 className="font-display font-extrabold text-3xl tracking-tight text-[#1D264F]">
                Upcoming Editorial Articles
              </h2>
            </div>
            <a 
              href="https://entrextlabs.substack.com/subscribe" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#253B80] hover:underline"
            >
              Subscribe on Substack <BookOpen className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogArticles.map((article, idx) => (
              <article key={idx} className="flex flex-col justify-between p-6 bg-white border border-pm-border rounded-2xl hover:shadow-md transition-all duration-300 group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[9px] font-mono font-bold text-[#253B80] uppercase tracking-wider">
                    <span>{article.category}</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3 className="font-display font-extrabold text-base text-[#1D264F] leading-tight group-hover:text-purple-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-xs text-pm-muted leading-relaxed">
                    {article.summary}
                  </p>
                </div>
                <div className="pt-6">
                  <span className="text-[10px] font-mono font-bold text-pm-muted/60 uppercase tracking-wider select-none">
                    Preview Release Coming Soon
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ================= SECTION 6: OPPORTUNITIES & CAREERS ================= */}
        <section id="opportunities" className="max-w-5xl mx-auto px-6 py-16 border-t border-pm-border/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Opportunity Gateway</span>
              
              {/* Highlight opportunity banner first in this area */}
              <div className="bg-[#E2F3F5]/50 border border-[#253B80]/10 rounded-2xl p-6 space-y-3">
                <p className="font-display font-bold text-xl text-[#1D264F] leading-tight">
                  “Builders, developers, and investors are all welcome.”
                </p>
                <p className="text-xs text-pm-muted leading-relaxed">
                  We believe in organic, high-alignment conversations rather than corporate job openings.
                </p>
              </div>

              <h2 className="font-display font-extrabold text-3xl tracking-tight text-[#1D264F]">
                Careers at STAGE
              </h2>
              <p className="text-xs text-pm-muted leading-relaxed font-sans">
                We believe in strict focus, visual craftsmanship, and minimal team structures.
              </p>
            </div>

            <div className="lg:col-span-7 bg-white border border-pm-border rounded-3xl p-8 space-y-6">
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-[#1D264F]">Current Team Model</h3>
                <p className="text-xs text-pm-muted leading-relaxed font-sans">
                  STAGE is currently designed, built, and optimized by a **solo developer**. We focus heavily on keeping the development lifecycle efficient, the product lightweight, and features deeply validated.
                </p>
              </div>

              <div className="space-y-4 border-t border-pm-border/30 pt-6">
                <h3 className="font-display font-bold text-lg text-[#1D264F]">Engineering &amp; Design Roles</h3>
                <p className="text-xs text-pm-muted leading-relaxed font-sans">
                  At this moment, the platform **does not need more builders or active developers**. We are not hiring or building out a larger product team immediately. However, we keep our doors open for the right design or architectural discussions.
                </p>
              </div>

              <div className="space-y-4 border-t border-pm-border/30 pt-6">
                <h3 className="font-display font-bold text-lg text-[#1D264F]">Investor Relations</h3>
                <p className="text-xs text-pm-muted leading-relaxed font-sans">
                  We are open to connecting with aligned investors who understand developer tools, design feedback spaces, and premium software craftsmanship. If you share our long-term vision of visually reviewing website changes cleanly, we welcome a conversation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 7: LEGAL GATEWAY ================= */}
        <section id="legal" className="max-w-5xl mx-auto px-6 py-16 border-t border-pm-border/30">
          <div className="space-y-4 mb-12">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Compliance &amp; Governance</span>
            <h2 className="font-display font-extrabold text-3xl tracking-tight text-[#1D264F]">
              Legal Hub
            </h2>
            <p className="text-xs text-pm-muted max-w-xl leading-relaxed font-sans">
              Review scannable gateways to our terms and privacy protocols. Fully crawlable documents designed to align with modern browser security standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-pm-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FAF2F2] text-[#253B80]">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-[#1D264F]">Privacy Policy</h3>
              </div>
              <p className="text-xs text-pm-muted leading-relaxed">
                Outlining how we collect, map, and process user feedback pins, session credentials, and website metadata. We do not sell visual QA data and prioritize client review privacy.
              </p>
            </div>

            <div className="bg-white border border-pm-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FAF2F2] text-[#253B80]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-[#1D264F]">Terms of Service</h3>
              </div>
              <p className="text-xs text-pm-muted leading-relaxed">
                Defining your rights and responsibilities when generating review links, running visual review rooms, and integrating with target websites. Applies to standard, team, and organization workspaces.
              </p>
            </div>

            <div className="bg-white border border-pm-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FAF2F2] text-[#253B80]">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-[#1D264F]">CORS Scoping Agreement</h3>
              </div>
              <p className="text-xs text-pm-muted leading-relaxed">
                Providing technical outlines of how our proxy servers safely scope cross-origin resource sharing. Details how target sites permit feedback annotation layers without creating security vulnerabilities.
              </p>
            </div>

            <div className="bg-white border border-pm-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FAF2F2] text-[#253B80]">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-[#1D264F]">Security Disclosures</h3>
              </div>
              <p className="text-xs text-pm-muted leading-relaxed">
                Procedures for reporting vulnerabilities and descriptions of our active session shielding mechanisms, ensuring your live web code and proxy routing remain fully protected.
              </p>
            </div>
          </div>
        </section>

        {/* ================= SECTION 8: FAQ ================= */}
        <section id="faq" className="max-w-3xl mx-auto px-6 py-16 border-t border-pm-border/30">
          <div className="space-y-4 mb-12 text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Common Queries</span>
            <h2 className="font-display font-extrabold text-3xl tracking-tight text-[#1D264F]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4 font-sans">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className="bg-white border border-pm-border rounded-xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left font-display font-bold text-sm md:text-base text-[#1D264F] hover:bg-[#FAF2F2]/50 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown 
                      className={`w-4 h-4 text-pm-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {/* Keep content rendered in HTML for SEO indexation, control height/opacity with CSS */}
                  <div 
                    className={`transition-all duration-300 ease-in-out px-6 ${
                      isOpen ? 'max-h-[300px] py-4 border-t border-pm-border opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                  >
                    <p className="text-xs md:text-sm text-pm-muted leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= SECTION 9: CONTACT INTEREST FORM ================= */}
        <section id="contact" className="max-w-3xl mx-auto px-6 py-16 border-t border-pm-border/30">
          <div className="space-y-4 mb-10 text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">Inquire &amp; Connect</span>
            <h2 className="font-display font-extrabold text-3xl tracking-tight text-[#1D264F]">
              Connect with STAGE
            </h2>
            <p className="text-xs text-pm-muted leading-relaxed max-w-md mx-auto font-sans">
              Have questions, investment proposals, or feedback? Send us a message and it will compile into your mail application.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="bg-white border border-pm-border rounded-3xl p-8 md:p-10 space-y-6 shadow-[0_12px_30px_-16px_rgba(41,54,129,0.06)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="form-name" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">
                  Your Name
                </label>
                <input
                  id="form-name"
                  type="text"
                  required
                  placeholder="Saumya Patel"
                  className="w-full text-xs font-sans px-4 py-3 rounded-xl border border-pm-border bg-[#FCF5F5]/30 focus:outline-none focus:border-[#253B80]/40 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="form-email" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">
                  Email Address
                </label>
                <input
                  id="form-email"
                  type="email"
                  required
                  placeholder="name@organization.com"
                  className="w-full text-xs font-sans px-4 py-3 rounded-xl border border-pm-border bg-[#FCF5F5]/30 focus:outline-none focus:border-[#253B80]/40 transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="form-org" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">
                  Company / Organization
                </label>
                <input
                  id="form-org"
                  type="text"
                  required
                  placeholder="Entrext Labs"
                  className="w-full text-xs font-sans px-4 py-3 rounded-xl border border-pm-border bg-[#FCF5F5]/30 focus:outline-none focus:border-[#253B80]/40 transition-colors"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="form-role" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">
                  I am a
                </label>
                <div className="relative">
                  <select
                    id="form-role"
                    className="w-full text-xs font-sans px-4 py-3 rounded-xl border border-pm-border bg-white focus:outline-none focus:border-[#253B80]/40 appearance-none transition-colors"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="investor">Investor</option>
                    <option value="developer">Developer</option>
                    <option value="builder">Builder</option>
                    <option value="customer">Customer</option>
                    <option value="other">Other / Collaborator</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-pm-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="form-reason" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">
                Reason for Reaching Out
              </label>
              <input
                id="form-reason"
                type="text"
                required
                placeholder="Investment opportunity, custom integration, or feedback..."
                className="w-full text-xs font-sans px-4 py-3 rounded-xl border border-pm-border bg-[#FCF5F5]/30 focus:outline-none focus:border-[#253B80]/40 transition-colors"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="form-message" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80]">
                Your Message
              </label>
              <textarea
                id="form-message"
                required
                rows={4}
                placeholder="Provide details about your query here..."
                className="w-full text-xs font-sans px-4 py-3 rounded-xl border border-pm-border bg-[#FCF5F5]/30 focus:outline-none focus:border-[#253B80]/40 transition-colors resize-none"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full btn-primary-3d flex items-center justify-center gap-2 bg-[#253B80] hover:bg-[#1B2C60] text-white text-xs font-mono font-bold uppercase tracking-wider py-4 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Open Email Draft <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>

      </main>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
