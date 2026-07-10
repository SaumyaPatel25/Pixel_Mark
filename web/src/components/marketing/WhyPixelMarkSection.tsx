'use client';

import { motion } from 'framer-motion';
import { Shield, Radio, Users, Link2, Zap, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function WhyPixelMarkSection() {
  const objections = [
    {
      icon: Shield,
      title: "Is it secure?",
      description: "Absolutely. All review sessions run in isolated sandboxes. We never leak credentials, cookies, or internal API keys to third parties.",
      tag: "Enterprise Grade"
    },
    {
      icon: Radio,
      title: "Does it support live pages?",
      description: "Yes, it works instantly on staging, local development ports, and public production URLs—rendering the exact live browser state.",
      tag: "Live Proxy Tech"
    },
    {
      icon: Users,
      title: "How do clients collaborate?",
      description: "Zero friction. Send a secure review link. Stakeholders pin feedback and add annotations directly on their mobile or desktop browser without registering.",
      tag: "Zero-Setup for Clients"
    },
    {
      icon: Link2,
      title: "Do clients need extensions?",
      description: "Never. PixelMark is extension-free. Clients drop feedback on raw browser elements dynamically—no Chrome extension installations required.",
      tag: "100% Extension-Free"
    },
    {
      icon: Zap,
      title: "Is it easy to start?",
      description: "Create your first pin in 3 seconds. Just paste your website URL to launch the sandbox instantly and share review links immediately.",
      tag: "Instant Time-to-Value"
    }
  ];

  return (
    <section id="why-pixelmark" className="relative py-36 bg-transparent overflow-hidden border-t border-pm-border/30">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] bg-[#E2F3F5]/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#C7B4D6]/10 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl space-y-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80] bg-[#253B80]/5 px-3 py-1 rounded-full border border-[#253B80]/10">
              WHY PIXELMARK
            </span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-[4rem] font-extrabold tracking-[-0.03em] text-[#1D264F] leading-[1.02]">
              Engineered for trust. <br />
              Built for speed.
            </h2>
            <p className="text-sm md:text-base text-pm-muted leading-relaxed max-w-xl font-sans pt-2">
              No chrome extension walls. No screenshotted bug reports. We handle staging proxies, CSS selectors, and multi-device viewports out of the box.
            </p>
          </div>
          
          <div className="flex flex-col items-start gap-2 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#253B80] hover:bg-[#1B2C60] text-white rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              Get Started Free
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Responsive Objections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {objections.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="p-6 md:p-8 rounded-[24px] border border-pm-border/60 bg-white/70 backdrop-blur-md hover:border-[#253B80]/30 hover:shadow-[0_20px_40px_-15px_rgba(37,59,128,0.04)] transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#E2F3F5] flex items-center justify-center text-[#253B80]">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight text-[#1D264F]">
                  {item.title}
                </h3>
                <p className="text-xs text-pm-muted leading-relaxed font-sans">
                  {item.description}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-pm-border/20 flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold text-[#253B80] uppercase tracking-wider">
                  {item.tag}
                </span>
                <span className="text-[10px] text-pm-text-faint font-semibold">✓ Verified</span>
              </div>
            </motion.div>
          ))}
          
          {/* Static CTA card to balance grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 md:p-8 rounded-[24px] border border-[#253B80]/10 bg-gradient-to-br from-[#253B80] to-[#1D264F] text-white flex flex-col justify-between min-h-[250px]"
          >
            <div className="space-y-3">
              <span className="text-[9px] font-mono font-bold text-[#E2F3F5] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">
                NO FRICTION
              </span>
              <h3 className="font-display text-2xl font-extrabold tracking-tight text-white leading-tight">
                Ready to accelerate website reviews?
              </h3>
              <p className="text-xs text-[#E2F3F5]/80 leading-relaxed font-sans">
                Launch a sandbox session now and invite your clients instantly. No credit card required.
              </p>
            </div>
            <Link
              href="/register"
              className="mt-6 w-full py-3.5 bg-white hover:bg-[#FAF2F2] text-[#253B80] rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-colors text-center cursor-pointer block"
            >
              Start Project In 3 Seconds →
            </Link>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
