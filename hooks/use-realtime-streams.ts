import { useEffect, useState } from "react"
import { subscribeToAssignedStreams, subscribeToStream, type Stream } from "@/lib/auth"

export const useRealtimeAssignedStreams = (streamIds: string[]) => {
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (streamIds.length === 0) {
      setStreams([])
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToAssignedStreams(streamIds, (updatedStreams) => {
      setStreams(updatedStreams)
      setLoading(false)
    })

    return unsubscribe
  }, [streamIds])

  return { streams, loading }
}

export const useRealtimeStream = (streamId: string) => {
  const [stream, setStream] = useState<Stream | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!streamId) {
      setStream(null)
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToStream(streamId, (updatedStream) => {
      setStream(updatedStream)
      setLoading(false)
    })

    return unsubscribe
  }, [streamId])

  return { stream, loading }
}
