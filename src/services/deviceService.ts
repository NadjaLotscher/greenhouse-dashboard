import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { ref, onUnmounted } from 'vue'

export interface DeviceData {
  name: string
  lastSeen: any
  online: boolean
  currentTemperature: number
  currentHumidity: number
  soilDry: boolean
  heaterOn: boolean
  fanOn: boolean
  mist1On: boolean
  mist2On: boolean
  mode: string
}

export function useDevice(deviceId: string) {
  const device = ref<DeviceData | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const docRef = doc(db, 'devices', deviceId)
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    console.log(`Device ${deviceId} loaded:`, snapshot.exists(), snapshot.data())
    if (snapshot.exists()) {
      device.value = snapshot.data() as DeviceData
    } else {
      device.value = null
    }
    loading.value = false
  }, (err) => {
    console.error('Device error:', err)
    error.value = err.message
    loading.value = false
  })

  onUnmounted(() => unsubscribe())

  return { device, loading, error }
}
