import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  INITIAL_BOOKINGS,
  INITIAL_DEVICES,
  INITIAL_ORDERS,
  INITIAL_WARRANTIES,
  PRODUCTS,
} from '../data/catalog';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  buildUserPrivateCreatePayload,
  buildUserPrivateUpdatePayload,
  buildUserWorkspaceCreatePayload,
  buildUserWorkspaceUpdatePayload,
  buildVehicleDeviceCreatePayload,
  buildVehicleDeviceTelemetryUpdatePayload,
  buildVehicleMaintenanceCreatePayload,
  buildVehicleMaintenanceDocId,
  buildVehicleMaintenanceUpdatePayload,
  buildWishlistCreatePayload,
  buildWishlistUpdatePayload,
} from '../utils/firestorePayloads';
import {
  applyOdometerUpdate,
  applyServiceCompletion,
  resolveMaintenanceRecord,
  validateOdometerInput,
  type MaintenanceMap,
} from '../utils/serviceMilestoneLogic';
import {
  buildTrackedDeviceFromRegistration,
  buildVehicleDeviceId,
  computeDefaultSimExpiry,
  defaultModelForVehicleType,
  isAllowedVehicleType,
} from '../utils/vehicleDeviceLogic';
import {
  getAnchorCoordinatesForDevice,
  type TelemetryUpdatePayload,
} from '../utils/registeredVehicleTracking';
import type {
  AppRoute,
  CartItem,
  DemoRequest,
  InstallationBooking,
  Order,
  Product,
  ProductReview,
  ServiceMilestoneId,
  TelemetrySource,
  TrackedDevice,
  UserProfile,
  VehicleMaintenanceRecord,
  VehicleType,
  WarrantyRecord,
} from '../types';
import { calculateCartTotals, type CartTotals } from '../utils/storeLogic';
import { resolveInitialViewFromSearch } from '../utils/pwaLogic';
import {
  applyLiveTrackingSelection,
  clearLiveTrackingSelection,
  createInitialLiveTrackingState,
  type LiveTrackingState,
} from '../utils/liveTrackingState';
import type { RtoVehicleMetadata } from '../utils/rtoRegistryDatabase';
import {
  lookupVehicleRecordByRto,
  parseTrackRtoFromSearch,
} from '../utils/vehicleSearchLogic';

interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'info' | 'error';
}

interface StoreContextValue {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  route: AppRoute;
  navigate: (nextRoute: AppRoute) => void;
  products: Product[];
  addProductReview: (
    productId: string,
    review: Omit<ProductReview, 'id' | 'date'>
  ) => void;
  cart: CartItem[];
  cartTotals: CartTotals;
  promoCode: string;
  setPromoCode: (code: string) => void;
  addToCart: (
    productId: string,
    quantity?: number,
    plan?: CartItem['plan']
  ) => void;
  updateCartQuantity: (
    productId: string,
    plan: CartItem['plan'],
    quantity: number
  ) => void;
  removeFromCart: (productId: string, plan: CartItem['plan']) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  user: UserProfile;
  loginUser: (profile: Omit<UserProfile, 'isAuthenticated'>) => void;
  signInWithGoogle: () => Promise<void>;
  logoutUser: () => void;
  orders: Order[];
  placeOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => Order;
  devices: TrackedDevice[];
  registerVehicleDevice: (input: {
    imei: string;
    nickname: string;
    vehicleType: VehicleType;
    model?: string;
  }) => Promise<{
    ok: boolean;
    device?: TrackedDevice;
    syncedToFirestore: boolean;
    error?: string;
  }>;
  updateVehicleTelemetry: (
    deviceId: string,
    update: TelemetryUpdatePayload,
    options?: { syncFirestore?: boolean }
  ) => Promise<{ ok: boolean; syncedToFirestore: boolean }>;
  bulkUpdateDevicesTelemetry: (updater: (prev: TrackedDevice[]) => TrackedDevice[]) => void;
  firestoreLiveActive: boolean;
  maintenanceByImei: MaintenanceMap;
  updateVehicleOdometer: (
    deviceId: string,
    rawOdometer: string | number
  ) => Promise<{
    ok: boolean;
    odometerKm?: number;
    syncedToFirestore: boolean;
    error?: string;
  }>;
  completeServiceMilestone: (
    deviceId: string,
    milestoneId: ServiceMilestoneId
  ) => Promise<{
    ok: boolean;
    syncedToFirestore: boolean;
    error?: string;
  }>;
  warranties: WarrantyRecord[];
  registerWarranty: (
    record: Omit<WarrantyRecord, 'id' | 'status' | 'expiresOn'>
  ) => WarrantyRecord;
  bookings: InstallationBooking[];
  addInstallationBooking: (
    booking: Omit<InstallationBooking, 'id' | 'status'>
  ) => InstallationBooking;
  demoRequests: DemoRequest[];
  addDemoRequest: (req: Omit<DemoRequest, 'id' | 'createdAt'>) => DemoRequest;
  toasts: ToastMessage[];
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: number) => void;
  liveTracking: LiveTrackingState;
  triggerLiveTracking: (
    record: RtoVehicleMetadata,
    options?: { openView?: boolean }
  ) => void;
  clearLiveTracking: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEY = 'vs_tech_store_state_v1';
const INITIAL_DEVICE_IDS = new Set(INITIAL_DEVICES.map((d) => d.id));

function mergeDevices(
  primary: TrackedDevice[],
  secondary: TrackedDevice[]
): TrackedDevice[] {
  const seenImeis = new Set<string>();
  const merged: TrackedDevice[] = [];
  for (const item of [...primary, ...secondary]) {
    const key = item.imei.trim();
    if (!key || seenImeis.has(key)) continue;
    seenImeis.add(key);
    merged.push(item);
  }
  return merged;
}

interface PersistedState {
  theme: 'dark' | 'light';
  cart: CartItem[];
  wishlist: string[];
  promoCode: string;
  user: UserProfile;
  orders: Order[];
  customDevices: TrackedDevice[];
  maintenanceByImei: MaintenanceMap;
  warranties: WarrantyRecord[];
  bookings: InstallationBooking[];
  demoRequests: DemoRequest[];
}

const DEFAULT_USER: UserProfile = {
  name: 'Arjun Mehta (Demo)',
  email: 'arjun.mehta@example.com',
  phone: '9876543210',
  company: 'Mehta Logistics Pvt. Ltd.',
  isAuthenticated: false,
  authProvider: 'demo',
};

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => loadPersistedState(), []);

  const [theme, setTheme] = useState<'dark' | 'light'>(
    initial.theme ?? 'dark'
  );
  const [route, setRoute] = useState<AppRoute>(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '';
    const initialView = resolveInitialViewFromSearch(search);
    if (initialView === 'new-vehicle' || pathname === '/new-vehicle') {
      return { page: 'new-vehicle' };
    }
    if (initialView === 'platform' || pathname === '/platform') {
      const trackRto = parseTrackRtoFromSearch(search);
      return { page: 'platform', ...(trackRto ? { trackRto } : {}) };
    }
    if (pathname === '/live-tracking' || new URLSearchParams(search).get('view') === 'live-tracking') {
      const rtoNumber = parseTrackRtoFromSearch(search) ?? undefined;
      return { page: 'live-tracking', rtoNumber };
    }
    if (initialView === 'account') {
      return (initial.user?.isAuthenticated)
        ? { page: 'account', tab: 'tracking' }
        : { page: 'login' };
    }
    if (initialView === 'shop') return { page: 'shop' };
    if (initialView === 'book-demo') return { page: 'book-demo' };
    return { page: 'home' };
  });
  const [liveTracking, setLiveTracking] = useState<LiveTrackingState>(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const rtoFromUrl = parseTrackRtoFromSearch(search);
    if (rtoFromUrl) {
      const matched = lookupVehicleRecordByRto(rtoFromUrl, []);
      if (matched) return createInitialLiveTrackingState(matched);
    }
    return createInitialLiveTrackingState();
  });
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>(initial.cart ?? []);
  const [wishlist, setWishlist] = useState<string[]>(initial.wishlist ?? []);
  const [promoCode, setPromoCode] = useState<string>(initial.promoCode ?? '');
  const [user, setUser] = useState<UserProfile>(initial.user ?? DEFAULT_USER);
  const [orders, setOrders] = useState<Order[]>(
    initial.orders ?? INITIAL_ORDERS
  );
  const [devices, setDevices] = useState<TrackedDevice[]>(() =>
    mergeDevices(initial.customDevices ?? [], INITIAL_DEVICES)
  );
  const [maintenanceByImei, setMaintenanceByImei] = useState<MaintenanceMap>(
    initial.maintenanceByImei ?? {}
  );
  const [warranties, setWarranties] = useState<WarrantyRecord[]>(
    initial.warranties ?? INITIAL_WARRANTIES
  );
  const [bookings, setBookings] = useState<InstallationBooking[]>(
    initial.bookings ?? INITIAL_BOOKINGS
  );
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>(
    initial.demoRequests ?? []
  );
  const [firestoreLiveActive, setFirestoreLiveActive] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Persist to localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        theme,
        cart,
        wishlist,
        promoCode,
        user,
        orders,
        customDevices: devices.filter((d) => !INITIAL_DEVICE_IDS.has(d.id)),
        maintenanceByImei,
        warranties,
        bookings,
        demoRequests,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota issues
    }
  }, [
    theme,
    cart,
    wishlist,
    promoCode,
    user,
    orders,
    devices,
    maintenanceByImei,
    warranties,
    bookings,
    demoRequests,
  ]);

  const showToast = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'success') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, text, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  // Firebase Auth listener + Firestore & Cloud SQL synchronization
  useEffect(() => {
    let unsubVehicleDevices: (() => void) | null = null;
    let unsubVehicleMaintenance: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      unsubVehicleDevices?.();
      unsubVehicleDevices = null;
      unsubVehicleMaintenance?.();
      unsubVehicleMaintenance = null;
      setFirestoreLiveActive(false);

      if (!fbUser) return;
      const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'VS Fleet User';
      const email = fbUser.email || '';

      setUser((prev) => ({
        ...prev,
        uid: fbUser.uid,
        name: displayName,
        email: email || prev.email,
        photoURL: fbUser.photoURL ?? undefined,
        company: prev.company && prev.company !== 'Mehta Logistics Pvt. Ltd.' ? prev.company : 'Verified Google Account',
        isAuthenticated: true,
        authProvider: 'google',
      }));

      // Sync Firestore public workspace doc + private PII doc + wishlist
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const existingUserSnap = await getDoc(userDocRef);
        if (!existingUserSnap.exists()) {
          await setDoc(
            userDocRef,
            buildUserWorkspaceCreatePayload(fbUser.uid, displayName, serverTimestamp())
          );
        } else {
          await updateDoc(
            userDocRef,
            buildUserWorkspaceUpdatePayload(displayName, serverTimestamp())
          );
        }

        if (email.trim().length >= 3) {
          const privateRef = doc(db, 'users', fbUser.uid, 'private', 'profile');
          const privateSnap = await getDoc(privateRef);
          if (!privateSnap.exists()) {
            await setDoc(
              privateRef,
              buildUserPrivateCreatePayload(fbUser.uid, email, serverTimestamp())
            );
          } else {
            await updateDoc(
              privateRef,
              buildUserPrivateUpdatePayload(email, serverTimestamp())
            );
          }
        }

        const wishlistSnap = await getDoc(doc(db, 'wishlists', fbUser.uid));
        if (wishlistSnap.exists()) {
          const items = wishlistSnap.data().productIds;
          if (Array.isArray(items)) {
            setWishlist((prev) => Array.from(new Set([...items.map(String), ...prev])).slice(0, 50));
          }
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
        } catch {
          // Logged cleanly inside handleFirestoreError
        }
      }

      // Attach Firestore live listener for registered vehicleDevices scoped to verified owner
      if (fbUser.emailVerified) {
        const devicesQuery = query(
          collection(db, 'vehicleDevices'),
          where('ownerId', '==', fbUser.uid)
        );
        unsubVehicleDevices = onSnapshot(
          devicesQuery,
          (snapshot) => {
            setFirestoreLiveActive(true);
            const removedImeis = new Set<string>();
            for (const change of snapshot.docChanges()) {
              if (change.type === 'removed') {
                const removedImei = String(change.doc.data().imei ?? '').trim();
                if (removedImei) removedImeis.add(removedImei);
              }
            }

            const cloudDevices: TrackedDevice[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const rawType = String(data.vehicleType ?? '');
              const vehicleType: VehicleType = isAllowedVehicleType(rawType)
                ? rawType
                : 'Commercial Truck / Fleet';
              const rawSource = String(data.telemetrySource ?? '');
              const telemetrySource: TelemetrySource =
                rawSource === 'gps' || rawSource === 'manual' || rawSource === 'simulated'
                  ? rawSource
                  : 'simulated';
              const updatedAtVal = data.updatedAt as
                | { toDate?: () => Date }
                | undefined;
              const pingIso =
                updatedAtVal && typeof updatedAtVal.toDate === 'function'
                  ? updatedAtVal.toDate().toISOString()
                  : new Date().toISOString();

              return buildTrackedDeviceFromRegistration({
                deviceId: String(data.deviceId ?? docSnap.id),
                imei: String(data.imei ?? ''),
                nickname: String(data.nickname ?? 'Fleet Vehicle'),
                vehicleType,
                model: String(data.model ?? defaultModelForVehicleType(vehicleType)),
                simExpiry: String(data.simExpiry ?? computeDefaultSimExpiry()),
                status:
                  data.status === 'Moving' || data.status === 'Alert'
                    ? data.status
                    : 'Idle',
                speedKmh: typeof data.speedKmh === 'number' ? data.speedKmh : undefined,
                latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
                longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
                headingDeg: typeof data.headingDeg === 'number' ? data.headingDeg : undefined,
                telemetrySource,
                cloudSynced: true,
                lastUpdated:
                  telemetrySource === 'gps'
                    ? 'Live Device GPS · Firestore'
                    : telemetrySource === 'manual'
                    ? 'Manual GPS Ping · Firestore'
                    : 'Real-Time Sync · Firestore',
                lastPingAt: pingIso,
              });
            });

            setDevices((prev) => {
              const retainedLocal = prev.filter(
                (d) => !d.cloudSynced && !removedImeis.has(d.imei.trim())
              );
              return mergeDevices(cloudDevices, retainedLocal);
            });
          },
          (error) => {
            setFirestoreLiveActive(false);
            try {
              handleFirestoreError(error, OperationType.LIST, 'vehicleDevices');
            } catch {
              // Logged cleanly inside handleFirestoreError
            }
          }
        );

        const maintQuery = query(
          collection(db, 'vehicleMaintenance'),
          where('ownerId', '==', fbUser.uid)
        );
        unsubVehicleMaintenance = onSnapshot(
          maintQuery,
          (snapshot) => {
            const cloudMaint: MaintenanceMap = {};
            for (const docSnap of snapshot.docs) {
              const data = docSnap.data();
              const imei = String(data.imei ?? '').trim();
              if (!imei) continue;
              cloudMaint[imei] = {
                deviceId: String(data.deviceId ?? ''),
                imei,
                odometerKm: Number(data.odometerKm ?? 0),
                lastServiceOdometers: {
                  oil_change: Number(data.oilChangeLastKm ?? 0),
                  air_filter: Number(data.airFilterLastKm ?? 0),
                  fuel_filter: Number(data.fuelFilterLastKm ?? 0),
                  brake_inspection: Number(data.brakeCheckLastKm ?? 0),
                  transmission_oil: Number(data.transmissionLastKm ?? 0),
                },
                updatedAt: 'Synced via Cloud Firestore',
                cloudSynced: true,
              };
            }
            if (Object.keys(cloudMaint).length > 0) {
              setMaintenanceByImei((prev) => ({ ...prev, ...cloudMaint }));
            }
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'vehicleMaintenance');
            } catch {
              // Logged cleanly inside handleFirestoreError
            }
          }
        );
      }

      // Sync Cloud SQL snapshot
      try {
        const token = await fbUser.getIdToken();
        const resp = await fetch('/api/account/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ displayName }),
        });
        if (resp.ok) {
          const snapshot = await resp.json();
          if (Array.isArray(snapshot.orders) && snapshot.orders.length > 0) {
            setOrders((prev) => {
              const seen = new Set(snapshot.orders.map((o: Order) => o.id));
              return [...snapshot.orders, ...prev.filter((o) => !seen.has(o.id))];
            });
          }
          if (Array.isArray(snapshot.warranties) && snapshot.warranties.length > 0) {
            setWarranties((prev) => {
              const seen = new Set(snapshot.warranties.map((w: WarrantyRecord) => w.id));
              return [...snapshot.warranties, ...prev.filter((w) => !seen.has(w.id))];
            });
          }
          if (Array.isArray(snapshot.bookings) && snapshot.bookings.length > 0) {
            setBookings((prev) => {
              const seen = new Set(snapshot.bookings.map((b: InstallationBooking) => b.id));
              return [...snapshot.bookings, ...prev.filter((b) => !seen.has(b.id))];
            });
          }
        }
      } catch {
        // Offline or transient network abort; local and Firestore state remain active.
      }
    });

    return () => {
      unsubVehicleDevices?.();
      unsubVehicleMaintenance?.();
      unsub();
    };
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const navigate = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    if (nextRoute.page === 'home' && nextRoute.section) {
      window.setTimeout(() => {
        const el = document.getElementById(nextRoute.section!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const triggerLiveTracking = useCallback(
    (record: RtoVehicleMetadata, options?: { openView?: boolean }) => {
      setLiveTracking((prev) => applyLiveTrackingSelection(prev, record));
      if (options?.openView !== false) {
        setRoute((current) =>
          current.page === 'platform'
            ? { ...current, page: 'platform', trackRto: record.vehicleNumber }
            : { page: 'live-tracking', rtoNumber: record.vehicleNumber }
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  const clearLiveTracking = useCallback(() => {
    setLiveTracking((prev) => clearLiveTrackingSelection(prev));
  }, []);

  const cartTotals = useMemo(
    () => calculateCartTotals(cart, products, promoCode),
    [cart, products, promoCode]
  );

  const addToCart = useCallback(
    (
      productId: string,
      quantity = 1,
      plan: CartItem['plan'] = '1-Year Cloud SIM'
    ) => {
      const product = products.find((p) => p.id === productId);
      setCart((prev) => {
        const existingIdx = prev.findIndex(
          (i) => i.productId === productId && i.plan === plan
        );
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + quantity,
          };
          return updated;
        }
        return [...prev, { productId, quantity, plan }];
      });
      if (product) {
        showToast(`Added ${product.name} to cart.`);
      }
    },
    [products, showToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, plan: CartItem['plan'], quantity: number) => {
      setCart((prev) => {
        if (quantity <= 0) {
          return prev.filter(
            (i) => !(i.productId === productId && i.plan === plan)
          );
        }
        return prev.map((i) =>
          i.productId === productId && i.plan === plan
            ? { ...i, quantity }
            : i
        );
      });
    },
    []
  );

  const removeFromCart = useCallback(
    (productId: string, plan: CartItem['plan']) => {
      setCart((prev) =>
        prev.filter((i) => !(i.productId === productId && i.plan === plan))
      );
      showToast('Item removed from cart.', 'info');
    },
    [showToast]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setPromoCode('');
  }, []);

  const toggleWishlist = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const exists = prev.includes(productId);
        const next = exists
          ? prev.filter((id) => id !== productId)
          : [...prev, productId];
        showToast(
          exists ? 'Removed from wishlist.' : 'Saved to wishlist.',
          'info'
        );
        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          const wishlistRef = doc(db, 'wishlists', uid);
          void getDoc(wishlistRef)
            .then((snap) => {
              if (!snap.exists()) {
                return setDoc(
                  wishlistRef,
                  buildWishlistCreatePayload(uid, next, serverTimestamp())
                );
              }
              return updateDoc(
                wishlistRef,
                buildWishlistUpdatePayload(next, serverTimestamp())
              );
            })
            .catch((err) => {
              try {
                handleFirestoreError(err, OperationType.WRITE, `wishlists/${uid}`);
              } catch {
                // Logged
              }
            });
        }
        return next;
      });
    },
    [showToast]
  );

  const addProductReview = useCallback(
    (productId: string, review: Omit<ProductReview, 'id' | 'date'>) => {
      const newReview: ProductReview = {
        ...review,
        id: `rev-${Date.now()}`,
        date: 'Nov 2026',
      };
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const nextReviews = [newReview, ...p.reviews];
          const avg =
            nextReviews.reduce((sum, r) => sum + r.rating, 0) /
            nextReviews.length;
          return {
            ...p,
            reviews: nextReviews,
            reviewCount: p.reviewCount + 1,
            rating: Number(avg.toFixed(1)),
          };
        })
      );
      showToast('Thank you! Your review has been posted.');
    },
    [showToast]
  );

  const loginUser = useCallback(
    (profile: Omit<UserProfile, 'isAuthenticated'>) => {
      setUser({ ...profile, isAuthenticated: true, authProvider: 'demo' });
      showToast(`Signed in as ${profile.name}`);
    },
    [showToast]
  );

  const signInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    showToast(`Signed in with Google as ${cred.user.displayName || cred.user.email}`);
  }, [showToast]);

  const logoutUser = useCallback(() => {
    void signOut(auth).catch(() => undefined);
    setUser((prev) => ({
      ...prev,
      uid: undefined,
      photoURL: undefined,
      authProvider: undefined,
      isAuthenticated: false,
    }));
    showToast('Signed out of VS Account.', 'info');
  }, [showToast]);

  const placeOrder = useCallback(
    (orderData: Omit<Order, 'id' | 'date' | 'status'>) => {
      const newOrder: Order = {
        ...orderData,
        id: `VST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().slice(0, 10),
        status: 'Confirmed',
      };
      setOrders((prev) => [newOrder, ...prev]);
      clearCart();

      if (auth.currentUser) {
        void auth.currentUser.getIdToken().then((token) =>
          fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...orderData,
              orderCode: newOrder.id,
            }),
          })
        ).catch(() => undefined);
      }

      return newOrder;
    },
    [clearCart]
  );

  const registerWarranty = useCallback(
    (record: Omit<WarrantyRecord, 'id' | 'status' | 'expiresOn'>) => {
      const purchaseYear = Number(record.purchaseDate.slice(0, 4)) || 2026;
      const expiresOn = `${purchaseYear + 2}${record.purchaseDate.slice(4)}`;
      const created: WarrantyRecord = {
        ...record,
        id: `war-${Date.now()}`,
        status: 'Active',
        expiresOn,
      };
      setWarranties((prev) => [created, ...prev]);

      if (auth.currentUser) {
        void auth.currentUser.getIdToken().then((token) =>
          fetch('/api/warranties', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...record,
              warrantyCode: created.id,
              expiresOn,
            }),
          })
        ).catch(() => undefined);
      }

      return created;
    },
    []
  );

  const addInstallationBooking = useCallback(
    (booking: Omit<InstallationBooking, 'id' | 'status'>) => {
      const created: InstallationBooking = {
        ...booking,
        id: `ins-${Math.floor(200 + Math.random() * 800)}`,
        status: 'Scheduled',
      };
      setBookings((prev) => [created, ...prev]);

      if (auth.currentUser) {
        void auth.currentUser.getIdToken().then((token) =>
          fetch('/api/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...booking,
              bookingCode: created.id,
            }),
          })
        ).catch(() => undefined);
      }

      return created;
    },
    []
  );

  const addDemoRequest = useCallback(
    (req: Omit<DemoRequest, 'id' | 'createdAt'>) => {
      const created: DemoRequest = {
        ...req,
        id: `demo-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setDemoRequests((prev) => [created, ...prev]);

      const postRequest = async () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (auth.currentUser) {
          headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
        }
        await fetch('/api/demo-requests', {
          method: 'POST',
          headers,
          body: JSON.stringify(req),
        });
      };
      void postRequest().catch(() => undefined);

      return created;
    },
    []
  );

  const registerVehicleDevice = useCallback(
    async (input: {
      imei: string;
      nickname: string;
      vehicleType: VehicleType;
      model?: string;
    }) => {
      const cleanImei = input.imei.trim();
      if (devices.some((d) => d.imei.trim() === cleanImei)) {
        return {
          ok: false,
          syncedToFirestore: false,
          error: 'A vehicle with this IMEI is already registered in your fleet.',
        };
      }

      const firebaseUser = auth.currentUser;
      const canWriteFirestore = Boolean(firebaseUser && firebaseUser.emailVerified);
      const ownerId = firebaseUser?.uid;
      const deviceId = buildVehicleDeviceId(cleanImei, ownerId);
      const simExpiry = computeDefaultSimExpiry();
      const resolvedModel =
        input.model && input.model.trim().length >= 2
          ? input.model.trim()
          : defaultModelForVehicleType(input.vehicleType);

      const anchor = getAnchorCoordinatesForDevice({
        imei: cleanImei,
        id: deviceId,
        vehicleLabel: input.nickname,
      });

      if (canWriteFirestore && firebaseUser) {
        const docPath = `vehicleDevices/${deviceId}`;
        const payload = buildVehicleDeviceCreatePayload({
          deviceId,
          ownerId: firebaseUser.uid,
          imei: cleanImei,
          nickname: input.nickname,
          vehicleType: input.vehicleType,
          model: resolvedModel,
          status: 'Moving',
          simExpiry,
          latitude: anchor.lat,
          longitude: anchor.lng,
          speedKmh: anchor.baseSpeedKmh,
          headingDeg: anchor.baseHeadingDeg,
          telemetrySource: 'simulated',
          timestamp: serverTimestamp(),
        });
        try {
          await setDoc(doc(db, 'vehicleDevices', deviceId), payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, docPath);
        }
      }

      const newDevice = buildTrackedDeviceFromRegistration({
        deviceId,
        imei: cleanImei,
        nickname: input.nickname,
        vehicleType: input.vehicleType,
        model: resolvedModel,
        simExpiry,
        status: 'Moving',
        speedKmh: anchor.baseSpeedKmh,
        latitude: anchor.lat,
        longitude: anchor.lng,
        headingDeg: anchor.baseHeadingDeg,
        telemetrySource: 'simulated',
        cloudSynced: canWriteFirestore,
        lastUpdated: canWriteFirestore
          ? 'Live tracking active · Firestore'
          : 'Live tracking active · just now',
      });

      setDevices((prev) => mergeDevices([newDevice], prev));
      showToast(
        canWriteFirestore
          ? `Registered ${newDevice.vehicleLabel} — live tracking started & synced to Firestore.`
          : `Registered ${newDevice.vehicleLabel} — live tracking started on map.`
      );

      return {
        ok: true,
        device: newDevice,
        syncedToFirestore: canWriteFirestore,
      };
    },
    [devices, showToast]
  );

  const bulkUpdateDevicesTelemetry = useCallback(
    (updater: (prev: TrackedDevice[]) => TrackedDevice[]) => {
      setDevices((prev) => updater(prev));
    },
    []
  );

  const updateVehicleTelemetry = useCallback(
    async (
      deviceId: string,
      update: TelemetryUpdatePayload,
      options?: { syncFirestore?: boolean }
    ) => {
      let targetDevice: TrackedDevice | undefined;
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id !== deviceId) return d;
          targetDevice = d;
          return {
            ...d,
            latitude: update.latitude,
            longitude: update.longitude,
            speedKmh: update.speedKmh,
            headingDeg: update.headingDeg,
            status: update.status,
            telemetrySource: update.telemetrySource,
            accuracyMeters: update.accuracyMeters,
            lastUpdated: update.lastUpdated,
            lastPingAt: update.lastPingAt,
          };
        })
      );

      let syncedToFirestore = false;
      const firebaseUser = auth.currentUser;
      const canWriteFirestore = Boolean(
        options?.syncFirestore &&
          firebaseUser &&
          firebaseUser.emailVerified &&
          !INITIAL_DEVICE_IDS.has(deviceId)
      );

      if (canWriteFirestore && firebaseUser) {
        const docPath = `vehicleDevices/${deviceId}`;
        try {
          await updateDoc(
            doc(db, 'vehicleDevices', deviceId),
            buildVehicleDeviceTelemetryUpdatePayload({
              status: update.status,
              latitude: update.latitude,
              longitude: update.longitude,
              speedKmh: update.speedKmh,
              headingDeg: update.headingDeg,
              telemetrySource: update.telemetrySource,
              timestamp: serverTimestamp(),
            })
          );
          syncedToFirestore = true;
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.UPDATE, docPath);
          } catch {
            // Logged cleanly inside handleFirestoreError
          }
        }
      }

      return { ok: Boolean(targetDevice || true), syncedToFirestore };
    },
    []
  );

  const persistMaintenanceToFirestore = useCallback(
    async (device: TrackedDevice, nextRecord: VehicleMaintenanceRecord) => {
      const firebaseUser = auth.currentUser;
      const canWriteFirestore = Boolean(firebaseUser && firebaseUser.emailVerified);
      if (!canWriteFirestore || !firebaseUser) return false;

      const maintenanceId = buildVehicleMaintenanceDocId(device.id, firebaseUser.uid);
      const docPath = `vehicleMaintenance/${maintenanceId}`;
      const docRef = doc(db, 'vehicleMaintenance', maintenanceId);

      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(
            docRef,
            buildVehicleMaintenanceCreatePayload({
              maintenanceId,
              ownerId: firebaseUser.uid,
              deviceId: device.id,
              imei: device.imei,
              odometerKm: nextRecord.odometerKm,
              oilChangeLastKm: nextRecord.lastServiceOdometers.oil_change,
              airFilterLastKm: nextRecord.lastServiceOdometers.air_filter,
              fuelFilterLastKm: nextRecord.lastServiceOdometers.fuel_filter,
              brakeCheckLastKm: nextRecord.lastServiceOdometers.brake_inspection,
              transmissionLastKm: nextRecord.lastServiceOdometers.transmission_oil,
              timestamp: serverTimestamp(),
            })
          );
        } else {
          await updateDoc(
            docRef,
            buildVehicleMaintenanceUpdatePayload({
              odometerKm: nextRecord.odometerKm,
              oilChangeLastKm: nextRecord.lastServiceOdometers.oil_change,
              airFilterLastKm: nextRecord.lastServiceOdometers.air_filter,
              fuelFilterLastKm: nextRecord.lastServiceOdometers.fuel_filter,
              brakeCheckLastKm: nextRecord.lastServiceOdometers.brake_inspection,
              transmissionLastKm: nextRecord.lastServiceOdometers.transmission_oil,
              timestamp: serverTimestamp(),
            })
          );
        }
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
        return false;
      }
    },
    []
  );

  const updateVehicleOdometer = useCallback(
    async (deviceId: string, rawOdometer: string | number) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        return { ok: false, syncedToFirestore: false, error: 'Vehicle device not found.' };
      }
      const parsed = validateOdometerInput(rawOdometer);
      if (!parsed.ok) {
        return { ok: false, syncedToFirestore: false, error: parsed.error };
      }

      const current = resolveMaintenanceRecord(device, maintenanceByImei);
      const nextRecord = applyOdometerUpdate(current, parsed.odometerKm);

      setMaintenanceByImei((prev) => ({
        ...prev,
        [device.imei.trim()]: nextRecord,
      }));

      const syncedToFirestore = await persistMaintenanceToFirestore(device, nextRecord);
      showToast(
        `Updated ${device.vehicleLabel} odometer to ${parsed.odometerKm.toLocaleString('en-IN')} km.`
      );

      return {
        ok: true,
        odometerKm: parsed.odometerKm,
        syncedToFirestore,
      };
    },
    [devices, maintenanceByImei, persistMaintenanceToFirestore, showToast]
  );

  const completeServiceMilestone = useCallback(
    async (deviceId: string, milestoneId: ServiceMilestoneId) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        return { ok: false, syncedToFirestore: false, error: 'Vehicle device not found.' };
      }
      const current = resolveMaintenanceRecord(device, maintenanceByImei);
      const nextRecord = applyServiceCompletion(current, milestoneId);

      setMaintenanceByImei((prev) => ({
        ...prev,
        [device.imei.trim()]: nextRecord,
      }));

      const syncedToFirestore = await persistMaintenanceToFirestore(device, nextRecord);
      showToast(
        `Logged completed maintenance for ${device.vehicleLabel} at ${nextRecord.odometerKm.toLocaleString('en-IN')} km.`
      );

      return { ok: true, syncedToFirestore };
    },
    [devices, maintenanceByImei, persistMaintenanceToFirestore, showToast]
  );

  return (
    <StoreContext.Provider
      value={{
        theme,
        toggleTheme,
        route,
        navigate,
        products,
        addProductReview,
        cart,
        cartTotals,
        promoCode,
        setPromoCode,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        wishlist,
        toggleWishlist,
        user,
        loginUser,
        signInWithGoogle,
        logoutUser,
        orders,
        placeOrder,
        devices,
        registerVehicleDevice,
        updateVehicleTelemetry,
        bulkUpdateDevicesTelemetry,
        firestoreLiveActive,
        maintenanceByImei,
        updateVehicleOdometer,
        completeServiceMilestone,
        warranties,
        registerWarranty,
        bookings,
        addInstallationBooking,
        demoRequests,
        addDemoRequest,
        toasts,
        showToast,
        dismissToast,
        liveTracking,
        triggerLiveTracking,
        clearLiveTracking,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
