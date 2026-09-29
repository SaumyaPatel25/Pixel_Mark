'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Lightbulb, 
  Scissors, 
  Bug, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Star, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  HeartHandshake
} from 'lucide-react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/lib/api';

type CategoryType = 'improve' | 'add' | 'remove' | 'bug' | 'general';

interface CategoryOption {
  id: CategoryType;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  placeholder: string;
  description: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'improve',
    label: 'What to Improve',
    shortLabel: 'Improve',
    icon: Rocket,
    color: 'text-violet-500 dark:text-violet-400',
    bgLight: 'bg-violet-500/10 border-violet-500/25',
    placeholder: 'What feels clunky, slow, or difficult to use? (e.g., mobile drawer gestures, pin positioning, link sharing, navigation...)',
    description: 'Help us refine existing workflows and polish the user experience.'
  },
  {
    id: 'add',
    label: 'What to Add (Feature Request)',
    shortLabel: 'Add Feature',
    icon: Lightbulb,
    color: 'text-cyan-500 dark:text-cyan-400',
    bgLight: 'bg-cyan-500/10 border-cyan-500/25',
    placeholder: 'What tools, integrations, or workflows would save you the most time? (e.g., Slack notifications, Linear sync, client approval sign-off...)',
    description: 'Suggest new capabilities that would make STAGE indispensable.'
  },
  {
    id: 'remove',
    label: 'What to Remove / Simplify',
    shortLabel: 'Remove / Simplify',
    icon: Scissors,
    color: 'text-amber-500 dark:text-amber-400',
    bgLight: 'bg-amber-500/10 border-amber-500/25',
    placeholder: 'Which buttons, menus, or features feel bloated, unnecessary, or confusing?',
    description: 'We believe in ruthless simplicity. Tell us what we should trim.'
  },
  {
    id: 'bug',
    label: 'Bug or Glitch Report',
    shortLabel: 'Bug Report',
    icon: Bug,
    color: 'text-rose-500 dark:text-rose-400',
    bgLight: 'bg-rose-500/10 border-rose-500/25',
    placeholder: 'What went wrong? Please share what happened, what you expected, and which device or browser you were using.',
    description: 'Report visual anomalies, broken buttons, or unexpected behaviors.'
  },
  {
    id: 'general',
    label: 'General Thoughts & Experience',
    shortLabel: 'General',
    icon: MessageSquare,
    color: 'text-blue-500 dark:text-blue-400',
    bgLight: 'bg-blue-500/10 border-blue-500/25',
    placeholder: 'Any overall impressions, first thoughts, or kind words? We read every single message.',
    description: 'Share your broader perspective or tell us about your team.'
  },
];

const ROLES = [
  'Agency Owner',
  'Freelance Web Developer',
  'Product Manager / Team Lead',
  'UI/UX Designer',
  'Client / Reviewer',
  'Other'
];

export default function FeedbackClient() {
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get('category') as CategoryType | null;

  const [activeCategory, setActiveCategory] = useState<CategoryType>(
    initialCategoryParam && CATEGORIES.some(c => c.id === initialCategoryParam)
      ? initialCategoryParam
      : 'improve'
  );

  const [rating, setRating] = useState<number | null>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('Agency Owner');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Sync category if URL param changes
  useEffect(() => {
    const param = searchParams.get('category') as CategoryType | null;
    if (param && CATEGORIES.some(c => c.id === param)) {
      setActiveCategory(param);
    }
  }, [searchParams]);

  const currentCategoryObj = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 3) {
      setSubmitError('Please write a brief message before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const endpoint = `${baseUrl}/marketing/feedback`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: activeCategory,
          message: message.trim(),
          rating: rating,
          name: name.trim() || 'Anonymous User',
          email: email.trim() || undefined,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Server error occurred.');
      }

      setSubmitSuccess(true);
      setMessage('');
    } catch (err: any) {
      console.error('[FEEDBACK SUBMISSION ERROR]', err);
      setSubmitError(err.message || 'Could not send feedback. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text flex flex-col font-sans transition-colors duration-300">
      <MarketingNav />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Breadcrumb indicator */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-pm-muted">
          <Link href="/" className="hover:text-pm-text transition-colors">Home</Link>
          <span>/</span>
          <span className="text-pm-text font-semibold">Feedback & Suggestions</span>
        </nav>

        {/* Hero Title Section */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pm-surface border border-pm-border text-xs font-semibold text-pm-accent shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct to Founder Inbox</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-pm-text">
            Help Us Shape <span className="bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">STAGE</span>
          </h1>

          <p className="text-sm sm:text-base text-pm-muted max-w-2xl mx-auto leading-relaxed">
            Tell us what to improve, what features to add, or what to remove. Your suggestions go straight to our core development roadmap with zero email client popups.
          </p>
        </div>

        {/* Success State */}
        <AnimatePresence mode="wait">
          {submitSuccess ? (
            <motion.div
              key="success-box"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="p-8 sm:p-12 rounded-3xl bg-pm-surface border border-pm-border shadow-xl text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-pm-text tracking-tight">
                  Thank You for Your Feedback!
                </h2>
                <p className="text-sm text-pm-muted max-w-md mx-auto leading-relaxed">
                  Your feedback was delivered directly to the founder&apos;s email. We review every note to guide our next release.
                </p>
              </div>

              <div className="pt-4 flex flex-wrap gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(false);
                    setMessage('');
                  }}
                  className="px-6 py-3 rounded-xl bg-pm-surface-2 border border-pm-border hover:bg-pm-surface-3 text-xs font-bold text-pm-text transition-all active:scale-95 cursor-pointer"
                >
                  Send Another Suggestion
                </button>

                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl bg-pm-accent hover:bg-pm-accent-bright text-white text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-purple-500/20"
                >
                  <span>Return to Home</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form-box"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-pm-surface border border-pm-border rounded-3xl shadow-xl p-6 sm:p-10 space-y-8"
            >
              {/* Category Selection Tabs */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-pm-muted flex items-center gap-1.5">
                  <span>1. What is your feedback about?</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = activeCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setSubmitError(null);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-pm-surface-2 border-pm-accent shadow-md shadow-purple-500/10 ring-1 ring-pm-accent"
                            : "bg-pm-bg/60 border-pm-border hover:border-pm-border/80 hover:bg-pm-surface-2/60 text-pm-muted"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                          isSelected ? cat.bgLight : "bg-pm-surface border border-pm-border"
                        )}>
                          <Icon className={cn("w-4 h-4", cat.color)} />
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            "text-xs font-bold leading-tight truncate",
                            isSelected ? "text-pm-text" : "text-pm-muted"
                          )}>
                            {cat.shortLabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-pm-muted/80 pl-1 pt-1 italic">
                  {currentCategoryObj.description}
                </p>
              </div>

              {/* Star Rating Section */}
              <div className="space-y-2 pt-2 border-t border-pm-border">
                <label className="text-xs font-black uppercase tracking-wider text-pm-muted flex items-center justify-between">
                  <span>2. How would you rate your overall experience? (Optional)</span>
                  {rating && (
                    <span className="text-[11px] font-bold text-pm-accent normal-case">
                      {rating === 5 ? 'Exceptional ⭐' : rating === 4 ? 'Good ⭐' : rating === 3 ? 'Decent ⭐' : rating === 2 ? 'Needs Work' : 'Frustrating'}
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = (hoverRating !== null ? hoverRating : (rating || 0)) >= starVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer focus:outline-none"
                        aria-label={`Rate ${starVal} out of 5 stars`}
                      >
                        <Star
                          className={cn(
                            "w-6 h-6 transition-colors",
                            isFilled
                              ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                              : "text-pm-muted/30"
                          )}
                        />
                      </button>
                    );
                  })}

                  {rating && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="ml-3 text-[10px] text-pm-muted hover:text-pm-text underline cursor-pointer"
                    >
                      Clear rating
                    </button>
                  )}
                </div>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-6 pt-2 border-t border-pm-border">
                {/* Detailed Feedback Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="feedback-message"
                      className="text-xs font-black uppercase tracking-wider text-pm-muted flex items-center gap-1.5"
                    >
                      <span>3. Your Thoughts & Specifics *</span>
                    </label>
                    <span className="text-[10px] font-mono text-pm-muted">
                      {message.length} / 5000
                    </span>
                  </div>

                  <textarea
                    id="feedback-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder={currentCategoryObj.placeholder}
                    className="w-full p-4 rounded-2xl bg-pm-bg border border-pm-border focus:border-pm-accent focus:ring-2 focus:ring-purple-500/20 text-sm text-pm-text placeholder:text-pm-muted/60 transition-all outline-none resize-y min-h-[130px]"
                  />
                </div>

                {/* Sender Context: Role */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-pm-muted block">
                    4. What best describes your primary role?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                          selectedRole === role
                            ? "bg-pm-accent text-white border-pm-accent shadow-sm"
                            : "bg-pm-bg text-pm-muted border-pm-border hover:bg-pm-surface-2 hover:text-pm-text"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sender Info: Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="sender-name" 
                      className="text-xs font-black uppercase tracking-wider text-pm-muted"
                    >
                      Your Name (Optional)
                    </label>
                    <input
                      id="sender-name"
                      type="text"
                      placeholder="e.g. Alex Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-pm-bg border border-pm-border text-sm text-pm-text placeholder:text-pm-muted/50 focus:border-pm-accent outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label 
                      htmlFor="sender-email" 
                      className="text-xs font-black uppercase tracking-wider text-pm-muted flex items-center justify-between"
                    >
                      <span>Your Email (Optional)</span>
                    </label>
                    <input
                      id="sender-email"
                      type="email"
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-pm-bg border border-pm-border text-sm text-pm-text placeholder:text-pm-muted/50 focus:border-pm-accent outline-none transition-all"
                    />
                    <p className="text-[10px] text-pm-muted">
                      Add email if you want the founder to reply directly to you.
                    </p>
                  </div>
                </div>

                {/* Error Banner */}
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-center gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </motion.div>
                )}

                {/* Submit Action Bar */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-pm-border">
                  <div className="flex items-center gap-2 text-xs text-pm-muted text-center sm:text-left">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Direct submission · Never shared with third parties</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-pm-accent hover:bg-pm-accent-bright disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-purple-500/25 cursor-pointer disabled:pointer-events-none"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Directly...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Feedback</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Founder Direct Guarantee Card */}
        <div className="mt-12 p-6 rounded-2xl bg-pm-surface/50 border border-pm-border/60 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-bold text-pm-text">
              Direct Communication with Founder & Engineering
            </h3>
            <p className="text-xs text-pm-muted leading-relaxed">
              Every message submitted here arrives directly at <span className="font-mono text-pm-text">saumya@entrext.com</span>. We read every bug report and feature suggestion to plan upcoming STAGE versions.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
