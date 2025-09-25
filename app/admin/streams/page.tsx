"use client"

import type React from "react"
import { useRouter } from "next/navigation"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getAllStreams,
  getAllSubscribers,
  createStream,
  updateStream,
  deleteStream,
  assignStreamToSubscribers,
  type Stream,
  type UserProfile,
} from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Users, Radio, Mic, MicOff, Square, Monitor, MonitorOff, Play, Settings } from "lucide-react"
import StreamBroadcaster from "@/components/admin/stream-broadcaster"

// Client-side only Agora functions
const generateAgoraToken = async (channelName: string, uid: number, role: "publisher" | "subscriber") => {
  // This will only run on client side
  if (typeof window === 'undefined') return ''
  
  const { generateAgoraToken: generateToken } = await import('@/lib/agora')
  return generateToken(channelName, uid, role)
}

 const createChannelName = async (prefix: string) => {
  // Simple client-side channel name creation
  if (typeof window === 'undefined') return `${prefix}_${Date.now()}`
  
  const { createChannelName: createChannel } = await import('@/lib/agora')
  return createChannel(prefix)
}

export default function StreamsPage() {
  const router = useRouter()
  const [streams, setStreams] = useState<Stream[]>([])
  const [subscribers, setSubscribers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editingStream, setEditingStream] = useState<Stream | null>(null)
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    isActive: false,
  })
  const [bulkFormData, setBulkFormData] = useState({
    count: 1,
    prefix: "Stream",
    description: "",
    assignToAll: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [streamsData, subscribersData] = await Promise.all([getAllStreams(), getAllSubscribers()])
      setStreams(streamsData)
      setSubscribers(subscribersData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingStream) {
        // Update existing stream
        await updateStream(editingStream.id, formData)
        toast({
          title: "Success",
          description: "Stream updated successfully",
        })
      } else {
        // Create new stream - only generate token on client side
        const channelName = await createChannelName("new_stream")
        const token = await generateAgoraToken(channelName, 1, "publisher")

        await createStream({
          ...formData,
          channelName,
          token,
          createdBy: profile?.id || "",
          assignedSubscribers: [],
        })
        toast({
          title: "Success",
          description: "Stream created successfully",
        })
      }

      setDialogOpen(false)
      setEditingStream(null)
      setFormData({ title: "", description: "", isActive: false })
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save stream",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const allSubscriberIds = bulkFormData.assignToAll ? subscribers.map(s => s.id) : []
      
      for (let i = 1; i <= bulkFormData.count; i++) {
        const title = `${bulkFormData.prefix} ${i}`
        const channelName = await createChannelName(`bulk_${i}`)
        const token = await generateAgoraToken(channelName, i, "publisher")

        await createStream({
          title,
          description: bulkFormData.description,
          channelName,
          token,
          isActive: false,
          createdBy: profile?.id || "",
          assignedSubscribers: allSubscriberIds,
        })
      }

      toast({
        title: "Success",
        description: `${bulkFormData.count} streams created successfully`,
      })

      setBulkCreateDialogOpen(false)
      setBulkFormData({ count: 1, prefix: "Stream", description: "", assignToAll: false })
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create streams",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (stream: Stream) => {
    setEditingStream(stream)
    setFormData({
      title: stream.title,
      description: stream.description,
      isActive: stream.isActive,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (streamId: string) => {
    if (!confirm("Are you sure you want to delete this stream?")) return

    try {
      await deleteStream(streamId)
      toast({
        title: "Success",
        description: "Stream deleted successfully",
      })
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete stream",
        variant: "destructive",
      })
    }
  }

  const openCreateDialog = () => {
    setEditingStream(null)
    setFormData({ title: "", description: "", isActive: false })
    setDialogOpen(true)
  }

  const openAssignDialog = (stream: Stream) => {
    setSelectedStream(stream)
    setSelectedSubscribers(stream.assignedSubscribers || [])
    setAssignDialogOpen(true)
  }

  const handleAssignSubmit = async () => {
    if (!selectedStream) return

    setSubmitting(true)
    try {
      await assignStreamToSubscribers(selectedStream.id, selectedSubscribers)
      toast({
        title: "Success",
        description: "Stream assignments updated successfully",
      })
      setAssignDialogOpen(false)
      fetchData()
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

  const handleStreamUpdate = (updatedStream: Stream) => {
    setStreams((prev) => prev.map((stream) => (stream.id === updatedStream.id ? updatedStream : stream)))
  }

  const openBulkCreateDialog = () => {
    setBulkFormData({ count: 1, prefix: "Stream", description: "", assignToAll: false })
    setBulkCreateDialogOpen(true)
  }

  if (loading) {
    return (
      <AdminLayout title="Streams">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Multi-Stream Dashboard">
      <div className="space-y-6">
        {/* Header with stats and controls */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Multi-Stream Dashboard</h2>
            <p className="text-gray-600">Manage multiple audio streams simultaneously</p>
            <div className="flex space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {streams.filter(s => s.isActive).length} Active
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {streams.filter(s => !s.isActive).length} Inactive
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {subscribers.length} Total Subscribers
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table View
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Stream
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStream ? "Edit Stream" : "Create New Stream"}</DialogTitle>
                  <DialogDescription>
                    {editingStream ? "Update the stream information" : "Create a new audio stream for subscribers"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Stream Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active Stream</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : editingStream ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={bulkCreateDialogOpen} onOpenChange={setBulkCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openBulkCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Bulk Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Multiple Streams</DialogTitle>
                  <DialogDescription>
                    Create multiple streams at once with a common naming pattern
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="count">Number of Streams</Label>
                    <Input
                      id="count"
                      type="number"
                      min="1"
                      max="10"
                      value={bulkFormData.count}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, count: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Stream Name Prefix</Label>
                    <Input
                      id="prefix"
                      value={bulkFormData.prefix}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, prefix: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={bulkFormData.description}
                      onChange={(e) => setBulkFormData({ ...bulkFormData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="assignToAll"
                      checked={bulkFormData.assignToAll}
                      onCheckedChange={(checked) => setBulkFormData({ ...bulkFormData, assignToAll: checked })}
                    />
                    <Label htmlFor="assignToAll">Assign to all subscribers</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setBulkCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Creating..." : "Create Streams"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Streams Grid/Table */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => (
              <StreamBroadcaster
                key={stream.id}
                stream={stream}
                onStreamUpdate={handleStreamUpdate}
              />
            ))}
            {streams.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No streams yet</h3>
                <p className="text-gray-500 mb-4">Create your first stream to start broadcasting</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Stream
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Streams</CardTitle>
              <CardDescription>Total: {streams.length} streams</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Subscribers</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streams.map((stream) => (
                    <TableRow key={stream.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{stream.title}</p>
                          <p className="text-sm text-gray-500">{stream.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stream.isActive ? "default" : "secondary"}>
                          {stream.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{stream.assignedSubscribers?.length || 0}</TableCell>
                      <TableCell>{new Date(stream.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignDialog(stream)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(stream)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(stream.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {streams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No streams found. Create your first stream to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Assignment Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Stream to Subscribers</DialogTitle>
              <DialogDescription>
                Select which subscribers should have access to "{selectedStream?.title}"
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
              {subscribers.length === 0 && <p className="text-gray-500">No subscribers available</p>}
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
    </AdminLayout>
  )
}