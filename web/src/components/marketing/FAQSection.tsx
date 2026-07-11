'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle, Mail } from 'lucide-react';
import { faqs } from '@/lib/faqData';

export default function FAQSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section id="faq" className="relative py-36 bg-transparent overflow-hidden border-t border-pm-border/30">
      {/* Soft branding glows */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#FCE2E1]/8 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#C7B4D6]/8 rounded-full blur-[100px] pointer-events-none z-0" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-6 md:px-12 relative z-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Title & CTA (Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6 text-left">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#253B80] bg-[#253B80]/5 px-3 py-1 rounded-full">
              SUPPORT & TRUST
            </span>
            
            <h2 className="mkt-section-h2 font-display font-extrabold text-[#1D264F]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', lineHeight: 1.04, letterSpacing: '-0.03em' }}
            >
              Frequently Asked<br />
              <span className="mkt-section-h2-sub">Questions.</span>
            </h2>
            
            <p className="text-sm text-pm-muted leading-relaxed font-sans max-w-sm">
              Everything you need to know about PixelMark sessions, client roles, and custom workspace setups.
            </p>

            <div className="pt-4">
              <a
                href="mailto:saumyavishwam@gmail.com"
                className="faq-contact-btn btn-secondary-3d inline-flex items-center gap-2.5 px-6 py-3 border border-pm-border hover:border-[#253B80]/30 bg-slate-50 hover:bg-[#253B80]/5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-pm-text hover:text-[#253B80]"
              >
                <Mail className="w-4 h-4" />
                Contact Engineering
              </a>
            </div>
          </div>

          {/* Right Column: Accordion list */}
          <div className="lg:col-span-7 space-y-4">
            {faqs.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              return (
              <div
                key={index}
                className={`faq-accordion-card rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? 'border-pm-accent-bright/15 bg-pm-surface-2 shadow-sm'
                    : 'border-pm-border bg-pm-surface hover:border-pm-border-hover'
                }`}
              >
                  <button
                    onClick={() => toggleExpand(index)}
                    className="w-full flex items-center justify-between p-6 text-left transition-colors duration-200"
                  >
                    <div className="flex gap-4 items-center pr-4">
                      <HelpCircle className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${isExpanded ? 'text-pm-accent' : 'text-pm-text-faint'}`} />
                      <span className={`font-sans text-sm font-bold transition-colors ${isExpanded ? 'text-pm-accent' : 'text-pm-text hover:text-pm-accent'}`}>
                        {faq.question}
                      </span>
                    </div>
                    <div
                      className={`faq-toggle-btn p-1.5 rounded-full transition-all duration-300 flex-shrink-0 ${
                        isExpanded ? 'bg-[#253B80] text-white' : 'bg-slate-100 text-pm-text-faint'
                      }`}
                    >
                      {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-1 text-xs md:text-sm text-pm-muted leading-relaxed font-sans border-t border-pm-border/30">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </motion.div>
    </section>
  );
}
