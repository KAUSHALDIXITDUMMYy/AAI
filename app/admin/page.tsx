"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllSubscribers, getAllStreams, type UserProfile, type Stream } from "@/lib/auth"
import { Users, Radio, Activity } from "lucide-react"

export default function AdminDashboard() {
  const [subscribers, setSubscribers] = useState<UserProfile[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subscribersData, streamsData] = await Promise.all([getAllSubscribers(), getAllStreams()])
        setSubscribers(subscribersData)
        setStreams(streamsData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <AdminLayout title="Overview">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    )
  }

  const activeStreams = streams.filter((stream) => stream.isActive)

  return (
    <AdminLayout title="Overview">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscribers.length}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streams.length}</div>
            <p className="text-xs text-muted-foreground">Created streams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStreams.length}</div>
            <p className="text-xs text-muted-foreground">Currently broadcasting</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Subscribers</CardTitle>
            <CardDescription>Latest registered subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscribers.slice(0, 5).map((subscriber) => (
                <div key={subscriber.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{subscriber.email}</p>
                    <p className="text-sm text-gray-500">
                      Joined {new Date(subscriber.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {subscriber.assignedStreams?.length || 0} streams assigned
                  </div>
                </div>
              ))}
              {subscribers.length === 0 && <p className="text-gray-500">No subscribers yet</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Streams</CardTitle>
            <CardDescription>Latest created streams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {streams.slice(0, 5).map((stream) => (
                <div key={stream.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{stream.title}</p>
                    <p className="text-sm text-gray-500">Created {new Date(stream.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        stream.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {stream.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
              {streams.length === 0 && <p className="text-gray-500">No streams yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
