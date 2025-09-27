"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import SubscriberLayout from "@/components/subscriber/subscriber-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getStreamById, getUserProfile, type Stream } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Radio, Clock, Play } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore"

export default function SubscriberDashboard() {
  const { profile } = useAuth()
  const [assignedStreams, setAssignedStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    console.log("Subscriber Dashboard - Profile ID:", profile.id)
    console.log("Subscriber Dashboard - Profile:", profile)

    // Function to load assigned streams
    const loadAssignedStreams = async () => {
      try {
        // Get the latest profile data
        const latestProfile = await getUserProfile(profile.id)
        if (!latestProfile) {
          console.log("Subscriber Dashboard - Profile not found")
          setAssignedStreams([])
          setLoading(false)
          return
        }

        console.log("Subscriber Dashboard - Latest Profile:", latestProfile)
        const assignedStreamIds = latestProfile.assignedStreams || []
        console.log("Subscriber Dashboard - Assigned Stream IDs:", assignedStreamIds)
        
        if (assignedStreamIds.length === 0) {
          setAssignedStreams([])
          setLoading(false)
          return
        }

        // Fetch stream details for assigned streams
        const streamPromises = assignedStreamIds.map((streamId: string) => getStreamById(streamId))
        const streams = await Promise.all(streamPromises)
        const validStreams = streams.filter((stream): stream is Stream => stream !== null)
        console.log("Subscriber Dashboard - Valid Streams:", validStreams)
        setAssignedStreams(validStreams)
      } catch (error) {
        console.error("Error fetching stream details:", error)
        toast({
          title: "Error",
          description: "Failed to fetch stream details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    // Load streams immediately
    loadAssignedStreams()

    // Set up real-time listener for user profile changes
    const unsubscribeProfile = onSnapshot(
      doc(db, "users", profile.id),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data()
          console.log("Subscriber Dashboard - User Data (Real-time):", userData)
          const assignedStreamIds = userData.assignedStreams || []
          
          if (assignedStreamIds.length === 0) {
            setAssignedStreams([])
            return
          }

          try {
            // Fetch stream details for assigned streams
            const streamPromises = assignedStreamIds.map((streamId: string) => getStreamById(streamId))
            const streams = await Promise.all(streamPromises)
            const validStreams = streams.filter((stream): stream is Stream => stream !== null)
            console.log("Subscriber Dashboard - Valid Streams (Real-time):", validStreams)
            setAssignedStreams(validStreams)
          } catch (error) {
            console.error("Error fetching stream details (real-time):", error)
          }
        } else {
          console.log("Subscriber Dashboard - User document does not exist (real-time)")
          setAssignedStreams([])
        }
      },
      (error) => {
        console.error("Error listening to profile changes:", error)
      }
    )

    return () => {
      unsubscribeProfile()
    }
  }, [profile?.id, toast])

  // Set up real-time listeners for stream status changes
  useEffect(() => {
    if (assignedStreams.length === 0) return

    const unsubscribeStreams = assignedStreams.map((stream) => {
      return onSnapshot(
        doc(db, "streams", stream.id),
        (doc) => {
          if (doc.exists()) {
            const updatedStream = { id: doc.id, ...doc.data() } as Stream
            
            setAssignedStreams(prevStreams => 
              prevStreams.map(s => 
                s.id === stream.id ? updatedStream : s
              )
            )
          }
        },
        (error) => {
          console.error(`Error listening to stream ${stream.id}:`, error)
        }
      )
    })

    return () => {
      unsubscribeStreams.forEach(unsubscribe => unsubscribe())
    }
  }, [assignedStreams.map(s => s.id).join(',')])

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
          <h2 className="text-2xl font-bold mb-4">Your Assigned Streams</h2>
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
