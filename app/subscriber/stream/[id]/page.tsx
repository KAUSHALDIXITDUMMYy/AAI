"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import SubscriberLayout from "@/components/subscriber/subscriber-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getStreamById, type Stream } from "@/lib/auth"
import { AgoraManager, generateAgoraToken } from "@/lib/agora"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Volume2, VolumeX, Radio, Users } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"

export default function StreamPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [stream, setStream] = useState<Stream | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [connectionState, setConnectionState] = useState("DISCONNECTED")
  const [remoteUsers, setRemoteUsers] = useState(0)
  const agoraManagerRef = useRef<AgoraManager | null>(null)
  const { toast } = useToast()

  const streamId = params.id as string

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

  useEffect(() => {
    if (!profile) return

    // Check if user has access to this stream
    if (!profile.assignedStreams?.includes(streamId)) {
      toast({
        title: "Access denied",
        description: "You don't have access to this stream",
        variant: "destructive",
      })
      router.push("/subscriber")
      return
    }

    // Set up real-time listener for stream changes
    const unsubscribeStream = onSnapshot(
      doc(db, "streams", streamId),
      (doc) => {
        if (doc.exists()) {
          const streamData = { id: doc.id, ...doc.data() } as Stream
          setStream(streamData)
        } else {
          toast({
            title: "Stream not found",
            description: "The requested stream could not be found",
            variant: "destructive",
          })
          router.push("/subscriber")
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error listening to stream changes:", error)
        toast({
          title: "Error",
          description: "Failed to load stream",
          variant: "destructive",
        })
        router.push("/subscriber")
        setLoading(false)
      }
    )

    return () => {
      unsubscribeStream()
    }
  }, [streamId, profile, router, toast])

  const handleConnect = async () => {
    if (!stream?.isActive || !agoraManagerRef.current) {
      toast({
        title: "Stream Unavailable",
        description: "This stream is currently inactive",
        variant: "destructive",
      })
      return
    }

    try {
      // Generate unique subscriber ID
      const subscriberId = Math.floor(Math.random() * 10000) + 1000

      const token = await generateAgoraToken(stream.channelName, subscriberId, "subscriber")

      // Join as subscriber
      await agoraManagerRef.current.joinAsSubscriber(stream.channelName, token, subscriberId)

      setIsConnected(true)
      setConnectionState("CONNECTED")
      toast({
        title: "Connected to stream",
        description: `You are now listening to ${stream.title}`,
      })

      // Monitor connection state
      const interval = setInterval(() => {
        if (agoraManagerRef.current) {
          const state = agoraManagerRef.current.getConnectionState()
          const users = agoraManagerRef.current.getRemoteUsers()
          setConnectionState(state)
          setRemoteUsers(users.length)
        }
      }, 1000)

      return () => clearInterval(interval)
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to stream",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = async () => {
    if (!agoraManagerRef.current) return

    try {
      await agoraManagerRef.current.leave()
      setIsConnected(false)
      setConnectionState("DISCONNECTED")
      setRemoteUsers(0)
      toast({
        title: "Disconnected",
        description: "You have left the stream",
      })
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: "Could not disconnect from stream",
        variant: "destructive",
      })
    }
  }

  const toggleMute = () => {
    // Note: For subscribers, this would mute the playback locally
    setIsMuted(!isMuted)
    toast({
      title: isMuted ? "Unmuted" : "Muted",
      description: `Audio playback is now ${isMuted ? "unmuted" : "muted"}`,
    })
  }

  if (loading) {
    return (
      <SubscriberLayout title="Loading Stream">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </SubscriberLayout>
    )
  }

  if (!stream) {
    return (
      <SubscriberLayout title="Stream Not Found">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Stream Not Found</h3>
            <p className="text-gray-500 mb-4">The requested stream could not be found.</p>
            <Button onClick={() => router.push("/subscriber")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </SubscriberLayout>
    )
  }

  return (
    <SubscriberLayout title={stream.title}>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/subscriber")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{stream.title}</CardTitle>
                    <CardDescription className="mt-2">{stream.description}</CardDescription>
                  </div>
                  <Badge variant={stream.isActive ? "default" : "secondary"} className="ml-4">
                    {stream.isActive ? "Live" : "Offline"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Audio Player Interface */}
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center ${
                          isConnected && stream.isActive
                            ? "bg-green-100 text-green-600 animate-pulse"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        <Radio className="h-12 w-12" />
                      </div>
                    </div>

                    <h3 className="text-lg font-medium mb-2">
                      {isConnected ? "Listening to Audio Stream" : "Audio Stream Ready"}
                    </h3>

                    <p className="text-gray-600 mb-6">
                      {isConnected
                        ? "You are connected to the live audio stream"
                        : stream.isActive
                          ? "Click connect to start listening"
                          : "Stream is currently offline"}
                    </p>

                    <div className="flex justify-center space-x-4">
                      {!isConnected ? (
                        <Button onClick={handleConnect} disabled={!stream.isActive} size="lg">
                          Connect to Stream
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleDisconnect} variant="outline" size="lg">
                            Disconnect
                          </Button>
                          <Button onClick={toggleMute} variant="outline" size="lg">
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          connectionState === "CONNECTED" && stream.isActive ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {connectionState === "CONNECTED" && stream.isActive
                          ? "Connected"
                          : stream.isActive
                            ? "Ready to Connect"
                            : "Stream Offline"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      {isConnected && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{remoteUsers} broadcasters</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Audio:</span>
                            <span className="text-sm font-medium">{isMuted ? "Muted" : "Playing"}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stream Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm">{stream.isActive ? "Live" : "Offline"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Connection</label>
                  <p className="text-sm">{connectionState}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm">{new Date(stream.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Channel</label>
                  <p className="text-sm font-mono text-xs bg-gray-100 p-2 rounded">{stream.channelName}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audio Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>• Audio-only streaming</p>
                  <p>• System audio included</p>
                  <p>• Real-time playback</p>
                  <p>• Local mute controls</p>
                  <p>• High-quality stereo</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SubscriberLayout>
  )
}
