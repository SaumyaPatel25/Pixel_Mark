import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import SettingsShell from '@/components/SettingsShell'
import ApiKeysClient from '@/components/settings/ApiKeys.client'

export const metadata: Metadata = {
  title: "API Keys Settings — STAGE",
  description: "Configure developer API credentials for STAGE visual testing suite.",
  robots: {
    index: false,
    follow: false
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

async function getApiKeysServerSide() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('stagetoken')?.value || cookieStore.get('pm_token')?.value || cookieStore.get('pmtoken')?.value
    if (!token) {
      return []
    }

    const res = await fetch(`${API_BASE}/settings/api-keys`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 0 }
    })
    if (!res.ok) {
      return []
    }
    return await res.json()
  } catch (err) {
    console.error("Error fetching API keys server-side:", err)
    return []
  }
}

export default async function SettingsPage() {
  const initialKeys = await getApiKeysServerSide()

  return (
    <SettingsShell title="API Keys" description="Generate and manage API keys for visual feedback integration.">
      <ApiKeysClient initialKeys={initialKeys} />
    </SettingsShell>
  )
}
