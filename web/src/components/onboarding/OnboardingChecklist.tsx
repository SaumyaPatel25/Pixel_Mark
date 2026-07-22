'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, ChevronDown, ChevronUp, Check, Play, Trophy, Sparkles, X } from 'lucide-react';
import { useOnboardingStore, OnboardingRole } from '@/store/onboardingStore';
import { Button } from '@/components/ui/button';

interface TaskMeta {
  id: string;
  label: string;
  description: string;
  stepIndex: number;
}

const developerTaskMeta: TaskMeta[] = [
  { id: 'dashboard_visit', label: 'Explore Dashboard', description: 'Access the developer visual QA workspace.', stepIndex: 0 },
  { id: 'click_new_project', label: 'Start Project Setup', description: 'Click New Project to start configuring.', stepIndex: 1 },
  { id: 'fill_project_details', label: 'Configure Project Details', description: 'Enter name and environment target URL.', stepIndex: 2 },
  { id: 'open_workspace', label: 'Open Project Workspace', description: 'Enter the project dashboard environment.', stepIndex: 3 },
  { id: 'click_new_session', label: 'Start Session Setup', description: 'Initialize a review session environment.', stepIndex: 4 },
  { id: 'launch_session', label: 'Launch Review Session', description: 'Launch the sandboxed proxy runner.', stepIndex: 5 },
  { id: 'open_audit_canvas', label: 'Launch Audit Canvas', description: 'Open the website preview workspace.', stepIndex: 6 },
  { id: 'allow_screen_capture', label: 'Grant Capture Permissions', description: 'Enable screen capture for visual feedback.', stepIndex: 7 },
  { id: 'explore_canvas', label: 'Explore Web Substrate', description: 'Scroll, click, and interact with the page.', stepIndex: 8 },
  { id: 'drop_pin', label: 'Drop a Feedback Pin', description: 'Hold Alt and click to place review comments.', stepIndex: 9 },
  { id: 'view_details', label: 'Inspect Observation Feed', description: 'Toggle feed sidebar to review visual bugs.', stepIndex: 10 },
  { id: 'share_session', label: 'Share Review Link', description: 'Invite clients or team members to review.', stepIndex: 11 },
];

const reviewerTaskMeta: TaskMeta[] = [
  { id: 'name_gate', label: 'Register Reviewer Name', description: 'Enter display name to join the review.', stepIndex: 0 },
  { id: 'explore_canvas', label: 'Navigate Web Canvas', description: 'Explore live web preview and click links.', stepIndex: 1 },
  { id: 'drop_pin', label: 'Place Feedback Pin', description: 'Drop a visual bug marker on the page.', stepIndex: 2 },
  { id: 'view_details', label: 'Inspect Active Issues', description: 'Review already reported visual feedback.', stepIndex: 3 },
  { id: 'complete_review', label: 'Submit QA Review', description: 'Wrap up and complete the review session.', stepIndex: 3 }, // maps back to active viewport
];

export function OnboardingChecklist() {
  const {
    isOnboardingActive,
    userRole,
    checklist,
    isChecklistCollapsed,
    showCompletionModal,
    startOnboarding,
    stopOnboarding,
    setStep,
    toggleChecklist,
    setShowCompletionModal,
    hydrateFromLocalStorage
  } = useOnboardingStore();

  useEffect(() => {
    hydrateFromLocalStorage();
  }, [hydrateFromLocalStorage]);

  if (!userRole) return null;

  const tasks = userRole === 'developer' ? developerTaskMeta : reviewerTaskMeta;
  const completedCount = tasks.filter(t => checklist[t.id]).length;
  const totalCount = tasks.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isAllCompleted = completedCount === totalCount;

  const handleGuideMe = (stepIndex: number) => {
    // Make sure onboarding is active
    if (!isOnboardingActive) {
      startOnboarding(userRole);
    }
    setStep(stepIndex);
    toggleChecklist(true); // Auto-collapse checklist when guiding
  };

  return (
    <>
      {/* Floating Onboarding Widget */}
      <div className="fixed bottom-6 right-6 z-[9997] font-sans">
        <AnimatePresence>
          {isChecklistCollapsed ? (
            /* Collapsed State Bubble */
            <motion.button
              key="collapsed-checklist"
              layoutId="checklist-container"
              onClick={() => toggleChecklist(false)}
              className="w-14 h-14 rounded-full bg-pm-accent hover:bg-pm-accent-bright text-white shadow-2xl flex items-center justify-center relative cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <CheckSquare className="w-5 h-5" />
              {/* Circular progress badge */}
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md animate-bounce">
                {completedCount}/{totalCount}
              </span>
            </motion.button>
          ) : (
            /* Expanded Checklist Panel */
            <motion.div
              key="expanded-checklist"
              layoutId="checklist-container"
              className="w-[340px] bg-pm-surface border border-pm-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col text-pm-text select-none"
            >
              {/* Header */}
              <div 
                onClick={() => toggleChecklist(true)}
                className="bg-pm-surface-2 border-b border-pm-border px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-pm-surface-3 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-pm-accent" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    STAGE Checklist
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-pm-accent font-mono">
                    {progressPercent}%
                  </span>
                  <ChevronDown className="w-4 h-4 text-pm-muted" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full bg-pm-border relative">
                <motion.div 
                  className="h-full bg-pm-accent" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {/* Tasks List */}
              <div className="p-4 max-h-[320px] overflow-y-auto space-y-3 custom-scrollbar">
                {tasks.map((task) => {
                  const isDone = !!checklist[task.id];
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`flex items-start justify-between gap-3 p-2.5 rounded-2xl border transition-all duration-300 ${
                        isDone 
                          ? 'bg-emerald-500/[0.03] border-emerald-500/10' 
                          : 'bg-pm-surface-2 border-pm-border hover:border-pm-border-bright'
                      }`}
                    >
                      <div className="flex gap-2.5 items-start min-w-0">
                        {/* Custom checkbox */}
                        <div className={`w-5 h-5 rounded-lg border flex-shrink-0 flex items-center justify-center transition-all ${
                          isDone 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-pm-border bg-pm-surface'
                        }`}>
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>

                        <div className="min-w-0">
                          <h4 className={`text-xs font-extrabold tracking-tight ${
                            isDone ? 'text-pm-muted line-through' : 'text-pm-text'
                          }`}>
                            {task.label}
                          </h4>
                          <p className="text-[10px] text-pm-muted mt-0.5 leading-snug">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      {/* Guide Me Button */}
                      {!isDone && (
                        <button
                          onClick={() => handleGuideMe(task.stepIndex)}
                          className="p-1.5 rounded-lg bg-pm-accent-subtle hover:bg-pm-accent text-pm-accent hover:text-white transition-all cursor-pointer flex-shrink-0"
                          title="Show me how"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action footer */}
              <div className="p-3 bg-pm-surface-2 border-t border-pm-border flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  onClick={stopOnboarding}
                  className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-pm-muted hover:text-rose-600 rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  Skip Tour
                </Button>
                
                {isAllCompleted && (
                  <Button 
                    onClick={() => setShowCompletionModal(true)}
                    className="h-8 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Claim Badge
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Onboarding Completion Celebration Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="w-full max-w-md bg-pm-surface border border-pm-border rounded-[2.5rem] p-8 shadow-2xl relative text-center text-pm-text overflow-hidden"
            >
              {/* Confetti styling blobs */}
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-pm-accent/20 blur-2xl rounded-full" />
              <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full" />

              <button
                onClick={() => setShowCompletionModal(false)}
                className="absolute top-5 right-5 text-pm-muted hover:text-pm-text p-1 hover:bg-pm-surface-2 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg relative">
                <Trophy className="w-10 h-10" />
                <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-amber-400 animate-pulse" />
              </div>

              <h2 className="text-2xl font-black tracking-tight text-pm-text mb-2 uppercase">
                STAGE Champion!
              </h2>
              <p className="text-xs text-pm-muted max-w-xs mx-auto leading-relaxed mb-6 font-semibold">
                Congratulations! You have completed all visual QA tasks and successfully onboarded. You are ready to review websites like a pro.
              </p>

              <div className="bg-pm-surface-2 border border-pm-border rounded-2xl p-4 mb-6 text-left space-y-2">
                <span className="text-[9px] font-black text-pm-muted uppercase tracking-widest block">Unlocked Badges</span>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3" /> QA Onboarded
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-pm-accent-subtle border border-pm-border text-[9px] font-black text-pm-accent uppercase tracking-wider">
                    Pixel Tester
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setShowCompletionModal(false)}
                className="w-full h-12 bg-pm-accent hover:bg-pm-accent-bright text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                Start Auditing
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
