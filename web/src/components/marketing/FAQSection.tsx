'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Minus, HelpCircle, Mail } from 'lucide-react';
import { faqs, FAQItem } from '@/lib/faqData';

type CategoryFilter = 'all' | 'about' | 'how-it-works' | 'comparisons' | 'access-privacy';

const categories: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'about', label: 'About STAGE' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'comparisons', label: 'Comparisons' },
  { id: 'access-privacy', label: 'Access & Privacy' }
];

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const shouldReduceMotion = useReducedMotion();

  const filteredFaqs = activeCategory === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === activeCategory);

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
    <section id="faq" className="relative py-28 md:py-36 bg-[var(--pm-bg)] border-t border-pm-border/40 text-pm-text transition-colors">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Heading & Contact */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6 text-left">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#2B4CFF] bg-[#2B4CFF]/10 px-3 py-1 rounded-full inline-block">
              Support
            </span>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#16141A] dark:text-white leading-[1.1]">
              Frequently Asked Questions
            </h2>
            
            <p className="text-sm text-pm-muted leading-relaxed font-sans max-w-sm">
              Answers to questions about review links, client access, and project settings.
            </p>

            <div className="pt-2">
              <a
                href="mailto:saumyavishwam@gmail.com"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 border border-pm-border bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl text-xs font-mono font-medium text-pm-text hover:text-[#2B4CFF] transition-colors"
              >
                <Mail className="w-4 h-4 text-pm-muted" />
                <span>Contact support</span>
              </a>
            </div>
          </div>

          {/* Right Column: Category Tabs & Accordion list */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setExpandedIndex(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-[#16141A] text-white dark:bg-white dark:text-[#16141A] shadow-sm'
                      : 'bg-pm-surface hover:bg-pm-surface-2 text-pm-muted border border-pm-border'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Accordion items */}
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <div
                    key={`${faq.question}-${index}`}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-[#2B4CFF]/30 bg-white dark:bg-white/[0.04] shadow-sm'
                        : 'border-pm-border/60 bg-white/70 dark:bg-white/[0.02] hover:border-pm-border'
                    }`}
                  >
                    <button
                      id={`faq-btn-${index}`}
                      onClick={() => toggleExpand(index)}
                      aria-expanded={isExpanded}
                      aria-controls={`faq-panel-${index}`}
                      className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4CFF] rounded-2xl"
                    >
                      <div className="flex items-center gap-3.5 pr-4">
                        <span className={`text-base md:text-lg font-semibold transition-colors ${
                          isExpanded ? 'text-[#2B4CFF] dark:text-[#6d84ff]' : 'text-[#16141A] dark:text-white'
                        }`}>
                          {faq.question}
                        </span>
                      </div>
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isExpanded
                            ? 'bg-[#2B4CFF] text-white'
                            : 'bg-slate-100 dark:bg-white/10 text-pm-muted'
                        }`}
                      >
                        {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          id={`faq-panel-${index}`}
                          role="region"
                          aria-labelledby={`faq-btn-${index}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 md:px-6 pb-6 pt-1 text-sm md:text-[15px] text-[#5F5A66] dark:text-slate-300 leading-relaxed font-sans border-t border-pm-border/40">
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

        </div>
      </div>
    </section>
  );
}
