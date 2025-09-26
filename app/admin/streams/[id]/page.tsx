"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import AdminLayout from "@/components/admin/admin-layout"
import StreamBroadcaster from "@/components/admin/stream-broadcaster"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getAllStreams, getAllSubscribers, updateStream, type Stream, type UserProfile } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Users, Play, Square, CheckCircle, XCircle, Radio } from "lucide-react"

export default function StreamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [streams, setStreams] = useState<Stream[]>([])
  const [subscribers, setSubscribers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [streamingStates, setStreamingStates] = useState<Record<string, boolean>>({})
  const [selectedSubscribers, setSelectedSubscribers] = useState<Record<string, string[]>>({})
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  const streamId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streamsData, subscribersData] = await Promise.all([getAllStreams(), getAllSubscribers()])

        setStreams(streamsData)
        setSubscribers(subscribersData)
        
        // Initialize selected subscribers for each stream
        const initialSelectedSubscribers: Record<string, string[]> = {}
        streamsData.forEach(stream => {
          initialSelectedSubscribers[stream.id] = stream.assignedSubscribers || []
        })
        setSelectedSubscribers(initialSelectedSubscribers)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load stream data",
          variant: "destructive",
        })
        router.push("/admin/streams")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, toast])

  const handleStreamUpdate = (updatedStream: Stream) => {
    setStreams(prev => prev.map(stream => 
      stream.id === updatedStream.id ? updatedStream : stream
    ))
  }

  const handleStreamingStateChange = (streamId: string, isStreaming: boolean) => {
    setStreamingStates(prev => ({
      ...prev,
      [streamId]: isStreaming
    }))
  }

  const handleSubscriberToggle = async (streamId: string, subscriberId: string) => {
    const currentSelected = selectedSubscribers[streamId] || []
    const newSelectedSubscribers = currentSelected.includes(subscriberId)
      ? currentSelected.filter(id => id !== subscriberId)
      : [...currentSelected, subscriberId]

    setSelectedSubscribers(prev => ({
      ...prev,
      [streamId]: newSelectedSubscribers
    }))
    
    setUpdating(true)
    try {
      await updateStream(streamId, {
        assignedSubscribers: newSelectedSubscribers
      })
      setStreams(prev => prev.map(stream => 
        stream.id === streamId 
          ? { ...stream, assignedSubscribers: newSelectedSubscribers }
          : stream
      ))
      toast({
        title: "Success",
        description: "Subscriber assignment updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscriber assignment",
        variant: "destructive",
      })
      // Revert on error
      const stream = streams.find(s => s.id === streamId)
      if (stream) {
        setSelectedSubscribers(prev => ({
          ...prev,
          [streamId]: stream.assignedSubscribers || []
        }))
      }
    } finally {
      setUpdating(false)
    }
  }

  const assignAllSubscribers = async (streamId: string) => {
    const allSubscriberIds = subscribers.map(sub => sub.id)
    setSelectedSubscribers(prev => ({
      ...prev,
      [streamId]: allSubscriberIds
    }))
    
    setUpdating(true)
    try {
      await updateStream(streamId, {
        assignedSubscribers: allSubscriberIds
      })
      setStreams(prev => prev.map(stream => 
        stream.id === streamId 
          ? { ...stream, assignedSubscribers: allSubscriberIds }
          : stream
      ))
      toast({
        title: "Success",
        description: "All subscribers assigned to stream",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign subscribers",
        variant: "destructive",
      })
      const stream = streams.find(s => s.id === streamId)
      if (stream) {
        setSelectedSubscribers(prev => ({
          ...prev,
          [streamId]: stream.assignedSubscribers || []
        }))
      }
    } finally {
      setUpdating(false)
    }
  }

  const unassignAllSubscribers = async (streamId: string) => {
    setSelectedSubscribers(prev => ({
      ...prev,
      [streamId]: []
    }))
    
    setUpdating(true)
    try {
      await updateStream(streamId, {
        assignedSubscribers: []
      })
      setStreams(prev => prev.map(stream => 
        stream.id === streamId 
          ? { ...stream, assignedSubscribers: [] }
          : stream
      ))
      toast({
        title: "Success",
        description: "All subscribers unassigned from stream",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unassign subscribers",
        variant: "destructive",
      })
      const stream = streams.find(s => s.id === streamId)
      if (stream) {
        setSelectedSubscribers(prev => ({
          ...prev,
          [streamId]: stream.assignedSubscribers || []
        }))
      }
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Loading Streams">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    )
  }

  if (streams.length === 0) {
    return (
      <AdminLayout title="No Streams Found">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Streams Available</h3>
            <p className="text-gray-500 mb-4">No streams have been created yet.</p>
            <Button onClick={() => router.push("/admin/streams")}>Back to Streams</Button>
          </CardContent>
        </Card>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Multi-Stream Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push("/admin/streams")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Streams
            </Button>
            <div className="flex items-center space-x-2">
              <Badge variant="default">
                {streams.length} Stream{streams.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline">
                {Object.values(streamingStates).filter(Boolean).length} Live
              </Badge>
            </div>
          </div>
        </div>

        {/* Multi-Stream Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {streams.map((stream) => {
            const assignedSubscribers = subscribers.filter((sub) => 
              (selectedSubscribers[stream.id] || []).includes(sub.id)
            )
            
            return (
              <div key={stream.id} className="space-y-4">
                {/* Stream Broadcaster */}
                <StreamBroadcaster 
                  stream={stream} 
                  onStreamUpdate={handleStreamUpdate}
                  isStreaming={streamingStates[stream.id] || false}
                  onStreamingChange={(isStreaming) => handleStreamingStateChange(stream.id, isStreaming)}
                />

                {/* Stream Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{stream.title}</CardTitle>
                    <CardDescription>{stream.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Channel:</span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {stream.channelName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <Badge variant={stream.isActive ? "default" : "secondary"}>
                        {stream.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Assigned:</span>
                      <span>{assignedSubscribers.length} users</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`isActive-${stream.id}`}
                        checked={stream.isActive}
                        onCheckedChange={async (checked) => {
                          try {
                            await updateStream(stream.id, { isActive: checked })
                            handleStreamUpdate({ ...stream, isActive: checked })
                            toast({
                              title: "Success",
                              description: `Stream ${checked ? 'activated' : 'deactivated'}`,
                            })
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update stream status",
                              variant: "destructive",
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`isActive-${stream.id}`} className="text-sm">Active</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Subscriber Assignment */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Subscribers</CardTitle>
                        <CardDescription className="text-sm">
                          {assignedSubscribers.length} of {subscribers.length} assigned
                        </CardDescription>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => assignAllSubscribers(stream.id)} 
                          disabled={updating}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => unassignAllSubscribers(stream.id)} 
                          disabled={updating}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {subscribers.map((subscriber) => (
                        <div key={subscriber.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <span className="truncate">{subscriber.email}</span>
                          <Switch
                            checked={(selectedSubscribers[stream.id] || []).includes(subscriber.id)}
                            onCheckedChange={() => handleSubscriberToggle(stream.id, subscriber.id)}
                            disabled={updating}
                          />
                        </div>
                      ))}
                      {subscribers.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No subscribers available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}