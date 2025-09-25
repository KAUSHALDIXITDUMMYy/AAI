"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserProfile, subscribeToUserProfile, type UserProfile } from "@/lib/auth"

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user)

      if (user) {
        try {
          // First get initial profile
          const userProfile = await getUserProfile(user.uid)
          setProfile(userProfile)
          
          // Then set up real-time listener for profile updates
          unsubscribeProfile = subscribeToUserProfile(user.uid, (updatedProfile) => {
            setProfile(updatedProfile)
          })
        } catch (error) {
          console.error("Error fetching user profile:", error)
          setProfile(null)
        }
      } else {
        setProfile(null)
        if (unsubscribeProfile) {
          unsubscribeProfile()
          unsubscribeProfile = null
        }
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
      if (unsubscribeProfile) {
        unsubscribeProfile()
      }
    }
  }, [])

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
}
