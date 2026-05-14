import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { ref, onUnmounted } from 'vue'

export interface Measurement {
  id: string
  deviceId: string
  timestamp: any
  temperature: number
  humidity: number
  soilDry: boolean
  heaterOn: boolean
  fanOn: boolean
  mist1On: boolean
  mist2On: boolean
  mode: string
  temperatureStatus: string
  humidityStatus: string
}

export function useMeasurements(deviceId: string) {
  const measurements = ref<Measurement[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const q = query(
    collection(db, 'measurements'),
    where('deviceId', '==', deviceId),
    limit(200)
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log(`Measurements loaded for ${deviceId}:`, snapshot.docs.length)
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Measurement[]
    measurements.value = docs.reverse()
    loading.value = false
  }, (err) => {
    console.error('Measurements error:', err)
    error.value = err.message
    loading.value = false
  })

  onUnmounted(() => unsubscribe())

  return { measurements, loading, error }
}
