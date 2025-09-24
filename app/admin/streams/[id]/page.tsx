"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import AdminLayout from "@/components/admin/admin-layout"
import StreamBroadcaster from "@/components/admin/stream-broadcaster"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getStreamById, getAllSubscribers, type Stream, type UserProfile } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"

export default function StreamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [stream, setStream] = useState<Stream | null>(null)
  const [subscribers, setSubscribers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const streamId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streamData, subscribersData] = await Promise.all([getStreamById(streamId), getAllSubscribers()])

        if (!streamData) {
          toast({
            title: "Stream not found",
            description: "The requested stream could not be found",
            variant: "destructive",
          })
          router.push("/admin/streams")
          return
        }

        setStream(streamData)
        setSubscribers(subscribersData)
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
  }, [streamId, router, toast])

  const handleStreamUpdate = (updatedStream: Stream) => {
    setStream(updatedStream)
  }

  if (loading) {
    return (
      <AdminLayout title="Loading Stream">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!stream) {
    return (
      <AdminLayout title="Stream Not Found">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Stream Not Found</h3>
            <p className="text-gray-500 mb-4">The requested stream could not be found.</p>
            <Button onClick={() => router.push("/admin/streams")}>Back to Streams</Button>
          </CardContent>
        </Card>
      </AdminLayout>
    )
  }

  const assignedSubscribers = subscribers.filter((sub) => stream.assignedSubscribers?.includes(sub.id))

  return (
    <AdminLayout title={stream.title}>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/admin/streams")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Streams
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StreamBroadcaster stream={stream} onStreamUpdate={handleStreamUpdate} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stream Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-sm">{stream.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm">{stream.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm">{new Date(stream.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Channel Name</label>
                  <p className="text-sm font-mono text-xs bg-gray-100 p-2 rounded">{stream.channelName}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assigned Subscribers</CardTitle>
                <CardDescription>{assignedSubscribers.length} users assigned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignedSubscribers.map((subscriber) => (
                    <div key={subscriber.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{subscriber.email}</span>
                    </div>
                  ))}
                  {assignedSubscribers.length === 0 && <p className="text-sm text-gray-500">No subscribers assigned</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
