"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { logoutUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface SubscriberLayoutProps {
  children: React.ReactNode
  title: string
}

export default function SubscriberLayout({ children, title }: SubscriberLayoutProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await logoutUser()
      toast({
        title: "Logged out successfully",
        description: "You have been logged out",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out",
        variant: "destructive",
      })
    }
  }

  if (profile?.role !== "subscriber") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don't have permission to access the subscriber panel.</p>
            <Button onClick={() => router.push("/login")} className="mt-4">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">My Streams</h1>
              <span className="text-gray-500">|</span>
              <h2 className="text-lg text-gray-700">{title}</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {profile?.email}</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
