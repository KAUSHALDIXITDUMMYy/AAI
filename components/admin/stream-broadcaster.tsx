"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AgoraManager, generateAgoraToken } from "@/lib/agora"
import { updateStream, type Stream } from "@/lib/auth"
import { Radio, Square, Users, Monitor, MonitorOff } from "lucide-react"

interface StreamBroadcasterProps {
  stream: Stream
  onStreamUpdate: (stream: Stream) => void
  isStreaming?: boolean
  onStreamingChange?: (isStreaming: boolean) => void
}

export default function StreamBroadcaster({ 
  stream, 
  onStreamUpdate, 
  isStreaming: externalIsStreaming, 
  onStreamingChange 
}: StreamBroadcasterProps) {
  const [isStreaming, setIsStreaming] = useState(externalIsStreaming || false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(0)
  const [loading, setLoading] = useState(false)
  const agoraManagerRef = useRef<AgoraManager | null>(null)
  const { toast } = useToast()

  // Sync with external streaming state
  useEffect(() => {
    if (externalIsStreaming !== undefined) {
      setIsStreaming(externalIsStreaming)
    }
  }, [externalIsStreaming])

  useEffect(() => {
    // Initialize Agora manager
    agoraManagerRef.current = new AgoraManager()

    return () => {
      // Cleanup on unmount
      if (agoraManagerRef.current) {
        agoraManagerRef.current.leave()
      }
    }
  }, [])

  const startStreaming = async () => {
    if (!agoraManagerRef.current) return

    setLoading(true)
    try {
      const token = await generateAgoraToken(stream.channelName, 1, "publisher")

      // Join as broadcaster
      await agoraManagerRef.current.joinAsBroadcaster(stream.channelName, token, 1)

      // Update stream status to active
      await updateStream(stream.id, { isActive: true })

      setIsStreaming(true)
      onStreamingChange?.(true)
      toast({
        title: "Streaming started",
        description: `Broadcasting "${stream.title}" live`,
      })

      // Update parent component
      onStreamUpdate({ ...stream, isActive: true })
    } catch (error: any) {
      toast({
        title: "Failed to start stream",
        description: error.message || "Could not start broadcasting",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const stopStreaming = async () => {
    if (!agoraManagerRef.current) return

    setLoading(true)
    try {
      // Leave channel
      await agoraManagerRef.current.leave()

      // Update stream status to inactive
      await updateStream(stream.id, { isActive: false })

      setIsStreaming(false)
      onStreamingChange?.(false)
      setIsScreenSharing(false)
      setConnectedUsers(0)
      toast({
        title: "Streaming stopped",
        description: "Broadcast has ended",
      })

      // Update parent component
      onStreamUpdate({ ...stream, isActive: false })
    } catch (error: any) {
      toast({
        title: "Failed to stop stream",
        description: error.message || "Could not stop broadcasting",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  const toggleScreenShare = async () => {
    if (!agoraManagerRef.current || !isStreaming) return

    try {
      if (isScreenSharing) {
        await agoraManagerRef.current.stopScreenShare()
        setIsScreenSharing(false)
        toast({
          title: "Screen sharing stopped",
          description: "No longer sharing your screen",
        })
      } else {
        await agoraManagerRef.current.startScreenShare()
        setIsScreenSharing(true)
        toast({
          title: "Screen sharing started",
          description: "Now sharing your screen with system audio",
        })
      }
    } catch (error: any) {
      toast({
        title: "Failed to toggle screen share",
        description: error.message || "Could not change screen sharing state",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Radio className="h-5 w-5" />
              <span>Stream Broadcaster</span>
            </CardTitle>
            <CardDescription>Control your live system audio stream with screen sharing</CardDescription>
          </div>
          <Badge variant={isStreaming ? "default" : "secondary"}>{isStreaming ? "Live" : "Offline"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stream Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">{stream.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{stream.description}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Channel: {stream.channelName}</span>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{connectedUsers} listeners</span>
            </div>
          </div>
        </div>

        {/* Broadcasting Controls */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isStreaming ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-200 text-gray-400"
              }`}
            >
              <Radio className="h-8 w-8" />
            </div>
          </div>

          <div className="text-center">
            <h3 className="font-medium mb-2">{isStreaming ? "Broadcasting Live" : "Ready to Broadcast"}</h3>
            <p className="text-sm text-gray-600">
              {isStreaming
                ? "Your system audio is being streamed to assigned subscribers"
                : "Click start to begin broadcasting your system audio"}
            </p>
            {isScreenSharing && <p className="text-sm text-blue-600 mt-1">Screen sharing active with system audio</p>}
          </div>

          <div className="flex justify-center space-x-3">
            {!isStreaming ? (
              <Button onClick={startStreaming} disabled={loading} size="lg" className="bg-red-600 hover:bg-red-700">
                <Radio className="h-4 w-4 mr-2" />
                {loading ? "Starting..." : "Start Streaming"}
              </Button>
            ) : (
              <>
                <Button onClick={stopStreaming} disabled={loading} variant="outline" size="lg">
                  <Square className="h-4 w-4 mr-2" />
                  {loading ? "Stopping..." : "Stop Stream"}
                </Button>
                <Button onClick={toggleScreenShare} variant="outline" size="lg">
                  {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stream Status */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stream.assignedSubscribers?.length || 0}</div>
            <div className="text-sm text-gray-500">Assigned Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{connectedUsers}</div>
            <div className="text-sm text-gray-500">Active Listeners</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
