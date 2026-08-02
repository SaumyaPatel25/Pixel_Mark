import React from 'react'
import type { Metadata } from 'next'
import SettingsShell from '@/components/SettingsShell'
import NotificationSettingsClient from '@/components/settings/NotificationSettingsClient'

export const metadata: Metadata = {
  title: "Notification Preferences — STAGE",
  description: "Configure in-app and email delivery options for STAGE project sessions & Blueprint Canvas.",
  robots: {
    index: false,
    follow: false
  }
}

export default function NotificationSettingsPage() {
  return (
    <SettingsShell title="Notification Preferences" description="Configure in-app drawer and email notification channels across STAGE event sources.">
      <NotificationSettingsClient />
    </SettingsShell>
  )
}
