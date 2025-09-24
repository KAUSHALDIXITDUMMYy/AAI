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
  role: "admin" | "subscriber"
  createdAt: Date
  assignedStreams?: string[]
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))

    if (!userDoc.exists()) {
      throw new Error("User profile not found")
    }

    return {
      user: userCredential.user,
      profile: { id: userDoc.id, ...userDoc.data() } as UserProfile,
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const userProfile: Omit<UserProfile, "id"> = {
      email,
      role: "subscriber",
      createdAt: new Date(),
      assignedStreams: [],
    }

    await setDoc(doc(db, "users", userCredential.user.uid), userProfile)
    return { id: userCredential.user.uid, ...userProfile }
  } catch (error) {
    throw error
  }
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (userDoc.exists()) {
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
