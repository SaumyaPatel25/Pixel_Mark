'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, MousePointerClick } from 'lucide-react';
import { useOnboardingStore, developerSteps, reviewerSteps, OnboardingStep } from '@/store/onboardingStore';
import { useScreenshotStore } from '@/store/screenshotStore';
import { Button } from '@/components/ui/button';

export function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const dragControls = useDragControls();
  
  const {
    isOnboardingActive,
    currentStepIndex,
    userRole,
    nextStep,
    prevStep,
    stopOnboarding,
    hydrateFromLocalStorage,
    checklist
  } = useOnboardingStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [elementVisible, setElementVisible] = useState(false);

  // Interaction gating state
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showInteractionHint, setShowInteractionHint] = useState(false);
  const [shakeKey, setShakeKey] = useState(0); // bump to retrigger shake animation

  const activeStepRef = useRef<OnboardingStep | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load state on mount
  useEffect(() => {
    hydrateFromLocalStorage();
  }, [hydrateFromLocalStorage]);

  // Handle window resizing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const steps = userRole === 'developer' ? developerSteps : reviewerSteps;
  const currentStep = steps[currentStepIndex];

  // Keep stable refs to store actions so useEffect deps arrays never change size
  const nextStepRef = useRef(nextStep);
  const prevStepRef = useRef(prevStep);
  const stopOnboardingRef = useRef(stopOnboarding);
  useEffect(() => { nextStepRef.current = nextStep; }, [nextStep]);
  useEffect(() => { prevStepRef.current = prevStep; }, [prevStep]);
  useEffect(() => { stopOnboardingRef.current = stopOnboarding; }, [stopOnboarding]);

  // Reset interaction state whenever step changes
  useEffect(() => {
    setHasInteracted(false);
    setShowInteractionHint(false);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
  }, [currentStepIndex]);

  // Attach click listener to the target element for interaction gating
  useEffect(() => {
    if (!isOnboardingActive || !currentStep || !currentStep.requiresInteraction) return;
    if (currentStep.target === 'body') return;

    const attachListener = () => {
      const el = document.querySelector(currentStep.target);
      if (!el) return false;

      const handler = () => {
        setHasInteracted(true);
        setShowInteractionHint(false);
        // If flagged, advance immediately on click (e.g. card navigates away)
        if (currentStep.autoAdvanceOnInteraction) {
          setTimeout(() => nextStepRef.current(), 100);
        }
      };

      el.addEventListener('click', handler, { once: true });
      return () => el.removeEventListener('click', handler);
    };

    // Try attaching immediately, retry until element is found
    let cleanup: (() => void) | false = false;
    const tryAttach = setInterval(() => {
      cleanup = attachListener();
      if (cleanup) clearInterval(tryAttach);
    }, 300);

    return () => {
      clearInterval(tryAttach);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [isOnboardingActive, currentStepIndex, currentStep]);

  // Auto-advance when route matches autoAdvanceOnRoute
  useEffect(() => {
    if (!isOnboardingActive || !currentStep?.autoAdvanceOnRoute) return;
    if (pathname.includes(currentStep.autoAdvanceOnRoute)) {
      const t = setTimeout(() => nextStepRef.current(), 600);
      return () => clearTimeout(t);
    }
  }, [pathname, isOnboardingActive, currentStep]);

  // Skip "Enable Screen Capture" step if permission is already allowed/skipped/denied
  const screenshotPermission = useScreenshotStore((s) => s.screenshotPermission);
  useEffect(() => {
    if (!isOnboardingActive || !currentStep) return;
    if (currentStep.target === '#onboarding-allow-capture-btn' && screenshotPermission !== 'pending') {
      nextStepRef.current();
    }
  }, [isOnboardingActive, currentStep, screenshotPermission]);

  // Auto-advance "Drop Feedback Pins" step when user successfully drops a pin
  useEffect(() => {
    if (!isOnboardingActive || !currentStep) return;
    if (currentStep.title === 'Drop Feedback Pins' && checklist.drop_pin === true) {
      nextStepRef.current();
    }
  }, [isOnboardingActive, currentStep, checklist.drop_pin]);

  // Logic to find target element and calculate its bounding box
  useEffect(() => {
    if (!isOnboardingActive || !currentStep) {
      setTargetRect(null);
      setElementVisible(false);
      return;
    }

    activeStepRef.current = currentStep;

    const updateBoundingRect = () => {
      if (currentStep.target === 'body') {
        setTargetRect(null);
        setElementVisible(true);
        return;
      }

      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        setElementVisible(rect.width > 0 && rect.height > 0);
      } else {
        setTargetRect(null);
        setElementVisible(false);
      }
    };

    updateBoundingRect();
    pollIntervalRef.current = setInterval(updateBoundingRect, 300);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOnboardingActive, currentStepIndex, userRole, windowSize, currentStep]);

  // Handle auto-routing if step specifies a route mismatch
  useEffect(() => {
    if (!isOnboardingActive || !currentStep) return;

    const isMatchingRoute = pathname.includes(currentStep.route);
    
    if (!isMatchingRoute && currentStep.route !== 'body') {
      if (currentStep.route === '/dashboard') {
        router.push('/dashboard');
      } else if (currentStep.route === '/project' && !pathname.includes('/project/')) {
        console.log('[Onboarding] Waiting for project selection...');
      }
    }
  }, [isOnboardingActive, currentStepIndex, currentStep, pathname, router]);

  // Handle the Next button — gated by requiresInteraction
  const handleNext = useCallback(() => {
    if (currentStep?.requiresInteraction && !hasInteracted) {
      setShowInteractionHint(true);
      setShakeKey(k => k + 1);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => setShowInteractionHint(false), 3000);
      return;
    }
    nextStepRef.current();
  }, [currentStep, hasInteracted]);

  if (!isOnboardingActive || !currentStep) return null;

  // Position tooltip based on layout position
  const getTooltipStyle = () => {
    if (!targetRect || !elementVisible) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
      };
    }

    const margin = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    let top = targetRect.top + targetRect.height + margin;

    if (currentStep.placement === 'top') {
      top = targetRect.top - tooltipHeight - margin;
    } else if (currentStep.placement === 'left') {
      left = targetRect.left - tooltipWidth - margin;
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
    } else if (currentStep.placement === 'right') {
      left = targetRect.left + targetRect.width + margin;
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
    }

    if (left < margin) left = margin;
    if (left + tooltipWidth > viewportWidth - margin) left = viewportWidth - tooltipWidth - margin;
    if (top < margin) top = margin;
    if (top + tooltipHeight > viewportHeight - margin) top = viewportHeight - tooltipHeight - margin;

    return {
      left: `${left}px`,
      top: `${top}px`,
      position: 'fixed' as const,
    };
  };

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const needsInteraction = currentStep.requiresInteraction && !hasInteracted;

  return (
    <div className="fixed inset-0 z-[2147483647] pointer-events-none select-none font-sans">
      <AnimatePresence>
        {/* Spotlight overlay using SVG Mask — pointer-events: none so clicks pass through to the real element */}
        {targetRect && elementVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <svg className="w-full h-full">
              <defs>
                <mask id="onboarding-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={targetRect.left - 8}
                    y={targetRect.top - 8}
                    width={targetRect.width + 16}
                    height={targetRect.height + 16}
                    rx="12"
                    ry="12"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="currentColor"
                className="text-[#0a0a0f] opacity-80"
                mask="url(#onboarding-spotlight-mask)"
              />
            </svg>
            
            {/* Spotlight Glowing Border — pulses when waiting for interaction */}
            <div
              className={`absolute rounded-xl pointer-events-none transition-all duration-300 ${
                needsInteraction
                  ? 'border-2 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.5)] animate-pulse'
                  : hasInteracted
                  ? 'border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                  : 'border-2 border-pm-accent shadow-[0_0_20px_rgba(67,130,223,0.4)]'
              }`}
              style={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
              }}
            />
          </motion.div>
        )}

        {/* Global Darkened Backdrop for center-modal steps */}
        {(!targetRect || !elementVisible) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 pointer-events-auto"
            onClick={stopOnboarding}
          />
        )}
      </AnimatePresence>

      {/* Onboarding Tooltip Card */}
      <motion.div
        key={`step-${currentStepIndex}`}
        layout
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={
          showInteractionHint
            ? {
                opacity: 1,
                scale: 1,
                y: 0,
                x: [0, -8, 8, -6, 6, -4, 4, 0],
                transition: { x: { duration: 0.45, ease: 'easeInOut' } },
              }
            : { opacity: 1, scale: 1, y: 0, x: 0 }
        }
        className="w-[320px] bg-pm-surface border border-pm-border rounded-3xl p-5 shadow-2xl pointer-events-auto select-text text-pm-text z-[2147483647]"
        style={getTooltipStyle()}
      >
        {/* Premium visual drag handle */}
        <div 
          className="w-[calc(100%+40px)] -mx-5 -mt-5 py-1.5 mb-3.5 bg-pm-surface-2 border-b border-pm-border rounded-t-[22px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onPointerDown={(e) => dragControls.start(e)}
          title="Drag to reposition guide"
        >
          <div className="w-8 h-1 bg-pm-muted/30 rounded-full" />
        </div>

        <div className="flex justify-between items-start mb-3 gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-pm-accent bg-pm-accent-subtle border border-pm-border px-2.5 py-1 rounded-full">
            Guide Step {currentStepIndex + 1} of {steps.length}
          </span>
          <button
            onClick={stopOnboarding}
            className="text-pm-muted hover:text-pm-text transition-colors p-1 hover:bg-pm-surface-2 rounded-lg cursor-pointer"
            title="Skip Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-sm font-extrabold tracking-tight text-pm-text mb-1.5">
          {currentStep.title}
        </h3>
        <p className="text-xs text-pm-muted leading-relaxed mb-3">
          {currentStep.content}
        </p>

        {/* Interaction hint banner */}
        <AnimatePresence>
          {showInteractionHint && (
            <motion.div
              key={`hint-${shakeKey}`}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                <MousePointerClick className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <p className="text-[10px] font-bold text-amber-400 leading-snug">
                  Please click on the highlighted button first!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interaction done badge */}
        <AnimatePresence>
          {hasInteracted && currentStep.requiresInteraction && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <p className="text-[10px] font-bold text-emerald-400 leading-snug">
                  Great! Now click Next to continue.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicator Progress Dots + Nav */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStepIndex ? 'w-4 bg-pm-accent' : 'w-1 bg-pm-border'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {!isFirstStep && (
              <Button
                variant="ghost"
                onClick={prevStep}
                className="h-8 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-pm-surface-2 text-pm-muted hover:text-pm-text transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                Back
              </Button>
            )}

            {/* Auto-advance step: show waiting spinner instead of Next button */}
            {currentStep.autoAdvanceOnRoute ? (
              <div className="h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-pm-surface-2 border border-pm-border text-pm-muted flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-pm-border border-t-pm-accent rounded-full animate-spin" />
                Waiting…
              </div>
            ) : (
              <Button
                onClick={handleNext}
                className={`h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1 ${
                  needsInteraction
                    ? 'bg-pm-surface-2 border border-pm-border text-pm-muted hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30'
                    : 'bg-pm-accent hover:bg-pm-accent-bright text-white'
                }`}
              >
                {isLastStep ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
