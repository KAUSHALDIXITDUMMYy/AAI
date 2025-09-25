"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AgoraManager, generateAgoraToken } from "@/lib/agora"
import { updateStream, getAllSubscribers, assignStreamToSubscribers, type Stream, type UserProfile } from "@/lib/auth"
import { Mic, MicOff, Radio, Square, Users, Monitor, MonitorOff, Settings, Plus, X, Play } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface StreamBroadcasterProps {
  stream: Stream
  onStreamUpdate: (stream: Stream) => void
}

export default function StreamBroadcaster({ stream, onStreamUpdate }: StreamBroadcasterProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(0)
  const [loading, setLoading] = useState(false)
  const [subscribers, setSubscribers] = useState<UserProfile[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const agoraManagerRef = useRef<AgoraManager | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Initialize Agora manager
    agoraManagerRef.current = new AgoraManager()
    
    // Load subscribers
    loadSubscribers()

    // Set up periodic status updates
    const statusInterval = setInterval(() => {
      if (agoraManagerRef.current && isStreaming) {
        const info = agoraManagerRef.current.getChannelInfo()
        setConnectedUsers(info.remoteUsers)
      }
    }, 2000)

    return () => {
      // Cleanup on unmount
      clearInterval(statusInterval)
      if (agoraManagerRef.current) {
        agoraManagerRef.current.leave()
      }
    }
  }, [isStreaming])

  const loadSubscribers = async () => {
    try {
      const subs = await getAllSubscribers()
      setSubscribers(subs)
    } catch (error) {
      console.error("Failed to load subscribers:", error)
    }
  }

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

  const toggleMute = async () => {
    if (!agoraManagerRef.current || !isStreaming) return

    try {
      await agoraManagerRef.current.setMuted(!isMuted)
      setIsMuted(!isMuted)
      toast({
        title: isMuted ? "Unmuted" : "Muted",
        description: `Microphone is now ${isMuted ? "unmuted" : "muted"}`,
      })
    } catch (error) {
      toast({
        title: "Failed to toggle mute",
        description: "Could not change microphone state",
        variant: "destructive",
      })
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

  const openAssignDialog = () => {
    setSelectedSubscribers(stream.assignedSubscribers || [])
    setAssignDialogOpen(true)
  }

  const handleAssignSubmit = async () => {
    setSubmitting(true)
    try {
      await assignStreamToSubscribers(stream.id, selectedSubscribers)
      const updatedStream = { ...stream, assignedSubscribers: selectedSubscribers }
      onStreamUpdate(updatedStream)
      toast({
        title: "Success",
        description: "Stream assignments updated successfully",
      })
      setAssignDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignments",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSubscriberSelection = (subscriberId: string) => {
    setSelectedSubscribers((prev) =>
      prev.includes(subscriberId) ? prev.filter((id) => id !== subscriberId) : [...prev, subscriberId],
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center space-x-2 truncate">
              <Radio className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{stream.title}</span>
            </CardTitle>
            <CardDescription className="text-xs truncate">{stream.description}</CardDescription>
          </div>
          <Badge variant={isStreaming ? "default" : "secondary"} className="ml-2">
            {isStreaming ? "Live" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stream Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="truncate">Channel: {stream.channelName}</span>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{connectedUsers}</span>
            </div>
          </div>
        </div>

        {/* Broadcasting Controls */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isStreaming ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-200 text-gray-400"
              }`}
            >
              <Radio className="h-5 w-5" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-600">
              {isStreaming
                ? "Broadcasting to assigned subscribers"
                : "Ready to broadcast"}
            </p>
            {isScreenSharing && <p className="text-xs text-blue-600 mt-1">Screen sharing active</p>}
          </div>

          <div className="flex justify-center space-x-2">
            {!isStreaming ? (
              <Button onClick={startStreaming} disabled={loading} size="sm" className="bg-red-600 hover:bg-red-700">
                <Play className="h-3 w-3 mr-1" />
                {loading ? "Starting..." : "Start"}
              </Button>
            ) : (
              <>
                <Button onClick={stopStreaming} disabled={loading} variant="outline" size="sm">
                  <Square className="h-3 w-3 mr-1" />
                  {loading ? "Stopping..." : "Stop"}
                </Button>
                <Button onClick={toggleMute} variant="outline" size="sm">
                  {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                </Button>
                <Button onClick={toggleScreenShare} variant="outline" size="sm">
                  {isScreenSharing ? <MonitorOff className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stream Status and Actions */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{stream.assignedSubscribers?.length || 0}</div>
            <div className="text-xs text-gray-500">Assigned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{connectedUsers}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
        </div>

        {/* Subscriber Management */}
        <div className="pt-2">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Users className="h-3 w-3 mr-1" />
                Manage Subscribers
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Subscribers for "{stream.title}"</DialogTitle>
                <DialogDescription>
                  Assign or remove subscribers from this stream
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {subscribers.map((subscriber) => (
                  <div key={subscriber.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={subscriber.id}
                      checked={selectedSubscribers.includes(subscriber.id)}
                      onCheckedChange={() => toggleSubscriberSelection(subscriber.id)}
                    />
                    <Label htmlFor={subscriber.id} className="flex-1">
                      {subscriber.email}
                    </Label>
                  </div>
                ))}
                {subscribers.length === 0 && <p className="text-gray-500 text-sm">No subscribers available</p>}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignSubmit} disabled={submitting}>
                  {submitting ? "Updating..." : "Update Assignments"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
