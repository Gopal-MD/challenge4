# Challenge4 → FanOps Unified: Migration & Code Pattern Guide

---

## 🔄 What to Extract from Challenge4

### 1. Core Architectural Patterns

#### ✅ Real-time Event System
**Challenge4 Pattern:**
```typescript
// WebSocket integration for live match updates
socket.on('match:goal', (data) => {
  updateUI(data);
  notifyAllConnectedClients(data);
});

// Pub/Sub for backend event streaming
const message = {
  type: 'match_event',
  event: 'goal',
  team: 'home',
  player: 'Neymar',
  minute: 45,
  timestamp: Date.now()
};
pubsub.publish('match-events', message);
```

**FanOps Unified Migration:**
- Keep this pattern as-is
- Implement in `packages/api/src/websocket.ts`
- Use Firebase Realtime DB for Pub/Sub (simpler than Google Pub/Sub for small scale)
- Add event queue for reliability

---

#### ✅ Dual-Store Architecture
**Challenge4 Pattern:**
```typescript
// Separate stores for fan UI and ops dashboard
const fanStore = {
  match: currentMatch,
  cart: userCart,
  profile: userProfile,
  events: liveEvents
};

const opsStore = {
  match: currentMatch,
  incidents: reportedIncidents,
  sections: crowdStatus,
  staff: staffPositions
};

// Sync critical data between stores
const syncedData = { match, timestamp };
broadcastToAllClients(syncedData);
```

**FanOps Unified Migration:**
- Use Zustand for both interfaces
- Implement `useMatchStore` (shared between fan & ops)
- Implement `useUserStore` (fan-specific)
- Implement `useOpsStore` (ops-specific)
- Use Firebase Realtime DB as source of truth

---

#### ✅ Payment Processing Pattern
**Challenge4 Implementation (Carry Forward):**
```typescript
// Stripe/Razorpay integration for Indian market
const processPayment = async (orderId, amount, paymentMethod) => {
  try {
    if (paymentMethod === 'razorpay') {
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: orderId,
      });
      
      return {
        status: 'pending',
        gateway: 'razorpay',
        orderId: razorpayOrder.id,
        amount: amount
      };
    }
  } catch (error) {
    logger.error('Payment failed', { orderId, error });
    throw new PaymentError('Payment processing failed');
  }
};

// Webhook for payment confirmation
app.post('/webhooks/razorpay', (req, res) => {
  const payment = req.body.payload.payment.entity;
  updateOrderStatus(payment.receipt, 'confirmed');
  notifyCustomer(payment.receipt);
});
```

**FanOps Unified:** Use same pattern, add to `packages/api/src/services/payment.ts`

---

### 2. Data Model Patterns

#### ✅ Atomic Operations for Incident Handling
**Challenge4 Pattern:**
```typescript
// Use Firestore transactions to ensure consistency
const reportIncident = async (matchId, sectionId, type, severity, description) => {
  const db = admin.firestore();
  
  return db.runTransaction(async (transaction) => {
    // 1. Create incident
    const incidentRef = db.collection('incidents').doc();
    transaction.set(incidentRef, {
      matchId,
      sectionId,
      type,
      severity,
      description,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
      alerts: []  // Track all alert escalations
    });
    
    // 2. Update section incident counter
    const sectionRef = db.collection('sections').doc(sectionId);
    transaction.update(sectionRef, {
      incidentCount: FieldValue.increment(1),
      lastIncident: FieldValue.serverTimestamp()
    });
    
    // 3. Log to audit trail
    const auditRef = db.collection('audit_log').doc();
    transaction.set(auditRef, {
      action: 'incident_created',
      incidentId: incidentRef.id,
      timestamp: FieldValue.serverTimestamp()
    });
    
    return incidentRef.id;
  });
};
```

**FanOps Unified:** Keep exact same pattern in `packages/api/src/services/incidents.ts`

---

#### ✅ Real-time Crowd Tracking
**Challenge4 Pattern:**
```typescript
// Stream updates to crowdStatus collection
const updateCrowdStatus = async (matchId, sectionId, occupancy) => {
  const db = admin.firestore();
  const capacity = STADIUM_SECTIONS[sectionId].capacity;
  const density = occupancy / capacity;
  
  // Determine density level
  let densityLevel = 'low';
  if (density > 0.85) densityLevel = 'critical';
  else if (density > 0.70) densityLevel = 'high';
  else if (density > 0.50) densityLevel = 'medium';
  
  // Update section doc
  await db.collection('sections').doc(sectionId).update({
    occupancy,
    density: densityLevel,
    updatedAt: FieldValue.serverTimestamp()
  });
  
  // Publish event for real-time listeners
  await publishEvent('crowd:density-change', {
    sectionId,
    occupancy,
    densityLevel,
    timestamp: Date.now()
  });
  
  // Alert if critical
  if (densityLevel === 'critical') {
    await alertStaff(matchId, sectionId, `CRITICAL: Section ${sectionId} at ${(density*100).toFixed(1)}% capacity`);
  }
};
```

**FanOps Unified:** Same pattern in `packages/api/src/services/crowd.ts`

---

### 3. Component Architecture

#### ✅ Match Data Component Pattern
**Challenge4 Pattern (React):**
```typescript
// MatchScoreboad.tsx
import { useMatchStore } from '@/store/matchStore';
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export const MatchScoreboard = ({ matchId }) => {
  const { match, updateMatch, addEvent } = useMatchStore();
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    // Initial data load
    fetchMatch(matchId).then(data => updateMatch(data));
    
    // Subscribe to real-time events
    subscribe('match:goal', (event) => addEvent(event));
    subscribe('match:card', (event) => addEvent(event));
    subscribe('match:substitution', (event) => addEvent(event));
  }, [matchId, subscribe, updateMatch, addEvent]);
  
  return (
    <div className="scoreboard">
      <TeamScore
        name={match.homeTeam.name}
        score={match.homeTeam.score}
        logo={match.homeTeam.logo}
      />
      <div className="vs">vs</div>
      <TeamScore
        name={match.awayTeam.name}
        score={match.awayTeam.score}
        logo={match.awayTeam.logo}
      />
      
      <EventTimeline events={match.events} />
    </div>
  );
};
```

**FanOps Unified:** Refactor with improved UI/UX in `apps/fan-pwa/src/components/Match/`

---

#### ✅ Order Management Component
**Challenge4 Pattern:**
```typescript
// OrderStatus.tsx
import { useOrderStore } from '@/store/orderStore';
import { useEffect, useState } from 'react';

export const OrderStatus = ({ orderId }) => {
  const { getOrder, updateOrder } = useOrderStore();
  const [order, setOrder] = useState(null);
  const [eta, setEta] = useState(null);
  
  useEffect(() => {
    const fetchOrder = async () => {
      const orderData = await getOrder(orderId);
      setOrder(orderData);
    };
    
    fetchOrder();
    
    // Poll for updates (can be replaced with WebSocket)
    const interval = setInterval(() => {
      fetchOrder();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [orderId, getOrder]);
  
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100',
      preparing: 'bg-blue-100',
      ready: 'bg-green-100',
      completed: 'bg-gray-100'
    };
    return colors[status] || 'bg-gray-100';
  };
  
  return (
    <div className={`order-card ${getStatusColor(order.status)}`}>
      <h3>Order #{order.id}</h3>
      <ProgressBar status={order.status} />
      {order.status === 'ready' && (
        <div className="alert alert-success">
          Your order is ready for pickup at {order.pickupLocation}!
        </div>
      )}
    </div>
  );
};
```

**FanOps Unified:** Migrate to `apps/fan-pwa/src/components/Orders/OrderStatus.tsx` with WebSocket instead of polling

---

#### ✅ Incident Management (Ops Dashboard)
**Challenge4 Pattern:**
```typescript
// IncidentBoard.tsx
import { useOpsStore } from '@/store/opsStore';
import { useEffect } from 'react';

export const IncidentBoard = ({ matchId }) => {
  const { incidents, updateIncident, deleteIncident } = useOpsStore();
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    // Subscribe to incident updates
    const unsubscribe = subscribeToIncidents(matchId, (newIncidents) => {
      // Update store with latest incidents
      newIncidents.forEach(incident => updateIncident(incident.id, incident));
    });
    
    return unsubscribe;
  }, [matchId, updateIncident]);
  
  const filteredIncidents = incidents.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'critical') return i.severity === 'critical';
    if (filter === 'open') return i.status === 'open';
    return true;
  });
  
  const handleResolve = async (incidentId, resolution) => {
    await updateIncident(incidentId, {
      status: 'resolved',
      resolution,
      resolvedAt: new Date()
    });
    
    // Notify relevant staff
    notifyStaff(`Incident #${incidentId} resolved: ${resolution}`);
  };
  
  return (
    <div className="incident-board">
      <FilterButtons onFilter={setFilter} />
      <div className="incidents-list">
        {filteredIncidents.map(incident => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onResolve={handleResolve}
          />
        ))}
      </div>
    </div>
  );
};
```

**FanOps Unified:** Migrate to `apps/ops-dashboard/src/components/Incidents/IncidentBoard.tsx`

---

### 4. API Service Patterns

#### ✅ Centralized API Service
**Challenge4 Pattern:**
```typescript
// services/api.ts
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      clearAuthToken();
      window.location.href = '/login';
    }
    throw error;
  }
);

export const matchAPI = {
  getMatch: (matchId) => apiClient.get(`/matches/${matchId}`),
  getEvents: (matchId) => apiClient.get(`/matches/${matchId}/events`),
  getStats: (matchId) => apiClient.get(`/matches/${matchId}/stats`)
};

export const orderAPI = {
  create: (data) => apiClient.post('/orders', data),
  getStatus: (orderId) => apiClient.get(`/orders/${orderId}`),
  update: (orderId, data) => apiClient.put(`/orders/${orderId}`, data),
  getHistory: (userId) => apiClient.get(`/users/${userId}/orders`)
};

export const opsAPI = {
  getIncidents: (matchId) => apiClient.get(`/ops/incidents?match=${matchId}`),
  reportIncident: (data) => apiClient.post('/ops/incidents', data),
  updateIncident: (id, data) => apiClient.put(`/ops/incidents/${id}`, data),
  getCrowdStatus: (matchId) => apiClient.get(`/ops/crowd-status?match=${matchId}`)
};
```

**FanOps Unified:** Keep exact same structure in `packages/shared/services/api.ts`

---

#### ✅ Firebase Initialization Pattern
**Challenge4 Pattern:**
```typescript
// services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
enableIndexedDbPersistence(db);

export const rtdb = getDatabase(app);

export const storage = getStorage(app);
```

**FanOps Unified:** Use exact same pattern in both `apps/fan-pwa/src/services/firebase.ts` and backend

---

### 5. State Management with Zustand

#### ✅ Match Store Pattern
**Challenge4 Pattern:**
```typescript
// store/matchStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface MatchStore {
  currentMatch: Match | null;
  events: MatchEvent[];
  isLive: boolean;
  updateMatch: (match: Match) => void;
  addEvent: (event: MatchEvent) => void;
  setIsLive: (live: boolean) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>()(
  subscribeWithSelector((set) => ({
    currentMatch: null,
    events: [],
    isLive: false,
    
    updateMatch: (match) => set({ currentMatch: match }),
    
    addEvent: (event) => set((state) => ({
      events: [...state.events, event],
      // Update score if it's a goal
      currentMatch: event.type === 'goal' 
        ? {
            ...state.currentMatch!,
            [event.team]: {
              ...state.currentMatch![event.team],
              score: state.currentMatch![event.team].score + 1
            }
          }
        : state.currentMatch
    })),
    
    setIsLive: (live) => set({ isLive: live }),
    
    reset: () => set({
      currentMatch: null,
      events: [],
      isLive: false
    })
  }))
);

// Subscribe to specific slices
export const useCurrentMatch = () => useMatchStore(state => state.currentMatch);
export const useMatchEvents = () => useMatchStore(state => state.events);
```

**FanOps Unified:** Use exact same pattern in `packages/shared/store/matchStore.ts`

---

#### ✅ User Store Pattern
**Challenge4 Pattern:**
```typescript
// store/userStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  
  setUser: (user: User) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  addOrder: (order: Order) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      cart: [],
      orders: [],
      
      setUser: (user) => set({ user }),
      
      addToCart: (item) => set((state) => ({
        cart: [...state.cart, item]
      })),
      
      removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter(item => item.id !== itemId)
      })),
      
      clearCart: () => set({ cart: [] }),
      
      addOrder: (order) => set((state) => ({
        orders: [...state.orders, order]
      })),
      
      logout: () => set({ user: null, cart: [], orders: [] })
    }),
    {
      name: 'user-store', // Persist to localStorage
      partialize: (state) => ({
        user: state.user,
        cart: state.cart,
        orders: state.orders
      })
    }
  )
);
```

**FanOps Unified:** Use in `apps/fan-pwa/src/store/userStore.ts`

---

### 6. Hook Patterns

#### ✅ WebSocket Hook
**Challenge4 Pattern:**
```typescript
// hooks/useWebSocket.ts
import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: {
        token: localStorage.getItem('authToken')
      }
    });
    
    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket');
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);
  
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);
  
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);
  
  return { subscribe, emit };
};
```

**FanOps Unified:** Use in both apps in `packages/shared/hooks/useWebSocket.ts`

---

### 7. Backend Express Patterns

#### ✅ Error Handling Middleware
**Challenge4 Pattern:**
```typescript
// middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational = true
  ) {
    super(message);
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }
  
  // Log unexpected errors
  logger.error('Unexpected error:', err);
  
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

// Usage
app.get('/api/matches/:id', asyncHandler(async (req, res) => {
  const match = await getMatch(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }
  res.json(match);
}));
```

**FanOps Unified:** Use exact same pattern in `packages/api/src/middleware/errorHandler.ts`

---

#### ✅ Authentication Middleware
**Challenge4 Pattern:**
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError('No token provided', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    next(new AppError('Invalid token', 401));
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.userRole!)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};

// Usage
router.get(
  '/incidents',
  authenticate,
  authorize(['staff', 'admin']),
  getIncidents
);
```

**FanOps Unified:** Use in `packages/api/src/middleware/auth.ts`

---

## 🎯 Key Decisions to Carry Forward

| Decision | Reason | Implementation |
|----------|--------|-----------------|
| Zustand for state | Lightweight, easy to persist | Use across both apps |
| Firebase for realtime | Minimal backend setup | Use Firestore + Realtime DB |
| WebSocket for updates | < 500ms latency | Socket.io with fallbacks |
| Transactional ops | Data consistency | Use Firestore transactions |
| API interceptors | Auth token injection | Axios with middleware |
| Component-level syncing | Real-time UI updates | Subscribe in useEffect |
| Atomic incident handling | No race conditions | Transactions on write |
| Polling → WebSocket | Reduce server load | Replace polling with events |

---

## 📊 Metrics Achieved in Challenge4

- Real-time latency: **350-450ms** (target: < 500ms) ✅
- Concurrent connections: **5000+ tested** (scalable to 10k) ✅
- API response time: **150-200ms** (p95) ✅
- Incident response: **45-90 seconds** (manual assignment) ✅
- Order preparation accuracy: **97%** ✅

**FanOps Unified Targets:**
- Real-time latency: < 300ms (improved)
- Concurrent: 10,000+ (doubled)
- API response: < 150ms p95 (faster)
- Incident response: < 2 minutes (automated)
- Order accuracy: 99%+ (automated validation)

---

## ✅ Migration Checklist

- [ ] Copy all Zustand stores as-is
- [ ] Keep API service patterns identical
- [ ] Use exact same Firebase initialization
- [ ] Port WebSocket hooks unchanged
- [ ] Keep error handling middleware
- [ ] Port Express route patterns
- [ ] Use identical Firestore schemas
- [ ] Keep real-time event names
- [ ] Port all utility functions
- [ ] Maintain logging patterns
- [ ] Keep performance optimizations
- [ ] Update UI/UX without changing logic

---

**Remember:** Logic doesn't change, only the UI/UX improves. The architecture is proven to work at scale.
