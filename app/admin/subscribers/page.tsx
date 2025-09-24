"use client"

import type React from "react"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAllSubscribers, createSubscriber, updateSubscriber, deleteSubscriber, type UserProfile } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2 } from "lucide-react"

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSubscriber, setEditingSubscriber] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSubscribers()
  }, [])

  const fetchSubscribers = async () => {
    try {
      const data = await getAllSubscribers()
      setSubscribers(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subscribers",
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
      if (editingSubscriber) {
        // Update existing subscriber
        await updateSubscriber(editingSubscriber.id, { email: formData.email })
        toast({
          title: "Success",
          description: "Subscriber updated successfully",
        })
      } else {
        // Create new subscriber
        await createSubscriber(formData.email, formData.password)
        toast({
          title: "Success",
          description: "Subscriber created successfully",
        })
      }

      setDialogOpen(false)
      setEditingSubscriber(null)
      setFormData({ email: "", password: "" })
      fetchSubscribers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subscriber",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (subscriber: UserProfile) => {
    setEditingSubscriber(subscriber)
    setFormData({ email: subscriber.email, password: "" })
    setDialogOpen(true)
  }

  const handleDelete = async (subscriberId: string) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return

    try {
      await deleteSubscriber(subscriberId)
      toast({
        title: "Success",
        description: "Subscriber deleted successfully",
      })
      fetchSubscribers()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete subscriber",
        variant: "destructive",
      })
    }
  }

  const openCreateDialog = () => {
    setEditingSubscriber(null)
    setFormData({ email: "", password: "" })
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <AdminLayout title="Subscribers">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Subscribers">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Subscribers Management</h2>
            <p className="text-gray-600">Manage your platform subscribers</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subscriber
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSubscriber ? "Edit Subscriber" : "Create New Subscriber"}</DialogTitle>
                <DialogDescription>
                  {editingSubscriber ? "Update the subscriber information" : "Add a new subscriber to the platform"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                {!editingSubscriber && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingSubscriber ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Subscribers</CardTitle>
            <CardDescription>Total: {subscribers.length} subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Assigned Streams</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>{new Date(subscriber.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{subscriber.assignedStreams?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(subscriber)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subscriber.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {subscribers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No subscribers found. Create your first subscriber to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
