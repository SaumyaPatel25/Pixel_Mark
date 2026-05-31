'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, MessageSquare, MousePointerClick, FileCode, ArrowRight, Zap, Target, MousePointer2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const TerminalTyping = () => {
   const lines = useMemo(() => [
      { text: "### Issue: Header overflow on mobile", color: "text-purple-400" },
      { text: "- Component: `[data-testid=\"main-header\"]`", color: "text-indigo-400" },
      { text: "- Position: X: 88.2%, Y: 12.4%", color: "text-indigo-400" },
      { text: "- Author: Alex (QA Lead)", color: "text-indigo-400" },
      { text: "", color: "" },
      { text: "// Resilient to layout shifts...", color: "text-white/20 italic" }
   ], []);

   const [currentLineIndex, setCurrentLineIndex] = useState(0);
   const [currentText, setCurrentText] = useState("");
   const [displayedLines, setDisplayedLines] = useState<{text: string, color: string}[]>([]);
   
   useEffect(() => {
      if (currentLineIndex < lines.length) {
         const line = lines[currentLineIndex];
         if (currentText.length < line.text.length) {
            const timeout = setTimeout(() => {
               setCurrentText(line.text.slice(0, currentText.length + 1));
            }, 30);
            return () => clearTimeout(timeout);
         } else {
            const timeout = setTimeout(() => {
               setDisplayedLines(prev => [...prev, { text: line.text, color: line.color }]);
               setCurrentLineIndex(currentLineIndex + 1);
               setCurrentText("");
            }, 600);
            return () => clearTimeout(timeout);
         }
      } else {
         const resetTimeout = setTimeout(() => {
            setDisplayedLines([]);
            setCurrentLineIndex(0);
            setCurrentText("");
         }, 5000);
         return () => clearTimeout(resetTimeout);
      }
   }, [currentLineIndex, currentText, lines]);

   return (
      <div className="space-y-1">
         {displayedLines.map((line, i) => (
            <div key={i} className={line.color}>
               {line.text || "\u00A0"}
            </div>
         ))}
         {currentLineIndex < lines.length && (
            <div className={lines[currentLineIndex].color}>
               {currentText}
               <motion.span 
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-1.5 h-3.5 ml-1 bg-white/40 align-middle"
               />
            </div>
         )}
         {currentLineIndex === lines.length && (
            <motion.span 
               animate={{ opacity: [1, 0, 1] }}
               transition={{ repeat: Infinity, duration: 0.8 }}
               className="inline-block w-1.5 h-3.5 bg-white/40 align-middle"
            />
         )}
      </div>
   );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-transparent text-white font-[family-name:var(--font-jakarta)] selection:bg-purple-500/30 selection:text-purple-200 overflow-x-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px]" />
        <div className="absolute top-[100px] right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
      </div>

      <nav className="relative h-24 px-12 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
            <Layout className="w-6 h-6" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-white">PixelMark</span>
        </div>
        <div className="hidden lg:flex gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
          <Link href="/dashboard" className="hover:text-white cursor-pointer transition-colors">Framework</Link>
          <Link href="/dashboard" className="hover:text-white cursor-pointer transition-colors">Resilience</Link>
          <Link href="/pricing" className="hover:text-white cursor-pointer transition-colors">Pricing</Link>
        </div>
        <div className="flex items-center gap-4">
             <Link 
              href="/dashboard"
              className="px-8 py-3 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-[0.98] shadow-2xl shadow-white/5"
            >
              Get Started
            </Link>
        </div>
      </nav>

      <main className="relative pt-32 pb-48">
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto px-12 text-center mb-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-12 shadow-inner"
          >
            <Zap className="w-3 h-3 fill-purple-400" />
            Phase 3: Deep Context Injection Active
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-7xl md:text-8xl font-black text-white tracking-tighter leading-[1] mb-12"
          >
            Visual feedback <br />
            <span className="text-gradient-cosmic italic">at scale.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-xl text-white/40 max-w-2xl mx-auto mb-16 leading-relaxed font-medium"
          >
            The world's most resilient visual feedback platform. 
            Capture component-level intent with our Waterfall Selector Strategy and turn UI tweaks into structured dev context.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <Link 
              href="/dashboard"
              className="px-12 py-6 bg-purple-600 text-white rounded-full text-sm font-black uppercase tracking-[0.2em] hover:bg-purple-500 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center gap-3 group"
            >
              Initialize Engine
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-12 py-6 bg-white/5 text-white border border-white/10 rounded-full text-sm font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-[0.98]">
              View Stack
            </button>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-6xl mx-auto px-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              icon: MousePointerClick,
              title: "Waterfall Selectors",
              desc: "Intelligent DOM capturing that targets data-test IDs and semantic hooks. It stays pinned when your code changes."
            },
            {
              icon: FileCode,
              title: "Dev-Ready Context",
              desc: "Convert visual clicks into high-fidelity Markdown, complete with CSS selectors and accessibility labels."
            },
            {
              icon: Target,
              title: "Frictionless IDs",
              desc: "Anonymous entry for testers with progressive profiling. No login walls, just immediate actionability."
            }
          ].map((feat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
              className="p-10 rounded-[40px] bg-white/[0.01] border border-white/5 hover:border-purple-500/20 transition-all group relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-[40px] group-hover:bg-purple-500/10 transition-colors" />
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-purple-400 shadow-inner mb-8 group-hover:scale-110 transition-transform">
                <feat.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4 tracking-tight">{feat.title}</h3>
              <p className="text-white/40 leading-relaxed text-sm font-medium">{feat.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Technical Showcase */}
        <div className="mt-48 max-w-6xl mx-auto px-12 py-32 rounded-[60px] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 relative group">
          <div className="grid md:grid-cols-2 gap-20 items-center">
             <div className="space-y-8">
                <div className="inline-flex items-center gap-2 text-purple-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                   <FileCode className="w-3 h-3" />
                   The Engine Output
                </div>
                <h2 className="text-5xl font-black leading-[1.1]">Resilience <br />by design.</h2>
                <p className="text-lg text-white/40 leading-relaxed font-medium">
                   PixelMark doesn't just record pixels. It records intent. Our waterfall engine hunts for the most permanent DOM hooks, 
                   ensuring your feedback remains valid across Git commits and CI/CD pipelines.
                </p>
                <div className="pt-4">
                   <Link 
                    href="/dashboard"
                    className="inline-flex items-center gap-3 text-white font-bold text-sm tracking-widest hover:gap-5 transition-all group"
                   >
                    START BUILDING 
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                   </Link>
                </div>
             </div>
             
             <div className="relative">
                <div className="bg-black/60 rounded-3xl p-8 border border-white/10 shadow-3xl backdrop-blur-3xl font-mono text-xs leading-loose min-h-[220px]">
                   <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                      <div className="ml-2 text-[10px] text-white/20 uppercase tracking-widest font-black">Context Enrichment Node</div>
                   </div>
                   
                   <TerminalTyping />
                </div>
                
                {/* Floating Micro-Element */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-10 -right-10 bg-gradient-to-br from-cyan-600 to-blue-600 p-4 rounded-2xl shadow-2xl border border-white/20 z-20"
                >
                   <MousePointer2 className="w-5 h-5 text-white" />
                </motion.div>
             </div>
          </div>
        </div>
      </main>

      <footer className="py-24 border-t border-white/5 max-w-6xl mx-auto px-12 flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
            <Layout className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tighter">PixelMark</span>
        </div>
        <p className="text-white/10 text-[10px] font-black uppercase tracking-[0.4em] text-center">
          Building the next generation of visual communication
        </p>
        <div className="flex gap-10 text-[10px] font-bold uppercase tracking-widest text-white/30">
          <a href="https://www.linkedin.com/in/saumya-rajeshbhai-patel-857290372" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer">LinkedIn</a>
          <a href="https://github.com/sp25126" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
