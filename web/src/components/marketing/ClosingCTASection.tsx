'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { trackCtaClick } from '@/lib/analytics';

export default function ClosingCTASection() {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden border-t border-pm-border/40 bg-[var(--pm-bg)] text-pm-text transition-colors">
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10 space-y-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#16141A] dark:text-white"
        >
          Send your first review link.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base md:text-lg text-pm-muted max-w-xl mx-auto font-sans"
        >
          Free for one project. Clients and teammates click to comment with nothing to install.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <Link
            href="/register"
            onClick={() => trackCtaClick('closing_cta_signup', 'general')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#2B4CFF] hover:bg-[#203ecc] text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4CFF]/50 min-h-[48px]"
          >
            Create a review link
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-pm-surface hover:bg-pm-surface-2 text-pm-text border border-pm-border rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4CFF]/40 min-h-[48px]"
          >
            Sign in
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
