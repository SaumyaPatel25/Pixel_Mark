'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { useBillingStore } from '@/store/useBillingStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Globe, FileText, Layout, Loader2, AlertCircle, Sparkles, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewProject() {
  const router = useRouter();
  const { projects, fetchProjects, createProject, loading } = useProjectStore();
  const { isPaid, currentPlan, fetchBillingStatus } = useBillingStore();

  useEffect(() => {
    fetchProjects();
    fetchBillingStatus();
  }, [fetchProjects, fetchBillingStatus]);

  const projectLimit = isPaid ? (currentPlan === 'enterprise' ? 999 : 10) : 1;
  const isAtProjectLimit = projects.length >= projectLimit;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_url: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.target_url) return;
    setError(null);

    try {
      const project = await createProject({
        name: formData.name,
        description: formData.description,
        url: formData.target_url,
      });
      router.push(`/dashboard`); // Go back to dashboard to see the new project
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize project. Please check your connection or login status.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-['Inter'] antialiased p-8">
      <div className="max-w-2xl mx-auto w-full space-y-12 pt-12">
        {/* Navigation */}
        <div className="flex items-center justify-between">
           <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard')}
              className="rounded-full bg-white/5 border border-white/5 hover:bg-white/10"
           >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
           </Button>

           <div className="flex items-center gap-3">
              {/* Project Capacity Counter Badge */}
              <span className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs select-none ${
                isAtProjectLimit && !isPaid
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAtProjectLimit && !isPaid ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                <span>{projects.length} / {projectLimit === 999 ? '∞' : projectLimit} projects</span>
              </span>

              <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20" />
                 <span className="font-bold text-lg tracking-tighter">STAGE</span>
              </div>
           </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">New Project</h1>
            <p className="text-white/40">Launch a new interactive feedback session for any website.</p>
          </div>

          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden">
            <CardHeader className="p-8 pb-0">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/40">
                 {isAtProjectLimit && !isPaid ? 'Upgrade to Team Plan' : 'Project Configuration'}
               </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {isAtProjectLimit && !isPaid ? (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white">Project Limit Reached (1 / 1)</h3>
                    <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
                      You are using 1 of 1 active projects on the Free plan. Upgrade to the <strong>Team Plan</strong> to unlock 10 projects, 5 seats, and live Blueprint DOM on-page editing.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-3 text-xs max-w-md mx-auto">
                    <div className="flex items-center gap-2.5 text-white/90 font-bold">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>10 Active Projects (vs 1 on Free)</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-white/90 font-bold">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>5 Developer Seats & Real-time Sync</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-white/90 font-bold">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Live Blueprint DOM on-page editing</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 max-w-md mx-auto">
                    <Link
                      href="/pricing"
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs text-center uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
                    >
                      Upgrade to Team Plan →
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/dashboard')}
                      className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60 hover:text-white transition-all cursor-pointer"
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                    <Layout className="w-3 h-3 text-purple-500" />
                    Project Identity
                  </label>
                  <Input 
                    required
                    placeholder="e.g. Acme Marketing Refresh"
                    className="h-12 bg-white/5 border-white/5 focus-visible:ring-purple-500/50"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Target URL */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                    <Globe className="w-3 h-3 text-purple-500" />
                    Target App / Site URL
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium transition-colors group-focus-within:text-purple-400">
                      https://
                    </div>
                    <Input 
                      required
                      placeholder="acme-corp.com"
                      className="h-12 pl-16 bg-white/5 border-white/5 focus-visible:ring-purple-500/50"
                      value={formData.target_url.replace('https://', '').replace('http://', '')}
                      onChange={(e) => setFormData({ ...formData, target_url: `https://${e.target.value}` })}
                    />
                  </div>
                  {formData.target_url.replace('https://', '').replace('http://', '').trim() && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-amber-400 text-xs mt-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                      <p className="text-[11px] text-amber-300/90 leading-relaxed font-medium">
                        The website address cannot be changed after you create the project. To review a different site, create a new project.
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
                    <FileText className="w-3 h-3 text-purple-500" />
                    Mission Statement (Optional)
                  </label>
                  <textarea 
                    placeholder="What specific components or flows need review?"
                    rows={4}
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-white placeholder:text-white/20 resize-none transition-all"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium">
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    disabled={loading || !formData.name || !formData.target_url}
                    className="w-full h-14 bg-white text-black hover:bg-white/90 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-white/5 disabled:opacity-20 active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Initialize Project'
                    )}
                  </Button>
                </div>
              </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <footer className="mt-auto p-12 text-center text-white/10 text-[10px] font-bold uppercase tracking-[0.3em]">
        © 2024 • Build with STAGE Engine
      </footer>
    </div>
  );
}
