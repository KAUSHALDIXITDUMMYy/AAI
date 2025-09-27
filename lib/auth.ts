import { auth, db } from "./firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore"

export interface UserProfile {
  id: string
  email: string
  password?: string // Optional for existing users, required for new subscribers
  role: "admin" | "subscriber"
  createdAt: Date
  assignedStreams?: string[]
  pendingAuth?: boolean // Flag to indicate if Firebase Auth user needs to be created
}

export interface Stream {
  id: string
  title: string
  description: string
  channelName: string
  token: string
  isActive: boolean
  createdBy: string
  assignedSubscribers: string[]
  createdAt: Date
}

// Auth functions
export const loginUser = async (email: string, password: string) => {
  try {
    // First, check if user exists in database
    const q = query(collection(db, "users"), where("email", "==", email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error("User not found")
    }

    const userDoc = querySnapshot.docs[0]
    const userProfile = { id: userDoc.id, ...userDoc.data() } as UserProfile

    // If this is a subscriber with pendingAuth, create Firebase Auth user
    if (userProfile.role === "subscriber" && userProfile.pendingAuth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        // Update the database record with the Firebase Auth UID and remove password
        await updateDoc(doc(db, "users", userDoc.id), {
          id: userCredential.user.uid,
          pendingAuth: false,
          password: null, // Remove password from database
        })

        // Update the profile object
        userProfile.id = userCredential.user.uid
        userProfile.pendingAuth = false
        delete userProfile.password

        return {
          user: userCredential.user,
          profile: userProfile,
        }
      } catch (authError: any) {
        // If Firebase Auth creation fails, check if it's because user already exists
        if (authError.code === 'auth/email-already-in-use') {
          // Try to sign in with existing credentials
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          
          // Update the database record
          await updateDoc(doc(db, "users", userDoc.id), {
            id: userCredential.user.uid,
            pendingAuth: false,
            password: null,
          })

          userProfile.id = userCredential.user.uid
          userProfile.pendingAuth = false
          delete userProfile.password

          return {
            user: userCredential.user,
            profile: userProfile,
          }
        }
        throw authError
      }
    } else {
      // For existing users or admins, use normal sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Verify the user ID matches
      if (userProfile.id !== userCredential.user.uid) {
        throw new Error("User ID mismatch")
      }

      return {
        user: userCredential.user,
        profile: userProfile,
      }
    }
  } catch (error) {
    throw error
  }
}

export const logoutUser = async () => {
  await signOut(auth)
}

// User CRUD operations
export const createSubscriber = async (email: string, password: string) => {
  try {
    // Only create database record, don't create Firebase Auth user yet
    const userProfile: Omit<UserProfile, "id"> = {
      email,
      password, // Store password temporarily for first login
      role: "subscriber",
      createdAt: new Date(),
      assignedStreams: [],
      pendingAuth: true, // Mark that Firebase Auth user needs to be created
    }

    const docRef = await addDoc(collection(db, "users"), userProfile)
    return { id: docRef.id, ...userProfile }
  } catch (error) {
    throw error
  }
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    // First try to get by document ID (for new subscribers)
    const userDoc = await getDoc(doc(db, "users", userId))
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as UserProfile
    }
    
    // If not found by document ID, try to find by Firebase UID in the id field
    const q = query(collection(db, "users"), where("id", "==", userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      return { id: userDoc.id, ...userDoc.data() } as UserProfile
    }
    
    return null
  } catch (error) {
    throw error
  }
}

export const getAllSubscribers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "users"), where("role", "==", "subscriber"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserProfile)
  } catch (error) {
    throw error
  }
}

export const updateSubscriber = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    await updateDoc(doc(db, "users", userId), updates)
  } catch (error) {
    throw error
  }
}

export const deleteSubscriber = async (userId: string) => {
  try {
    await deleteDoc(doc(db, "users", userId))
  } catch (error) {
    throw error
  }
}

// Stream CRUD operations
export const createStream = async (streamData: Omit<Stream, "id" | "createdAt">) => {
  try {
    const stream = {
      ...streamData,
      createdAt: new Date(),
    }
    const docRef = await addDoc(collection(db, "streams"), stream)
    return { id: docRef.id, ...stream }
  } catch (error) {
    throw error
  }
}

export const getAllStreams = async (): Promise<Stream[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "streams"))
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Stream)
  } catch (error) {
    throw error
  }
}

export const getStreamById = async (streamId: string): Promise<Stream | null> => {
  try {
    const streamDoc = await getDoc(doc(db, "streams", streamId))
    if (streamDoc.exists()) {
      return { id: streamDoc.id, ...streamDoc.data() } as Stream
    }
    return null
  } catch (error) {
    throw error
  }
}

export const updateStream = async (streamId: string, updates: Partial<Stream>) => {
  try {
    await updateDoc(doc(db, "streams", streamId), updates)
  } catch (error) {
    throw error
  }
}

// Update stream assignments with bidirectional sync
export const updateStreamAssignments = async (streamId: string, assignedSubscriberIds: string[]) => {
  try {
    // First, get the current stream to see previous assignments
    const currentStream = await getStreamById(streamId)
    if (!currentStream) {
      throw new Error("Stream not found")
    }

    const previousAssignedSubscribers = currentStream.assignedSubscribers || []
    
    // Update the stream's assignedSubscribers
    await updateDoc(doc(db, "streams", streamId), {
      assignedSubscribers: assignedSubscriberIds
    })

    // Find subscribers that were removed (no longer assigned)
    const removedSubscribers = previousAssignedSubscribers.filter(
      (id: string) => !assignedSubscriberIds.includes(id)
    )

    // Find subscribers that were added (newly assigned)
    const addedSubscribers = assignedSubscriberIds.filter(
      (id: string) => !previousAssignedSubscribers.includes(id)
    )

    // Update removed subscribers - remove streamId from their assignedStreams
    const removePromises = removedSubscribers.map(async (subscriberId: string) => {
      try {
        const subscriberDoc = await getDoc(doc(db, "users", subscriberId))
        if (subscriberDoc.exists()) {
          const subscriberData = subscriberDoc.data()
          const currentAssignedStreams = subscriberData.assignedStreams || []
          const updatedAssignedStreams = currentAssignedStreams.filter((id: string) => id !== streamId)
          
          await updateDoc(doc(db, "users", subscriberId), {
            assignedStreams: updatedAssignedStreams
          })
        }
      } catch (error) {
        console.error(`Error updating removed subscriber ${subscriberId}:`, error)
      }
    })

    // Update added subscribers - add streamId to their assignedStreams
    const addPromises = addedSubscribers.map(async (subscriberId: string) => {
      try {
        const subscriberDoc = await getDoc(doc(db, "users", subscriberId))
        if (subscriberDoc.exists()) {
          const subscriberData = subscriberDoc.data()
          const currentAssignedStreams = subscriberData.assignedStreams || []
          
          // Only add if not already present
          if (!currentAssignedStreams.includes(streamId)) {
            const updatedAssignedStreams = [...currentAssignedStreams, streamId]
            
            await updateDoc(doc(db, "users", subscriberId), {
              assignedStreams: updatedAssignedStreams
            })
          }
        }
      } catch (error) {
        console.error(`Error updating added subscriber ${subscriberId}:`, error)
      }
    })

    // Execute all updates in parallel
    await Promise.all([...removePromises, ...addPromises])

  } catch (error) {
    throw error
  }
}

export const deleteStream = async (streamId: string) => {
  try {
    await deleteDoc(doc(db, "streams", streamId))
  } catch (error) {
    throw error
  }
}

// Debug function to check subscriber's assigned streams
export const debugSubscriberAssignments = async (subscriberId: string) => {
  try {
    console.log(`Debugging subscriber ${subscriberId}...`)
    
    // Get subscriber data
    const subscriberDoc = await getDoc(doc(db, "users", subscriberId))
    if (!subscriberDoc.exists()) {
      console.log(`Subscriber ${subscriberId} not found`)
      return { error: "Subscriber not found" }
    }
    
    const subscriberData = subscriberDoc.data()
    console.log("Subscriber data:", subscriberData)
    
    const assignedStreamIds = subscriberData.assignedStreams || []
    console.log("Assigned stream IDs:", assignedStreamIds)
    
    // Check which streams have this subscriber assigned
    const streams = await getAllStreams()
    const streamsWithThisSubscriber = streams.filter(stream => 
      stream.assignedSubscribers?.includes(subscriberId)
    )
    
    console.log("Streams that have this subscriber assigned:", streamsWithThisSubscriber.map(s => s.title))
    
    return {
      subscriberData,
      assignedStreamIds,
      streamsWithThisSubscriber: streamsWithThisSubscriber.map(s => ({ id: s.id, title: s.title }))
    }
  } catch (error) {
    console.error("Error debugging subscriber assignments:", error)
    throw error
  }
}

// Sync existing stream assignments - fixes data inconsistency
export const syncStreamAssignments = async () => {
  try {
    console.log("Starting stream assignment sync...")
    
    // Get all streams
    const streams = await getAllStreams()
    console.log(`Found ${streams.length} streams`)
    
    // Get all subscribers
    const subscribers = await getAllSubscribers()
    console.log(`Found ${subscribers.length} subscribers`)
    
    let totalUpdates = 0
    
    // For each stream, update subscriber assignments
    for (const stream of streams) {
      const assignedSubscriberIds = stream.assignedSubscribers || []
      console.log(`Stream "${stream.title}" has ${assignedSubscriberIds.length} assigned subscribers:`, assignedSubscriberIds)
      
      // Update each assigned subscriber's assignedStreams array
      for (const subscriberId of assignedSubscriberIds) {
        try {
          const subscriberDoc = await getDoc(doc(db, "users", subscriberId))
          if (subscriberDoc.exists()) {
            const subscriberData = subscriberDoc.data()
            const currentAssignedStreams = subscriberData.assignedStreams || []
            
            // Only update if stream is not already in the subscriber's assignedStreams
            if (!currentAssignedStreams.includes(stream.id)) {
              const updatedAssignedStreams = [...currentAssignedStreams, stream.id]
              
              await updateDoc(doc(db, "users", subscriberId), {
                assignedStreams: updatedAssignedStreams
              })
              
              console.log(`✅ Updated subscriber ${subscriberId} to include stream "${stream.title}"`)
              totalUpdates++
            } else {
              console.log(`⏭️  Subscriber ${subscriberId} already has stream "${stream.title}"`)
            }
          } else {
            console.log(`❌ Subscriber ${subscriberId} not found`)
          }
        } catch (error) {
          console.error(`❌ Error updating subscriber ${subscriberId}:`, error)
        }
      }
    }
    
    console.log(`Stream assignment sync completed. Total updates: ${totalUpdates}`)
    
    return { success: true, message: `Stream assignments synchronized successfully. Updated ${totalUpdates} subscribers.` }
  } catch (error) {
    console.error("Error syncing stream assignments:", error)
    throw error
  }
}

export const assignStreamToSubscribers = async (streamId: string, subscriberIds: string[]) => {
  try {
    // Update stream with assigned subscribers
    await updateDoc(doc(db, "streams", streamId), {
      assignedSubscribers: subscriberIds,
    })

    // Update each subscriber with assigned stream
    for (const subscriberId of subscriberIds) {
      const userDoc = await getDoc(doc(db, "users", subscriberId))
      if (userDoc.exists()) {
        const currentStreams = userDoc.data().assignedStreams || []
        if (!currentStreams.includes(streamId)) {
          await updateDoc(doc(db, "users", subscriberId), {
            assignedStreams: [...currentStreams, streamId],
          })
        }
      }
    }
  } catch (error) {
    throw error
  }
}
