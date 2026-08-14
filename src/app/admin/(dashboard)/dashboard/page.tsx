'use client'

import AICallingDashboard from '../ai-calling-agents/tabs/DashboardTab'

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Platform Dashboard</h1>
        <p className="text-primary-100 text-lg">Welcome back! Here&apos;s your calling overview</p>
      </div>

      <div className="mt-6">
        <div className="animate-fade-in">
          <AICallingDashboard />
        </div>
      </div>
    </div>
  )
}

