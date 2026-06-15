'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FAQSection() {
  const faqs = [
    {
      question: 'Does my client or reviewer need to create an account?',
      answer: 'No. Anyone with the secure session share link can drop pins and submit feedback instantly. We built PixelMark with a completely zero-friction flow for reviewers so they can leave feedback in seconds.'
    },
    {
      question: 'Does PixelMark work on any website?',
      answer: 'Yes. Our secure proxy rewriter maps relative assets and resolves cross-origin scripts for both static HTML marketing sites and complex modern web applications (like Next.js, React, or SPAs).'
    },
    {
      question: 'What exactly does a pin capture?',
      answer: 'Each pin automatically records the target HTML tag name, exact CSS selector path, absolute XPath, full innerHTML snapshot, computed CSS styles, browser/viewport details, runtime console logs, and network errors.'
    },
    {
      question: 'Can I use PixelMark for WebGL or Three.js websites?',
      answer: 'Yes. PixelMark features native WebGL context mapping and Three.js raycasting support. When a reviewer clicks inside a 3D canvas, we automatically record coordinates and canvas scene properties.'
    },
    {
      question: 'Is there a Chrome Extension required?',
      answer: 'None at all. PixelMark injects the lightweight capture agent directly through the proxy runtime, eliminating extension installation barriers and making it fully compatible with mobile and desktop web browsers.'
    },
    {
      question: 'How are screenshots captured?',
      answer: 'We use a high-fidelity client-side rendering pipeline (html2canvas) to render viewport screenshots. If html2canvas is blocked by strict CORS policies, the agent gracefully degrades to generating a diagnostic placeholder containing full metadata details.'
    },
    {
      question: 'Can I export my feedback?',
      answer: 'Yes. You can export review sessions into structured Markdown documentation (containing selector and screenshot tables) or raw JSON datasets, or push them directly to GitHub issues in one click.'
    },
    {
      question: 'Is real-time sync supported?',
      answer: 'Yes. We utilize WebSockets to synchronize feedback pins and workflow status updates immediately across all active reviewer and developer browser windows.'
    },
    {
      question: 'What is the share link flow?',
      answer: 'Each session generates a secure, obfuscated hash link. When reviewers open this link, they are automatically logged in to review mode with zero auth walls, allowing them to click, hover, and drop pins immediately.'
    },
    {
      question: 'Who built PixelMark?',
      answer: 'PixelMark was designed, engineered, and hardened by the Entrext Labs team. It is built to serve freelance developers, agencies, and engineering teams collaborating on web audits.'
    },
    {
      question: 'Is PixelMark free to use?',
      answer: 'Yes! PixelMark offers a fully featured free tier for individual builders and freelancers, with premium workspace upgrades for collaborative teams.'
    },
    {
      question: 'Can I use PixelMark for mobile browser testing?',
      answer: 'Yes. The reviewer workspace includes responsive viewport controls (Mobile, Tablet, Desktop) to test and pin layouts across screen sizes directly from your desktop browser.'
    }
  ];

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-24 bg-transparent overflow-hidden border-t border-pm-border">
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
