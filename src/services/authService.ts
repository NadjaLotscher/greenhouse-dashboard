import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../firebase'
import { ref } from 'vue'

export const currentUser = ref<User | null>(null)
export const authLoading = ref(true)

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  authLoading.value = false
})

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  return signOut(auth)
}
