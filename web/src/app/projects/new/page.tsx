'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Globe, FileText, Layout, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewProject() {
  const router = useRouter();
  const createProject = useProjectStore((state) => state.createProject);
  const loading = useProjectStore((state) => state.loading);

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
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20" />
              <span className="font-bold text-lg tracking-tighter">STAGE</span>
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
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/40">Project Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
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
