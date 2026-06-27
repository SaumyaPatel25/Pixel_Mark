'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
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
    <section id="faq" className="relative py-24 bg-transparent overflow-hidden border-t border-pm-border">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-pm-accent-vivid">
            FAQ
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white animate-fade-in">
            Everything you need to know
          </h2>
          <p className="text-xs text-pm-muted leading-relaxed">
            Have more questions? Contact our team at{' '}
            <a href="mailto:team@pixelmark.dev" className="text-pm-accent-vivid hover:underline">
              team@pixelmark.dev
            </a>
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-pm-border bg-pm-surface/40 overflow-hidden transition-all duration-300 hover:border-pm-accent/20"
              >
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors duration-200"
                >
                  <div className="flex gap-4 items-center">
                    <HelpCircle className="w-4 h-4 text-pm-accent-vivid flex-shrink-0" />
                    <span className="font-display text-sm font-bold text-white hover:text-pm-accent-vivid transition-colors">
                      {faq.question}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-pm-muted"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="border-t border-pm-border/30 overflow-hidden"
                    >
                      <div className="p-5 text-xs text-pm-muted leading-relaxed font-sans bg-pm-surface-2/20">
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
    </section>
  );
}
