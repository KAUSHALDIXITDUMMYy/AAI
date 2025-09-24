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
import { Plus, Edit, Trash2, Users, Radio } from "lucide-react"

// Client-side only Agora functions
const generateAgoraToken = async (channelName: string, uid: number, role: string) => {
  // This will only run on client side
  if (typeof window === 'undefined') return ''
  
  const { generateAgoraToken: generateToken } = await import('@/lib/agora')
  return generateToken(channelName, uid, role)
}

const createChannelName = (prefix: string) => {
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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editingStream, setEditingStream] = useState<Stream | null>(null)
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    isActive: false,
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
    <AdminLayout title="Streams">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Streams Management</h2>
            <p className="text-gray-600">Create and manage your audio streams</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
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
        </div>

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
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          stream.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {stream.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>{stream.assignedSubscribers?.length || 0}</TableCell>
                    <TableCell>{new Date(stream.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/streams/${stream.id}`)}
                          title="Broadcast Stream"
                        >
                          <Radio className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openAssignDialog(stream)}>
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