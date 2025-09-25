"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import SubscriberLayout from "@/components/subscriber/subscriber-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRealtimeAssignedStreams } from "@/hooks/use-realtime-streams"
import { type Stream } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Radio, Clock, Play } from "lucide-react"

export default function SubscriberDashboard() {
  const { profile } = useAuth()
  const { streams: assignedStreams, loading } = useRealtimeAssignedStreams(profile?.assignedStreams || [])
  const { toast } = useToast()
  const router = useRouter()

  const handleJoinStream = (stream: Stream) => {
    if (!stream.isActive) {
      toast({
        title: "Stream Unavailable",
        description: "This stream is currently inactive",
        variant: "destructive",
      })
      return
    }

    router.push(`/subscriber/stream/${stream.id}`)
  }

  if (loading) {
    return (
      <SubscriberLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </SubscriberLayout>
    )
  }

  return (
    <SubscriberLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Streams</CardTitle>
              <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedStreams.length}</div>
              <p className="text-xs text-muted-foreground">Available to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedStreams.filter((s) => s.isActive).length}</div>
              <p className="text-xs text-muted-foreground">Ready to listen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Since</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">Join date</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Your Assigned Streams</h2>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          </div>
          {assignedStreams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Streams Assigned</h3>
                <p className="text-gray-500">You don't have any streams assigned to you yet.</p>
                <p className="text-gray-500">Contact your administrator to get access to streams.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedStreams.map((stream) => (
                <Card key={stream.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{stream.title}</CardTitle>
                      <Badge variant={stream.isActive ? "default" : "secondary"}>
                        {stream.isActive ? "Live" : "Offline"}
                      </Badge>
                    </div>
                    <CardDescription>{stream.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-gray-500">
                        Created: {new Date(stream.createdAt).toLocaleDateString()}
                      </div>
                      <Button
                        onClick={() => handleJoinStream(stream)}
                        disabled={!stream.isActive}
                        className="w-full"
                        variant={stream.isActive ? "default" : "outline"}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {stream.isActive ? "Join Stream" : "Stream Offline"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </SubscriberLayout>
  )
}
