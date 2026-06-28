'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Clock
} from 'lucide-react';

interface Stage {
  index: number;
  title: string;
  subtitle: string;
  desc: string;
  tag: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  glowColor: string;
}

const stages: Stage[] = [
  {
    index: 0,
    title: '“It looks broken.”',
    subtitle: '1. The Problem',
    desc: 'Vague client reports lead to hours of reproduction hunting. No screenshots, no console logs, and zero technical context.',
    tag: 'TENSE & UNCERTAIN',
    accentColor: 'text-amber-500',
    accentBg: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowColor: 'rgba(245, 158, 11, 0.25)',
  },
  {
    index: 1,
    title: '“PixelMark captures the exact context.”',
    subtitle: '2. The Action',
    desc: 'Reviewers click to pin feedback right on their screens. We instantly isolate computed CSS styles, exact layout positions, and browser specifications.',
    tag: 'PRECISE & ACTIVE',
    accentColor: 'text-purple-400',
    accentBg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glowColor: 'rgba(168, 85, 247, 0.25)',
  },
  {
    index: 2,
    title: '“The team gets an actionable review artifact.”',
    subtitle: '3. The Outcome',
    desc: 'Bugs are resolved in minutes, not days. Feedback is routed into a shareable dashboard, live WebSocket sync, and automated GitHub issue creation.',
    tag: 'CALM & CONFIDENT',
    accentColor: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowColor: 'rgba(16, 185, 129, 0.25)',
  }
];

export default function AboutSection() {
  const [currentStage, setCurrentStage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play timer sequence: transitions every 6 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleStageSelect = (stageIndex: number) => {
    setIsAutoPlaying(false);
    setCurrentStage(stageIndex);
  };

  return (
    <section id="about" className="relative py-24 bg-transparent overflow-hidden border-t border-pm-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-5xl mb-16 space-y-6 text-left">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-pm-accent-vivid">
              The PixelMark Story
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Built to end the <br />
              <span className="text-gradient-purple font-black">"it looks broken"</span> email.
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 text-xs md:text-sm text-pm-muted leading-relaxed font-sans max-w-4xl border-l border-pm-accent/30 pl-4 py-1">
            <p>
              We’ve all received it. A client clicks a button, it doesn’t work, and they write: <em>"The button is broken, please fix."</em> No screenshot, no browser info, and no console logs or error traces.
            </p>
            <p>
              As developers, we spend hours debugging issues that could be resolved in minutes. PixelMark translates visual clicks directly into precision layout elements, selectors, and diagnostics to eliminate QA friction.
            </p>
          </div>
          
          <p className="text-[10px] font-bold uppercase tracking-widest text-pm-accent-vivid font-sans pt-2 flex items-center gap-1.5 animate-pulse">
            <span>⚡ Trace the interactive product lifecycle below</span>
          </p>
        </div>

        {/* Narrative Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          
          {/* Left Column: Sequential Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {stages.map((stage, i) => {
              const isActive = currentStage === i;
              return (
                <div
                  key={i}
                  onClick={() => handleStageSelect(i)}
                  onMouseEnter={() => setIsAutoPlaying(false)}
                  onMouseLeave={() => setIsAutoPlaying(true)}
                  className={`relative p-5 rounded-xl border transition-all duration-500 cursor-pointer text-left select-none overflow-hidden ${
                    isActive
                      ? `${stage.borderColor} bg-pm-surface-2/45 shadow-[0_0_25px_${stage.glowColor}]`
                      : 'border-white/5 bg-pm-surface/20 opacity-60 hover:opacity-90 hover:border-white/10'
                  }`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Icon container */}
                    <div className={`w-8 h-8 rounded-lg ${stage.accentBg} ${stage.accentColor} border border-white/5 flex items-center justify-center flex-shrink-0 transition-transform duration-500 ${isActive ? 'scale-110' : ''}`}>
                      {i === 0 ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : i === 1 ? (
                        <Target className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${stage.accentColor}`}>
                          {stage.subtitle}
                        </span>
                        {isActive && (
                          <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-white/55 font-bold uppercase tracking-widest">
                            {stage.tag}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-sm font-bold text-white leading-tight font-display">
                        {stage.title}
                      </h3>
                      
                      {/* Expanded description */}
                      <motion.p
                        initial={false}
                        animate={{ height: isActive ? 'auto' : 0, opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        className="text-[10px] md:text-xs text-pm-muted leading-relaxed overflow-hidden font-sans pt-1"
                      >
                        {stage.desc}
                      </motion.p>
                    </div>
                  </div>

                  {/* Autoplay loading line */}
                  {isActive && isAutoPlaying && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
                      <motion.div
                        key={currentStage}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 6, ease: 'linear' }}
                        className={`h-full origin-left ${stage.accentColor === 'text-amber-500' ? 'bg-amber-500' : stage.accentColor === 'text-purple-400' ? 'bg-purple-500' : 'bg-emerald-500'}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Visual Stage Panel */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="w-full aspect-[16/10] min-h-[360px] rounded-2xl border border-white/10 bg-pm-surface/30 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between select-none hover:border-pm-accent/30 transition-all duration-500">
              <AnimatePresence mode="wait">
                {currentStage === 0 && <ProblemVisual key="problem" />}
                {currentStage === 1 && <ActionVisual key="action" />}
                {currentStage === 2 && <OutcomeVisual key="outcome" />}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

/* Stage 0 Visual: Problem (Vague client report Slack-style) */
function ProblemVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="relative w-full h-full flex flex-col justify-between"
    >
      {/* Amber Ambient Glow */}
      <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_60%)] pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[7px] text-amber-400 font-bold uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
          Vague Report
        </div>
      </div>

      {/* Main content - Slack style messaging */}
      <div className="flex-1 flex flex-col justify-center gap-4 py-4">
        {/* Client message bubble */}
        <motion.div
          animate={{
            x: [0, -1, 1, -1, 1, 0],
            y: [0, 1, -1, 1, -1, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 2.0
          }}
          className="bg-pm-surface-2 border border-white/5 rounded-2xl p-4 max-w-md self-start text-left space-y-2 relative shadow-lg"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-[8px] font-bold text-amber-400">
              CL
            </div>
            <div className="text-[9px] font-bold text-white">Client Stakeholder</div>
            <div className="text-[7.5px] text-pm-text-faint">10:42 AM</div>
          </div>
          <p className="text-[10px] text-pm-muted leading-relaxed font-sans font-medium">
            "Hey team, it looks broken on my end. I tried clicking the button in the dashboard and it didn't do anything. Can we fix this ASAP?"
          </p>
        </motion.div>

        {/* Developer frustration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-pm-bg border border-red-500/15 rounded-xl p-3 max-w-xs self-end text-left space-y-1 shadow-md"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span className="text-[7px] font-bold text-red-400 uppercase tracking-widest font-mono">Missing Context</span>
          </div>
          <div className="text-[8px] text-pm-text-faint leading-normal font-mono">
            &gt; No URL / page path<br />
            &gt; No viewport dimensions<br />
            &gt; No browser/OS metadata<br />
            &gt; No computed styles or logs
          </div>
        </motion.div>
      </div>

      {/* Footer bar */}
      <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[8px] font-mono text-pm-text-faint">
        <span>ERR_DIAGNOSTICS: NULL</span>
        <span>REPRODUCTION_RATE: ?</span>
      </div>
    </motion.div>
  );
}

/* Stage 1 Visual: Action (PixelMark DOM capture action) */
function ActionVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="relative w-full h-full flex flex-col justify-between"
    >
      {/* Purple Ambient Glow */}
      <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08),transparent_60%)] pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-[7px] text-purple-400 font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Isolating Layout Element
        </div>
      </div>

      {/* Main mockup viewport */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {/* Mock browser card mockup */}
        <div className="w-full max-w-sm bg-pm-bg border border-white/10 rounded-xl p-4 text-left relative overflow-hidden shadow-2xl mx-auto my-auto min-h-[160px] flex flex-col justify-between">
          <div className="h-2 w-1/3 bg-white/10 rounded mb-2" />
          <div className="h-2 w-full bg-white/5 rounded mb-4" />
          
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 bg-white/5 rounded" />
            
            {/* CTA Button being clicked */}
            <motion.button
              animate={{
                scale: [1, 0.93, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 2.4
              }}
              className="px-3 py-1.5 bg-purple-500 rounded text-[8px] font-bold text-white relative flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-400/20"
            >
              SUBSCRIBE NOW
              
              {/* Target pin overlay */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2, repeat: Infinity, repeatDelay: 2.4 }}
                className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-purple-400 border border-white flex items-center justify-center text-[5px] text-white shadow-lg font-bold"
              >
                1
              </motion.div>
            </motion.button>
          </div>

          {/* Selector lens computed overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute top-2 right-2 bg-pm-surface-2/95 border border-purple-500/35 rounded-lg p-2 font-mono text-[7px] text-purple-300 max-w-[160px] shadow-2xl"
          >
            <div className="text-purple-400 font-bold border-b border-purple-500/20 pb-1 mb-1 font-display">LAYOUT LENS</div>
            <div>[tag]: button.btn-cta</div>
            <div>[position]: left: 45px</div>
            <div>[computed]: z-index: 0</div>
            <div>[style]: height: 24px</div>
          </motion.div>

          {/* Animated gliding cursor inside the mockup card */}
          <motion.div
            animate={{
              left: ['90%', '76%', '76%', '90%'],
              top: ['90%', '75%', '75%', '90%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          >
            <svg className="w-4 h-4 text-white fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24">
              <path d="M4.5 3v15.25l3.96-3.96 2.37 5.71 2.37-.98-2.37-5.71h5.67L4.5 3z" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[8px] font-mono text-pm-text-faint">
        <span>RENDER_ENGINE: SHADOW_ELEMENTS_COMPATIBLE</span>
        <span>RESOLUTION: 1440 × 900</span>
      </div>
    </motion.div>
  );
}

/* Stage 2 Visual: Outcome (Clean resolved issue panel) */
function OutcomeVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="relative w-full h-full flex flex-col justify-between"
    >
      {/* Emerald Ambient Glow */}
      <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_60%)] pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[7px] text-emerald-400 font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Feedback Active
        </div>
      </div>

      {/* Main dashboard card content */}
      <div className="flex-1 flex flex-col justify-center gap-3 py-4">
        {/* Consolidated Review Artifact */}
        <div className="bg-pm-surface-2 border border-emerald-500/20 rounded-xl p-4 text-left space-y-3 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[40px] h-[40px] bg-emerald-500/10 rounded-bl-full flex items-center justify-center text-emerald-400 pl-2 pb-2">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </motion.div>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[7.5px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono font-bold">
              ISSUE #1042
            </span>
            <span className="text-[7.5px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/50 rounded-full font-mono">
              RESOLVED
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-white font-display">"Subscribe CTA Z-Index Conflict"</h4>
            <p className="text-[8.5px] text-pm-muted leading-relaxed font-sans">
              Isolated element: <code className="text-emerald-400 bg-emerald-500/5 px-1 py-0.2 rounded border border-emerald-500/10 font-mono">button.btn-cta</code>. Client window viewport unmasked at Chrome (macOS 14.4).
            </p>
          </div>

          <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[7px] text-pm-text-faint font-mono">
            <span className="flex items-center gap-1"><GithubIcon className="w-2.5 h-2.5" /> github.com/pull/294</span>
            <span className="text-emerald-400 font-bold">FIXED IN 4M</span>
          </div>
        </div>

        {/* WebSocket synchronized notification pop */}
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="self-center bg-pm-bg border border-white/5 rounded-lg py-1.5 px-3 flex items-center gap-2 shadow-lg"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[7.5px] text-pm-muted font-sans font-medium">WebSocket synced: 1 client active</span>
        </motion.div>
      </div>

      {/* Footer bar */}
      <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[8px] font-mono text-pm-text-faint">
        <span>STATUS: CLOSED</span>
        <span>INTEGRATION: GITHUB_OK</span>
      </div>
    </motion.div>
  );
}

/* Inline Custom SVG for GitHub to guarantee build safety */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
