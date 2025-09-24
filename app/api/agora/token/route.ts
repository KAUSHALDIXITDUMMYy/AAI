import { type NextRequest, NextResponse } from "next/server"
import { RtcTokenBuilder, RtcRole } from "agora-token"

const appId = "68f0e102b52f46efa1f6ef89f1df9691"
const appCertificate = "1e5f5b2b05874991b51f58cf99ba71d0"

// Generate proper Agora RTC token
function generateAgoraToken(channelName: string, uid: number, role: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const expiration = timestamp + 24 * 3600 // 24 hours

  // Convert role string to RtcRole enum
  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER

  // Generate the token using Agora's official token builder
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    expiration
  )

  return token
}

export async function POST(request: NextRequest) {
  try {
    const { channelName, uid, role } = await request.json()

    if (!channelName) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 })
    }

    // Generate proper Agora token
    const token = generateAgoraToken(channelName, uid || 0, role || "subscriber")

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Error generating Agora token:", error)
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
  }
}
