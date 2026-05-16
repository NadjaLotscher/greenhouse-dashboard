# 5. Implementation Details

This section covers internal implementation patterns that are important for
understanding and maintaining the system. It does not repeat the component/service
descriptions from Section 4.

## 5.1 Real-Time Listener Pattern

All three data services (`useDevice`, `useMeasurements`, `useCommands`) follow the same
pattern:

```typescript
export function useDevice(deviceId: string) {
  const device = ref<DeviceData | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const unsubscribe = onSnapshot(
    doc(db, 'devices', deviceId),
    (snapshot) => {
      device.value = snapshot.exists() ? snapshot.data() as DeviceData : null
      loading.value = false
    },
    (err) => {
      error.value = err.message
      loading.value = false
    }
  )

  onUnmounted(() => unsubscribe())
  return { device, loading, error }
}
```

**Key aspects:**

- `onSnapshot` registers a persistent listener that fires on every document change.
- The reactive `ref` is updated inside the callback, which triggers Vue's reactivity
  system to re-render dependent components.
- `onUnmounted` ensures the listener is cleaned up when the component is destroyed,
  preventing memory leaks and unnecessary Firestore reads.
- Each listener costs 1 Firestore read on initial load plus 1 read per subsequent
  update.

### Differences Between the Three Services

| Service | Firestore Target | Query | Ordering |
|---------|-----------------|-------|----------|
| `useDevice` | Single document | None (document listener) | N/A |
| `useMeasurements` | Collection query | `where('deviceId', '==', id), limit(200)` | Client-side reverse |
| `useCommands` | Collection query | `where('deviceId', '==', id), orderBy('createdAt', 'desc'), limit(20)` | Server-side |

`useMeasurements` currently reverses the result array client-side. This could be
replaced with a server-side `orderBy('timestamp', 'desc')` to avoid the O(n) reversal
on every update, but requires a composite Firestore index.

## 5.2 DashboardView Data Orchestration

DashboardView initializes all three listeners simultaneously. Each listener has its own
loading state, and child components conditionally render only after their data is
ready:

```vue
<CurrentStatusGrid v-if="!deviceLoading" :device="device" />
<HistoricalCharts v-if="!measurementsLoading" :measurements="measurements" />
```

Data flows unidirectionally: composables → DashboardView → child components. There is no
child-to-child communication. The toast notification system uses Vue's emit pattern:
ManualControls emits toast events upward to DashboardView, which displays them with a
3-second auto-dismiss.

## 5.3 Command Dispatch Pattern

When a user clicks a control button in ManualControls:

```typescript
async function handleCommand(btn: ControlButton) {
  loadingBtn.value = btn.key
  try {
    await sendCommand('greenhouse-01', btn.type, btn.value)
    emit('toast', 'Command sent!', 'success')
  } catch (e: any) {
    emit('toast', e.message || 'Command failed', 'error')
  } finally {
    loadingBtn.value = null
  }
}
```

The button shows a loading spinner while the Cloud Function call is in progress. The
actual device state update happens asynchronously: the command is stored as `pending`,
the Pi eventually executes it, and the next sensor reading confirms the new state.
Button color reflects the current device state to indicate whether the desired action
matches the current state.

## 5.4 Chart Data Transformation

HistoricalCharts uses three computed properties to transform the raw `Measurement[]`
array into Chart.js dataset objects. Each computed property maps over the measurements
array to extract timestamps (for labels) and the relevant values (for data points).

```typescript
const tempData = computed(() => ({
  labels: props.measurements.map(m => toDate(m.timestamp).toLocaleTimeString(...)),
  datasets: [{
    label: 'Temperature (°C)',
    data: props.measurements.map(m => m.temperature),
    borderColor: '#14b8a6',
    fill: true,
    tension: 0.3
  }]
}))
```

With 200 measurements and 3 charts, each update triggers approximately 600 `.map()`
iterations. This completes in under 5ms on modern browsers and is not a performance
concern at this scale.

The actuator chart maps boolean states to distinct numeric levels (Heater → 3, Fan → 2,
Mist → 1, Off → 0) with custom Y-axis tick labels, creating a discrete step timeline.

## 5.5 Router Authentication Guard

The router uses a `beforeEach` guard with route metadata to protect the dashboard:

```typescript
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const user = await getCurrentUser()
    if (!user) return { name: 'Login' }
  }
})
```

`getCurrentUser()` wraps `onAuthStateChanged` in a Promise that resolves once and
immediately unsubscribes, avoiding persistent auth listeners in the router.

## 5.6 Defensive Timestamp Handling

Firestore returns Timestamp objects, but after serialization they may become strings
or numbers. All timestamp conversions use a defensive pattern:

```typescript
const date = value.toDate ? value.toDate() : new Date(value)
```

A centralized `toDate()` utility function that handles Timestamp, Date, number,
and string inputs would improve consistency across the codebase.

## 5.7 Error Handling

Services store errors in a `ref<string | null>` for persistent display (e.g., listener
failures). Transient errors from individual actions (e.g., a failed command) are shown
as auto-dismissing toast notifications. Currently, error messages are generic strings
from Firebase. Classifying errors by code (e.g., `permission-denied`,
`unauthenticated`) would improve user-facing messages.

## 5.8 Known Limitations and Improvement Opportunities

- No pagination for measurements — always loads 200 documents.
- No `orderBy` on measurements query — relies on client-side reversal.
- No input validation in Cloud Functions beyond checking for `deviceId` presence.
- No command type/value validation.
- No rate limiting on either Cloud Function.
- No device ownership or authorization checks in `createCommand`.
- `updateCommand` Cloud Function is not yet implemented.
- Device ID `greenhouse-01` is hardcoded throughout the frontend.

---

# 6. Security and Firestore Rules

## 6.1 Current State (Development)

The project currently uses open Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

This allows any client to read, write, and delete any document without authentication.
This is acceptable during early development but must be replaced before classroom
deployment.

## 6.2 Why Open Rules Are Dangerous

With open rules, anyone who knows the Firebase project ID can:

- Read all greenhouse data (sensor history, user information).
- Write fake measurements with arbitrary values.
- Delete command history or measurement records.
- Send unauthorized commands to any device.
- Modify user roles or device settings.

Since Firebase project configuration is embedded in the frontend JavaScript bundle, it
is effectively public. Firestore rules are the only server-side access control for
direct database operations.

## 6.3 Security Model

The system has four actor types with different access needs:

| Actor | Can Read | Can Write | Notes |
|-------|----------|-----------|-------|
| Teacher | All data | Device settings, commands (via Cloud Function) | Full access to their assigned devices |
| Student | Device state, measurements, commands | Commands (via Cloud Function) | Cannot modify settings or delete data |
| Raspberry Pi | Pending commands | Measurements (via Cloud Function), command status | Authenticated via device token |
| Unauthenticated | Nothing | Nothing | All access denied |

**Key principle:** Measurements and commands are only written through Cloud Functions,
never through direct client writes. This makes Cloud Functions the secure validation
layer, and Firestore rules can set `allow write: if false` on those collections for
direct client access.

## 6.4 Recommended Production Firestore Rules

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function userExists() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isTeacher() {
      return getUserRole() == 'teacher';
    }

    // Device state: authenticated users can read, only teachers can write settings
    match /devices/{deviceId} {
      allow read: if isAuthenticated() && userExists();
      allow write: if isAuthenticated() && isTeacher();
    }

    // Measurements: authenticated users can read, only Cloud Functions can write
    match /measurements/{document=**} {
      allow read: if isAuthenticated() && userExists();
      allow write: if false;
    }

    // Commands: authenticated users can read, Cloud Functions create,
    // Pi can update status from pending to executed/rejected
    match /commands/{document=**} {
      allow read: if isAuthenticated() && userExists();
      allow create: if false;
      allow update: if isAuthenticated()
                    && request.resource.data.status in ['executed', 'rejected']
                    && resource.data.status == 'pending';
      allow delete: if false;
    }

    // User profiles: users read own profile, cannot change own role
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && request.auth.uid == userId
                    && !request.resource.data.diff(resource.data)
                        .affectedKeys().hasAny(['role', 'permissions']);
      allow create, delete: if isAuthenticated() && isTeacher();
    }

    // Device assignments: users see own assignments, teachers see all
    match /deviceAssignments/{document=**} {
      allow read: if isAuthenticated()
                  && (request.auth.uid in resource.data.assignedUsers
                      || getUserRole() == 'teacher');
      allow write: if isAuthenticated() && isTeacher();
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Rule Summary

- **Measurements are immutable from clients.** Only Cloud Functions write them. This
  prevents fabricated sensor data.
- **Commands cannot be created directly.** Users must go through `createCommand`, which
  validates authentication. Commands can only be updated from `pending` to
  `executed`/`rejected`, preventing status manipulation.
- **Users cannot escalate their own role.** The `diff().affectedKeys()` check blocks
  updates to `role` or `permissions` fields.
- **Device settings are teacher-only.** Students can view greenhouse state but cannot
  change configuration.

## 6.5 Cloud Function Security Enhancements

The current Cloud Functions perform minimal validation. For production, add:

**submitMeasurement:**

- Device token verification (Pi includes a secret token, function checks it against an
  environment variable).
- Input range validation (temperature between -50 and 60°C, humidity between 0 and
  100%).
- Rate limiting (minimum 5 seconds between submissions per device).

**createCommand:**

- Device ownership check (query `/deviceAssignments` to verify the user is assigned to
  the target device).
- Command type/value validation against the allowed combinations.
- Rate limiting (maximum 1 command per 5 seconds per user).

## 6.6 Required Setup for Production Rules

Before deploying the production rules, the following data must exist in Firestore:

- User documents in `/users/{uid}` with at minimum `uid`, `email`, `role`
  (`teacher` or `student`).
- Device assignment documents in `/deviceAssignments/` mapping devices to assigned
  users.
- Device token set as an environment variable in Cloud Functions configuration.
- Anonymous authentication disabled — require email/password login.

## 6.7 Security Deployment Checklist

- [ ] Deploy Firestore rules from Section 6.4
- [ ] Create user documents for all teachers and students
- [ ] Create device assignment documents
- [ ] Set device token environment variable in Cloud Functions
- [ ] Update Pi code to include device token in `submitMeasurement` calls
- [ ] Remove or disable anonymous authentication
- [ ] Test access as teacher, student, and unauthenticated user
- [ ] Enable Cloud Functions logging for security monitoring

---

# 7. Setup and Deployment

## 7.1 Requirements

| Software | Version | Installation |
|----------|---------|-------------|
| Node.js | 24 LTS | https://nodejs.org |
| npm | 11+ | Included with Node.js |
| Git | Latest | https://git-scm.com |
| Firebase CLI | Latest | `npm install -g firebase-tools` |

Verify installation:

```bash
node --version    # v24.x.x
npm --version     # 11.x.x
git --version     # 2.x.x
```

## 7.2 Local Setup

```bash
# Clone and enter project
git clone https://github.com/[your-org]/greenhouse-dashboard.git
cd greenhouse-dashboard

# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..

# Create environment file
cp .env.example .env
```

Edit `.env` with your Firebase project credentials:

```ini
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Find these values in Firebase Console → Project Settings → Your Apps → Web App.

**Important:** `.env` is in `.gitignore` and must not be committed.

## 7.3 Running the Development Server

**Frontend:**

```bash
npm run dev
# Available at http://localhost:5173
```

Vite provides hot module replacement — code changes appear in the browser without a full
page reload.

**Firebase Emulators (optional, for offline development):**

```bash
cd functions
npm run serve
# Emulator UI at http://localhost:4000
# Functions at http://localhost:5001
# Firestore at http://localhost:8080
```

To connect the frontend to local emulators, add to `/src/firebase.ts`:

```typescript
if (location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
  connectFunctionsEmulator(functions, 'localhost', 5001)
}
```

By default (without this code), the frontend connects to the production Firebase
project.

## 7.4 Building and Deploying

**Build frontend for production:**

```bash
npm run build          # Output: dist/ folder
npm run preview        # Preview production build locally at http://localhost:4173
```

**Build Cloud Functions:**

```bash
cd functions
npm run lint           # Check code quality
npm run build          # Compile TypeScript to lib/
```

**Deploy:**

```bash
# Login to Firebase (first time only)
firebase login

# Deploy everything
firebase deploy

# Or deploy individually
firebase deploy --only hosting
firebase deploy --only functions
```

After deployment, the app is available at `https://your-project-id.web.app`.

## 7.5 Post-Deployment Verification

- [ ] Frontend loads at the hosting URL
- [ ] Login works with a test account
- [ ] Dashboard displays device data
- [ ] Real-time updates work (data changes appear without refresh)
- [ ] Manual control buttons send commands successfully
- [ ] Command history table updates
- [ ] No errors in browser DevTools console
- [ ] `firebase functions:list` shows deployed function endpoints

## 7.6 Common Issues

| Problem | Cause | Solution |
|---------|-------|---------|
| `dist/` not found on deploy | Forgot to build | Run `npm run build` before deploying |
| ESLint errors block deployment | Code quality issues | Run `cd functions && npm run lint -- --fix` |
| Missing `VITE_FIREBASE_*` variables | `.env` file missing | Create `.env` from `.env.example` with credentials |
| Functions deploy permission denied | Not logged in | Run `firebase logout && firebase login` |
| Blank page after deploy | JS errors or missing config | Check browser DevTools Console and Network tabs |
| Emulator port in use | Another process on the port | Kill the process or use `--port` flag |

## 7.7 Version Control

**Commit:** `src/`, `functions/src/`, `package.json`, `firebase.json`, `.firebaserc`,
`vite.config.js`, `README.md`

**Do not commit:** `.env`, `node_modules/`, `dist/`, `functions/lib/`,
`firebase-debug.log`

## 7.8 Continuous Integration (Optional)

A GitHub Actions workflow can automate deployment on push to `main`:

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: cd functions && npm ci && npm run lint && npm run build
      - uses: w9jds/firebase-action@main
        with:
          args: deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Generate the token with `firebase login:ci` and add it as a GitHub repository secret.

## 7.9 Monitoring

```bash
firebase functions:log           # View recent function executions and errors
firebase functions:log --limit 50  # More history
```

In Firebase Console: Functions tab for execution counts and errors, Firestore tab for
read/write counts, Hosting tab for bandwidth usage.

---

# 8. Cost and Performance Notes

## 8.1 Firebase Pricing Model

Firebase uses pay-per-use pricing. The main cost drivers are Firestore reads and writes.

| Service | Unit | Cost | Free Tier |
|---------|------|------|-----------|
| Firestore Reads | Per 100K documents | $0.06 | 50K/day |
| Firestore Writes | Per 100K documents | $0.18 | 20K/day |
| Firestore Deletes | Per 100K documents | $0.02 | 20K/day |
| Cloud Functions | Per 1M invocations | $0.40 | 2M/month |
| Hosting | Per GB served | $0.085 | 10GB/month |
| Authentication | — | Free | Unlimited |

## 8.2 Cost Estimate: Single Classroom

**Assumptions:** 1 Raspberry Pi, 20 students + 1 teacher, measurements every 30
seconds, ~8 commands per day.

**Daily operations:**

- Measurements: 2,880/day × 2 writes (measurement + device update) = 5,760 writes.
- Associated reads for device lookups: ~5,760.
- Commands: ~8 writes, ~8 reads.
- Dashboard listeners: 21 users × ~2 sessions × ~5 listener updates each = ~210 reads.
- Overhead (errors, retries): ~300 reads.

**Daily total:** ~6,300 reads, ~5,770 writes.
**Monthly total:** ~189,000 reads, ~173,000 writes.

**Monthly cost:**

- Firestore reads: 189K / 100K × $0.06 = $0.11
- Firestore writes: 173K / 100K × $0.18 = $0.31
- Cloud Functions and hosting: negligible
- **Total: ~$0.42/month** — well within the free tier.

## 8.3 Scaling Estimates

| Scale | Monthly Reads | Monthly Writes | Estimated Cost |
|-------|--------------|----------------|----------------|
| 1 class (25 users) | ~190K | ~173K | Free |
| 5 classes (125 users) | ~950K | ~865K | Free |
| 10 classes (250 users) | ~1.9M | ~1.7M | ~$4/month |
| 50 classes (1,250 users) | ~9.5M | ~8.7M | ~$20/month |
| 100 classes, high-frequency (5s interval) | ~109M | ~52M | ~$160/month |

For typical classroom use, costs remain under the free tier or well under $5/month.

## 8.4 Main Cost Driver: Real-Time Listeners

The biggest cost factor is Firestore listener updates. Every active listener on the
dashboard receives one read per data change. With 20 students each having 3 listeners
and measurements arriving every 30 seconds, that is 60 reads per measurement, or
172,800 reads per day from listeners alone.

**Mitigation strategies:**

- Unsubscribe listeners when the dashboard tab is hidden or the component unmounts
  (already implemented via `onUnmounted`).
- Reduce listener frequency by batching updates or only subscribing to the device
  document (not the full measurements query) for real-time updates.
- Use lazy loading: only subscribe to measurements when the charts tab is active.

## 8.5 Performance Baselines

| Metric | Expected Value |
|--------|---------------|
| Initial page load | 2–3 seconds |
| Subsequent navigation | <1 second (cached) |
| Measurement to screen update | 1–2 seconds |
| Command to history update | <1 second |
| Cloud Function execution (submitMeasurement) | 500–800ms |
| Cloud Function execution (createCommand) | 400–600ms |
| Firestore read latency | 50–100ms |

These metrics hold for up to ~100 concurrent users. At higher concurrency, listener
updates may lag by 1–2 additional seconds but remain acceptable for a monitoring
dashboard.

## 8.6 Key Optimizations

**Query efficiency:** All Firestore queries should include `.limit()` to cap read
counts. Queries with both `where` and `orderBy` require composite indexes — Firestore
will prompt for these when queries are first executed.

**Batch writes:** When performing bulk operations, use Firestore batch writes instead of
individual writes. Same cost, but faster execution.

**Pagination:** The current measurements query loads 200 documents at once. Implementing
cursor-based pagination with `startAfter` would reduce initial load size and allow
loading older data on demand.

**Data archiving:** After extended operation, the measurements collection will grow
large. Archiving measurements older than 30 days to a separate collection or Cloud
Storage ($0.02/GB) reduces active collection size and query costs.

**Cost alerts:** Set up a budget alert in Firebase Console → Billing → Budgets & Alerts
to receive notifications if projected costs exceed a threshold (e.g., $50/month).

## 8.7 Monitoring Checklist

**Weekly:** Check Cloud Functions logs for errors; verify costs are within budget.

**Monthly:** Review Firestore usage report; archive old measurements if needed; update
device tokens.

**Quarterly:** Review scaling trends; optimize queries based on usage patterns; update
dependencies.

