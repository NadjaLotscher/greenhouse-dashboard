import { httpsCallable } from 'firebase/functions'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { functions, db } from '../firebase'
import { ref, onUnmounted } from 'vue'

export interface Command {
  id: string
  deviceId: string
  type: string
  value: string
  status: string
  createdAt: any
  createdBy: string
  executedAt: any
  rejectedReason: string | null
}

export async function sendCommand(deviceId: string, type: string, value: string) {
  const createCommand = httpsCallable(functions, 'createCommand')
  return createCommand({ deviceId, type, value })
}

export function useCommands(deviceId: string) {
  const commands = ref<Command[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const q = query(
    collection(db, 'commands'),
    where('deviceId', '==', deviceId),
    orderBy('createdAt', 'desc'),
    limit(20)
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    commands.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Command[]
    loading.value = false
  }, (err) => {
    error.value = err.message
    loading.value = false
  })

  onUnmounted(() => unsubscribe())

  return { commands, loading, error }
}
