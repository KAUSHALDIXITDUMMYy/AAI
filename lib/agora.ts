import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type IMicrophoneAudioTrack,
  type ILocalVideoTrack,
} from "agora-rtc-sdk-ng"

export const AGORA_CONFIG = {
  appId: "68f0e102b52f46efa1f6ef89f1df9691",
  appCertificate: "1e5f5b2b05874991b51f58cf99ba71d0",
}

// Initialize Agora RTC client
export const createAgoraClient = () => {
  return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
}

export const generateAgoraToken = async (
  channelName: string,
  uid = 0,
  role: "publisher" | "subscriber" = "subscriber",
) => {
  try {
    const response = await fetch("/api/agora/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelName,
        uid,
        role,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate token")
    }

    const data = await response.json()
    return data.token
  } catch (error) {
    console.error("Error generating Agora token:", error)
    throw error
  }
}

export const createChannelName = (streamId: string) => {
  return `stream_${streamId}`
}

// Agora client wrapper class for easier management
export class AgoraManager {
  private client: IAgoraRTCClient
  private localAudioTrack: IMicrophoneAudioTrack | null = null
  private localScreenTrack: ILocalVideoTrack | null = null
  private isJoined = false
  private isScreenSharing = false

  constructor() {
    this.client = createAgoraClient()
  }

  // Join channel as broadcaster (admin)
  async joinAsBroadcaster(channelName: string, token: string, uid = 0) {
    try {
      await this.client.join(AGORA_CONFIG.appId, channelName, token, uid)
      this.isJoined = true

      // Create and publish audio track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "high_quality_stereo",
      })

      await this.client.publish([this.localAudioTrack])
      return true
    } catch (error) {
      console.error("Failed to join as broadcaster:", error)
      throw error
    }
  }

  async startScreenShare() {
    try {
      if (this.isScreenSharing) {
        throw new Error("Screen sharing is already active")
      }

      // Create screen sharing track with system audio
      this.localScreenTrack = await AgoraRTC.createScreenVideoTrack(
        {
          encoderConfig: "1080p_1",
          // Enable system audio capture
          withAudio: "enable",
        },
        "enable",
      )

      // If screen track includes audio, we need to handle it properly
      if (Array.isArray(this.localScreenTrack)) {
        // When withAudio is enabled, createScreenVideoTrack returns [videoTrack, audioTrack]
        const [screenVideoTrack, screenAudioTrack] = this.localScreenTrack
        await this.client.publish([screenVideoTrack, screenAudioTrack])
      } else {
        // Single video track without audio
        await this.client.publish([this.localScreenTrack])
      }

      this.isScreenSharing = true
      return true
    } catch (error) {
      console.error("Failed to start screen sharing:", error)
      throw error
    }
  }

  async stopScreenShare() {
    try {
      if (!this.isScreenSharing || !this.localScreenTrack) {
        return
      }

      // Unpublish and close screen tracks
      if (Array.isArray(this.localScreenTrack)) {
        const [screenVideoTrack, screenAudioTrack] = this.localScreenTrack
        await this.client.unpublish([screenVideoTrack, screenAudioTrack])
        screenVideoTrack.close()
        screenAudioTrack.close()
      } else {
        await this.client.unpublish([this.localScreenTrack])
        this.localScreenTrack.close()
      }

      this.localScreenTrack = null
      this.isScreenSharing = false
      return true
    } catch (error) {
      console.error("Failed to stop screen sharing:", error)
      throw error
    }
  }

  getScreenSharingStatus() {
    return this.isScreenSharing
  }

  // Join channel as subscriber (listener)
  async joinAsSubscriber(channelName: string, token: string, uid = 0) {
    try {
      await this.client.join(AGORA_CONFIG.appId, channelName, token, uid)
      this.isJoined = true

      // Set up remote user event handlers
      this.client.on("user-published", this.handleUserPublished.bind(this))
      this.client.on("user-unpublished", this.handleUserUnpublished.bind(this))

      return true
    } catch (error) {
      console.error("Failed to join as subscriber:", error)
      throw error
    }
  }

  private async handleUserPublished(user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") {
    if (mediaType === "audio") {
      await this.client.subscribe(user, mediaType)
      user.audioTrack?.play()
    } else if (mediaType === "video") {
      await this.client.subscribe(user, mediaType)
      // Video track can be played to a video element if needed
      // user.videoTrack?.play("video-container-id")
    }
  }

  private handleUserUnpublished(user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") {
    if (mediaType === "audio") {
      user.audioTrack?.stop()
    } else if (mediaType === "video") {
      user.videoTrack?.stop()
    }
  }

  // Mute/unmute local audio
  async setMuted(muted: boolean) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setMuted(muted)
    }
  }

  // Leave channel and cleanup
  async leave() {
    if (this.isScreenSharing) {
      await this.stopScreenShare()
    }

    if (this.localAudioTrack) {
      this.localAudioTrack.stop()
      this.localAudioTrack.close()
      this.localAudioTrack = null
    }

    if (this.isJoined) {
      await this.client.leave()
      this.isJoined = false
    }
  }

  // Get connection state
  getConnectionState() {
    return this.client.connectionState
  }

  // Get remote users
  getRemoteUsers() {
    return this.client.remoteUsers
  }
}
