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

export const deleteStream = async (streamId: string) => {
  try {
    await deleteDoc(doc(db, "streams", streamId))
  } catch (error) {
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
