'use client'
import React from 'react'
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShareLinkButtonProps {
  onClick: () => void
  active?: boolean
}

export function ShareLinkButton({ onClick, active }: ShareLinkButtonProps) {
  return (
    <Button 
      onClick={onClick}
      variant="outline"
      className={cn(
         "rounded-2xl h-11 px-6 bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest transition-all",
         active ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40" : "hover:bg-white/10"
      )}
    >
      <Link2 className="w-4 h-4 mr-2" />
      Share Link
    </Button>
  )
}
