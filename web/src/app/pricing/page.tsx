'use client'

import { motion } from 'framer-motion'
import { Check, Layout, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const plans = [
  {
    name: "BASE",
    price: "0",
    desc: "For local dev & small probes.",
    features: ["3 Active Projects", "100 Markers / Project", "Basic Markdown Export", "14-Day Data retention"],
    color: "white/10"
  },
  {
    name: "CORE",
    price: "29",
    desc: "For serious product teams.",
    features: ["Infinity Projects", "Crystal Clarity (Screenshots)", "GitHub/Linear Triage Sync", "90-Day Interaction History", "Team RBAC Access"],
    color: "purple-600",
    accent: "bg-purple-600 shadow-xl shadow-purple-900/40"
  },
  {
    name: "NEXUS",
    price: "Custom",
    desc: "For the entire enterprise substrate.",
    features: ["SSO / SAML Identity", "Custom Integration Layer", "Priority Intelligence Node", "Infinity Retention", "On-Prem Deployment"],
    color: "white/10"
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-8 selection:bg-purple-500/20">
      <div className="max-w-6xl mx-auto space-y-20">
        <nav className="flex items-center justify-between h-20">
           <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                <Layout className="w-6 h-6" />
              </div>
              <span className="font-black text-2xl tracking-tighter">PixelMark</span>
           </Link>
           <Link href="/dashboard">
              <Button variant="ghost" className="text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest">
                Return to Dashboard <ArrowLeft className="ml-2 w-3 h-3" />
              </Button>
           </Link>
        </nav>

        <div className="text-center space-y-6">
          <h1 className="text-6xl font-black italic tracking-tighter">Choose your <span className="text-purple-500">Tier.</span></h1>
          <p className="text-white/40 max-w-lg mx-auto font-medium leading-relaxed">Select the subscription model that fits your team's visual audit intensity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-10 rounded-[40px] border border-white/5 bg-white/[0.02] flex flex-col gap-8 relative overflow-hidden group hover:border-white/10 transition-colors ${plan.accent || ''}`}
            >
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">{plan.name} TIER</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">${plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-white/20 text-sm font-bold">/MO</span>}
                </div>
                <p className="text-sm text-white/40 font-medium h-10">{plan.desc}</p>
              </div>

              <div className="flex-1 space-y-4 pt-4">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-[11px] font-bold text-white/60 tracking-tight">{f}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] hover:bg-white/90">
                Initialize Plan
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
