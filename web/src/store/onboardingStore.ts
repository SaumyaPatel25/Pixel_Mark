import { create } from 'zustand';

export type OnboardingRole = 'developer' | 'reviewer';

export interface OnboardingStep {
  target: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  title: string;
  content: string;
  route: string;
  requiresInteraction?: boolean;
  autoAdvanceOnRoute?: string;
  autoAdvanceOnInteraction?: boolean; // If true, clicking the target also immediately calls nextStep()
}

export interface OnboardingTask {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface OnboardingState {
  isOnboardingActive: boolean;
  currentStepIndex: number;
  userRole: OnboardingRole | null;
  checklist: Record<string, boolean>;
  isChecklistCollapsed: boolean;
  showCompletionModal: boolean;
  isDismissed: boolean;
  isCompleted: boolean;
  
  // Actions
  startOnboarding: (role: OnboardingRole) => void;
  stopOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (index: number) => void;
  setRole: (role: OnboardingRole | null) => void;
  completeTask: (taskId: string) => void;
  resetTasks: () => void;
  toggleChecklist: (collapsed?: boolean) => void;
  setShowCompletionModal: (show: boolean) => void;
  hydrateFromLocalStorage: () => void;
}

// Developer steps definition
export const developerSteps: OnboardingStep[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to STAGE! 🚀',
    content: 'STAGE is a premium visual QA and bug-reporting tool. Let\'s show you how to review your website, leave feedback, and invite clients step-by-step.',
    route: '/dashboard'
  },
  {
    target: '#onboarding-new-project-btn',
    placement: 'bottom',
    title: 'Initialize Your First Project',
    content: 'Click the button to open the project creation form.',
    route: '/dashboard',
    requiresInteraction: true
  },
  {
    target: '#onboarding-create-project-modal',
    placement: 'left',
    title: 'Fill In Your Project Details',
    content: 'Enter a project name and the target URL you want to audit, then click "Initialize Project". The tour will continue automatically once your project is ready.',
    route: '/dashboard',
  },
  {
    target: '#onboarding-open-workspace-btn',
    placement: 'top',
    title: 'Open Your Project Workspace',
    content: 'Click "Open Workspace" on your newly created project to enter the audit canvas where you can review your website.',
    route: '/dashboard',
    requiresInteraction: true,
    autoAdvanceOnInteraction: true
  },
  {
    target: '#onboarding-new-session-btn',
    placement: 'bottom',
    title: 'Create Your First Review Session',
    content: 'Now, click "New Session" to start a new feedback session for this project environment.',
    route: '/sessions',
    requiresInteraction: true
  },
  {
    target: '#onboarding-launch-session-btn',
    placement: 'left',
    title: 'Launch Review Session',
    content: 'Verify the session title and starting URL, then click "Launch Session". This initializes the sandboxed proxy runner.',
    route: '/sessions',
    requiresInteraction: true,
    autoAdvanceOnInteraction: true
  },
  {
    target: '#onboarding-audit-canvas-btn',
    placement: 'left',
    title: 'Launch Audit Canvas',
    content: 'Your review session is now active! Click "Audit Canvas" to open the interactive website workspace.',
    route: '/sessions',
    requiresInteraction: true,
    autoAdvanceOnInteraction: true,
    autoAdvanceOnRoute: '/project'
  },
  {
    target: '#onboarding-allow-capture-btn',
    placement: 'bottom',
    title: 'Enable Screen Capture',
    content: 'Click "Allow" to grant screen capture permission. This allows STAGE to automatically attach screenshots to your feedback pins for premium bug reporting!',
    route: '/project',
    requiresInteraction: true,
    autoAdvanceOnInteraction: true
  },
  {
    target: '#audit-iframe-container',
    placement: 'right',
    title: 'Interactive Website Canvas',
    content: 'Your target website is loaded inside this interactive viewport. You can scroll, click links, and interact with the page normally.',
    route: '/project'
  },
  {
    target: '#audit-iframe-container',
    placement: 'right',
    title: 'Drop Feedback Pins',
    content: 'To report a bug, hold the Alt key and click directly on the visual element on the page (or toggle "Leave Feedback" above and click) to place a pin.',
    route: '/project',
    requiresInteraction: true
  },
  {
    target: '#command-center-drawer, #onboarding-feedback-sidebar-reviewer, #command-center-trigger, #onboarding-feedback-feed-btn',
    placement: 'left',
    title: 'Review Observations Feed',
    content: 'Toggle the feedback sidebar to see all issues, screenshots, and visual bugs reported on this project.',
    route: '/project',
    requiresInteraction: true
  },
  {
    target: '#onboarding-share-review-btn',
    placement: 'bottom',
    title: 'Share Secure Review Links',
    content: 'Generate and copy a public review link. Send it to clients so they can drop feedback pins without signing up!',
    route: '/project',
    requiresInteraction: true
  }
];

// Reviewer steps definition
export const reviewerSteps: OnboardingStep[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to STAGE Review Mode 🎨',
    content: 'You\'ve been invited to review this page. Let\'s quickly show you how to leave visual feedback and collaborate.',
    route: '/review'
  },
  {
    target: '#audit-iframe-container',
    placement: 'right',
    title: 'Interactive Page Canvas',
    content: 'This is the live website. Scroll, hover, and navigate page links normally.',
    route: '/review'
  },
  {
    target: '#leave-feedback-btn',
    placement: 'bottom',
    title: 'Leave Feedback Anywhere',
    content: 'Click "Leave Feedback" to toggle feedback mode, then click directly on any visual element to write your notes.',
    route: '/review',
    requiresInteraction: true
  },
  {
    target: '#onboarding-feedback-sidebar-reviewer, #onboarding-feedback-feed-btn',
    placement: 'right',
    title: 'Feedback Sidebar',
    content: 'Toggle this sidebar to view comments left by others, reply to threads, and see active issue markers.',
    route: '/review',
    requiresInteraction: true
  }
];

const saveToLocalStorage = (state: Partial<OnboardingState>) => {
  if (typeof window === 'undefined') return;
  const data = {
    isOnboardingActive: state.isOnboardingActive,
    currentStepIndex: state.currentStepIndex,
    userRole: state.userRole,
    checklist: state.checklist,
    isChecklistCollapsed: state.isChecklistCollapsed,
    showCompletionModal: state.showCompletionModal,
    isDismissed: state.isDismissed,
    isCompleted: state.isCompleted,
  };
  localStorage.setItem('pm_onboarding_state', JSON.stringify(data));
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isOnboardingActive: false,
  currentStepIndex: 0,
  userRole: null,
  checklist: {},
  isChecklistCollapsed: false,
  showCompletionModal: false,
  isDismissed: false,
  isCompleted: false,

  startOnboarding: (role) => {
    const initialChecklist: Record<string, boolean> = role === 'developer' ? {
      dashboard_visit: true,
      click_new_project: false,
      fill_project_details: false,
      open_workspace: false,
      click_new_session: false,
      launch_session: false,
      open_audit_canvas: false,
      allow_screen_capture: false,
      explore_canvas: false,
      drop_pin: false,
      view_details: false,
      share_session: false
    } : {
      name_gate: true,
      explore_canvas: false,
      drop_pin: false,
      view_details: false,
      complete_review: false
    };
    
    const newState = {
      isOnboardingActive: true,
      currentStepIndex: 0,
      userRole: role,
      checklist: initialChecklist,
      showCompletionModal: false,
      isDismissed: false,
      isCompleted: false
    };
    
    set(newState);
    saveToLocalStorage({ ...get(), ...newState });
  },

  stopOnboarding: () => {
    const newState = {
      isOnboardingActive: false,
      currentStepIndex: 0,
      isDismissed: true
    };
    set(newState);
    saveToLocalStorage({ ...get(), ...newState });
  },

  nextStep: () => {
    const { currentStepIndex, userRole } = get();
    const steps = userRole === 'developer' ? developerSteps : reviewerSteps;

    // Auto-complete the task corresponding to the step the user just advanced past
    if (userRole === 'developer') {
      const devTaskIdMap = [
        'dashboard_visit',
        'click_new_project',
        'fill_project_details',
        'open_workspace',
        'click_new_session',
        'launch_session',
        'open_audit_canvas',
        'allow_screen_capture',
        'explore_canvas',
        'drop_pin',
        'view_details',
        'share_session'
      ];
      const completedTaskId = devTaskIdMap[currentStepIndex];
      if (completedTaskId) {
        get().completeTask(completedTaskId);
      }
    } else if (userRole === 'reviewer') {
      const revTaskIdMap = [
        'name_gate',
        'explore_canvas',
        'drop_pin',
        'view_details'
      ];
      const completedTaskId = revTaskIdMap[currentStepIndex];
      if (completedTaskId) {
        get().completeTask(completedTaskId);
      }
    }

    if (currentStepIndex < steps.length - 1) {
      const newState = { currentStepIndex: currentStepIndex + 1 };
      set(newState);
      saveToLocalStorage({ ...get(), ...newState });
    } else {
      // Completed last step
      const newState = { 
        isOnboardingActive: false,
        showCompletionModal: true,
        isCompleted: true 
      };
      set(newState);
      
      // Also complete final checklist item
      if (userRole === 'developer') {
        get().completeTask('share_session');
      } else if (userRole === 'reviewer') {
        get().completeTask('complete_review');
      }
      
      saveToLocalStorage({ ...get(), ...newState });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      const newState = { currentStepIndex: currentStepIndex - 1 };
      set(newState);
      saveToLocalStorage({ ...get(), ...newState });
    }
  },

  setStep: (index) => {
    const newState = { currentStepIndex: index };
    set(newState);
    saveToLocalStorage({ ...get(), ...newState });
  },

  setRole: (role) => {
    const newState = { userRole: role };
    set(newState);
    saveToLocalStorage({ ...get(), ...newState });
  },

  completeTask: (taskId) => {
    const { checklist } = get();
    if (checklist[taskId] === true) return;
    
    const newChecklist = { ...checklist, [taskId]: true };
    set({ checklist: newChecklist });
    saveToLocalStorage({ ...get(), checklist: newChecklist });
  },

  resetTasks: () => {
    const { userRole } = get();
    const cleanChecklist: Record<string, boolean> = userRole === 'developer' ? {
      dashboard_visit: true,
      click_new_project: false,
      fill_project_details: false,
      open_workspace: false,
      click_new_session: false,
      launch_session: false,
      open_audit_canvas: false,
      allow_screen_capture: false,
      explore_canvas: false,
      drop_pin: false,
      view_details: false,
      share_session: false
    } : {
      name_gate: true,
      explore_canvas: false,
      drop_pin: false,
      view_details: false,
      complete_review: false
    };
    
    set({ checklist: cleanChecklist });
    saveToLocalStorage({ ...get(), checklist: cleanChecklist });
  },

  toggleChecklist: (collapsed) => {
    const isCollapsed = collapsed !== undefined ? collapsed : !get().isChecklistCollapsed;
    set({ isChecklistCollapsed: isCollapsed });
    saveToLocalStorage({ ...get(), isChecklistCollapsed: isCollapsed });
  },

  setShowCompletionModal: (show) => {
    set({ showCompletionModal: show });
    saveToLocalStorage({ ...get(), showCompletionModal: show });
  },

  hydrateFromLocalStorage: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('pm_onboarding_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set({
          isOnboardingActive: parsed.isOnboardingActive || false,
          currentStepIndex: parsed.currentStepIndex || 0,
          userRole: parsed.userRole || null,
          checklist: parsed.checklist || {},
          isChecklistCollapsed: parsed.isChecklistCollapsed || false,
          showCompletionModal: parsed.showCompletionModal || false,
          isDismissed: parsed.isDismissed || false,
          isCompleted: parsed.isCompleted || false,
        });
      } catch (e) {
        console.error('Failed to parse onboarding local storage:', e);
      }
    }
  }
}));
