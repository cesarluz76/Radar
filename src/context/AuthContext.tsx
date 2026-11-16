import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase.ts';
import type {
  Market,
  PortfolioTransactionRecord,
  UserPlan,
} from '../shared/types.ts';

export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  plan: UserPlan;
  preferredMarket: 'ALL' | Market;
  preferredCurrency: 'BRL' | 'USD';
  financialGoal: number;
  lgpdConsentAt?: string;
}

export interface PortfolioDoc {
  id: string;
  userId: string;
  name: string;
  currency: 'BRL' | 'USD';
  goalAmount: number;
}

export interface PriceAlertDoc {
  id: string;
  userId: string;
  ticker: string;
  market: Market;
  alertType:
    | 'PRICE_BELOW'
    | 'PRICE_ABOVE'
    | 'CONSENSUS_3X'
    | 'CONSENSUS_4X'
    | 'CONSENSUS_5X'
    | 'DIVIDEND_YIELD'
    | 'FUNDAMENTAL_CHANGE'
    | 'EARNINGS';
  targetValue: number;
  channels: string[];
  frequency: 'REALTIME' | 'HOURLY' | 'DAILY';
  active: boolean;
  lastTriggeredAt?: string;
}

export interface UserNotificationDoc {
  id: string;
  userId: string;
  alertId?: string;
  ticker: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: unknown;
}

export interface WatchlistItemDoc {
  id: string;
  userId: string;
  ticker: string;
  market: Market;
  notes?: string;
}

export interface SavedFilterDoc {
  id: string;
  userId: string;
  name: string;
  market: 'ALL' | Market;
  sector?: string;
  maxPE?: number;
  minROE?: number;
  minDY?: number;
  consensusLevel: 'ALL' | '3X' | '4X' | '5X';
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfileDoc | null;
  authReady: boolean;
  isAdmin: boolean;
  effectivePlan: UserPlan;
  portfolios: PortfolioDoc[];
  transactions: PortfolioTransactionRecord[];
  alerts: PriceAlertDoc[];
  notifications: UserNotificationDoc[];
  watchlist: WatchlistItemDoc[];
  savedFilters: SavedFilterDoc[];
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  apiFetch: <T>(url: string, init?: RequestInit) => Promise<T>;
  updateProfileSettings: (patch: Partial<UserProfileDoc>) => Promise<void>;
  addTransaction: (
    tx: Omit<PortfolioTransactionRecord, 'id' | 'userId'>
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    patch: Partial<PortfolioTransactionRecord>
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  toggleWatchlist: (ticker: string, market: Market) => Promise<void>;
  addAlert: (
    alert: Omit<PriceAlertDoc, 'id' | 'userId'>
  ) => Promise<void>;
  toggleAlertActive: (id: string, active: boolean) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  saveScreenerFilter: (
    filter: Omit<SavedFilterDoc, 'id' | 'userId'>
  ) => Promise<void>;
  deleteSavedFilter: (id: string) => Promise<void>;
  setEntitlementToken: (token: string | null) => void;
  exportAllUserData: () => string;
  deleteAllUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [entitlementToken, setEntitlementTokenState] = useState<string | null>(null);

  const [portfolios, setPortfolios] = useState<PortfolioDoc[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransactionRecord[]>([]);
  const [alerts, setAlerts] = useState<PriceAlertDoc[]>([]);
  const [notifications, setNotifications] = useState<UserNotificationDoc[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItemDoc[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilterDoc[]>([]);

  const isAdmin = Boolean(
    user?.emailVerified && user.email?.toLowerCase() === 'cesarluzz76@gmail.com'
  );

  const effectivePlan: UserPlan = isAdmin
    ? 'PREMIUM'
    : profile?.plan || 'FREE';

  const setEntitlementToken = useCallback((token: string | null) => {
    setEntitlementTokenState(token);
  }, []);

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers || {});
      if (user) {
        const token = await user.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (entitlementToken) {
        headers.set('x-entitlement-token', entitlementToken);
      }
      if (init?.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(url, { ...init, headers });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    },
    [user, entitlementToken]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setPortfolios([]);
        setTransactions([]);
        setAlerts([]);
        setNotifications([]);
        setWatchlist([]);
        setSavedFilters([]);
        setAuthReady(true);
        return;
      }

      const userPath = `users/${u.uid}`;
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (!snap.exists()) {
          const initialProfile = {
            uid: u.uid,
            email: u.email || 'investidor@radarvaluation.com',
            displayName: (u.displayName || u.email?.split('@')[0] || 'Investidor').slice(0, 120),
            ...(u.photoURL ? { photoUrl: u.photoURL.slice(0, 500) } : {}),
            plan: 'FREE' as const,
            preferredMarket: 'ALL' as const,
            preferredCurrency: 'BRL' as const,
            financialGoal: 500000,
            lgpdConsentAt: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', u.uid), initialProfile);

          // Create default portfolio
          const defaultPid = 'principal';
          await setDoc(doc(db, 'users', u.uid, 'portfolios', defaultPid), {
            id: defaultPid,
            userId: u.uid,
            name: 'Carteira Principal',
            currency: 'BRL',
            goalAmount: 500000,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Attach real-time Firestore listeners strictly when user is signed in
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfileDoc);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubPortfolios = onSnapshot(
      query(collection(db, 'users', uid, 'portfolios'), where('userId', '==', uid)),
      (snap) => {
        setPortfolios(snap.docs.map((d) => d.data() as PortfolioDoc));
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/portfolios`)
    );

    const unsubTx = onSnapshot(
      query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid)),
      (snap) => {
        setTransactions(snap.docs.map((d) => d.data() as PortfolioTransactionRecord));
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`)
    );

    const unsubAlerts = onSnapshot(
      query(collection(db, 'users', uid, 'alerts'), where('userId', '==', uid)),
      (snap) => {
        setAlerts(snap.docs.map((d) => d.data() as PriceAlertDoc));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/alerts`)
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        setNotifications(snap.docs.map((d) => d.data() as UserNotificationDoc));
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/notifications`)
    );

    const unsubWatch = onSnapshot(
      query(collection(db, 'users', uid, 'watchlists'), where('userId', '==', uid)),
      (snap) => {
        setWatchlist(snap.docs.map((d) => d.data() as WatchlistItemDoc));
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/watchlists`)
    );

    const unsubFilters = onSnapshot(
      query(collection(db, 'users', uid, 'saved_filters'), where('userId', '==', uid)),
      (snap) => {
        setSavedFilters(snap.docs.map((d) => d.data() as SavedFilterDoc));
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/saved_filters`)
    );

    return () => {
      unsubProfile();
      unsubPortfolios();
      unsubTx();
      unsubAlerts();
      unsubNotifs();
      unsubWatch();
      unsubFilters();
    };
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setEntitlementTokenState(null);
  }, []);

  const updateProfileSettings = useCallback(
    async (patch: Partial<UserProfileDoc>) => {
      if (!user || !profile) return;
      const path = `users/${user.uid}`;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          ...(patch.displayName ? { displayName: patch.displayName.slice(0, 120) } : {}),
          ...(patch.preferredMarket ? { preferredMarket: patch.preferredMarket } : {}),
          ...(patch.preferredCurrency ? { preferredCurrency: patch.preferredCurrency } : {}),
          ...(typeof patch.financialGoal === 'number'
            ? { financialGoal: Math.max(0, patch.financialGoal) }
            : {}),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user, profile]
  );

  const ensurePortfolioExists = useCallback(
    async (portfolioId: string): Promise<string> => {
      if (!user) throw new Error('Usuário não autenticado.');
      if (portfolios.some((p) => p.id === portfolioId)) return portfolioId;
      const pid = portfolioId || 'principal';
      await setDoc(doc(db, 'users', user.uid, 'portfolios', pid), {
        id: pid,
        userId: user.uid,
        name: 'Carteira Principal',
        currency: 'BRL',
        goalAmount: profile?.financialGoal ?? 500000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return pid;
    },
    [user, portfolios, profile]
  );

  const addTransaction = useCallback(
    async (tx: Omit<PortfolioTransactionRecord, 'id' | 'userId'>) => {
      if (!user) return;
      const pid = await ensurePortfolioExists(tx.portfolioId || 'principal');
      const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'transactions', id), {
          id,
          userId: user.uid,
          portfolioId: pid,
          ticker: tx.ticker.trim().toUpperCase().slice(0, 20),
          market: tx.market,
          assetType: tx.assetType,
          operationType: tx.operationType,
          quantity: Math.max(0, Number(tx.quantity)),
          unitPrice: Math.max(0, Number(tx.unitPrice)),
          fees: Math.max(0, Number(tx.fees || 0)),
          brokerage: Math.max(0, Number(tx.brokerage || 0)),
          fxRate: Math.max(0.01, Number(tx.fxRate || 1)),
          currency: tx.currency,
          date: tx.date.slice(0, 10),
          ...(tx.notes ? { notes: tx.notes.slice(0, 300) } : {}),
          ...(tx.splitRatio ? { splitRatio: Number(tx.splitRatio) } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user, ensurePortfolioExists]
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<PortfolioTransactionRecord>) => {
      if (!user) return;
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user) return;
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const toggleWatchlist = useCallback(
    async (ticker: string, market: Market) => {
      if (!user) return;
      const clean = ticker.trim().toUpperCase();
      const existing = watchlist.find((w) => w.ticker === clean);
      if (existing) {
        const path = `users/${user.uid}/watchlists/${existing.id}`;
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'watchlists', existing.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        const id = `wl_${clean.replace(/[^A-Z0-9_-]/g, '_')}`;
        const path = `users/${user.uid}/watchlists/${id}`;
        try {
          await setDoc(doc(db, 'users', user.uid, 'watchlists', id), {
            id,
            userId: user.uid,
            ticker: clean,
            market,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
    },
    [user, watchlist]
  );

  const addAlert = useCallback(
    async (alert: Omit<PriceAlertDoc, 'id' | 'userId'>) => {
      if (!user) return;
      const id = `al_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const path = `users/${user.uid}/alerts/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'alerts', id), {
          id,
          userId: user.uid,
          ticker: alert.ticker.trim().toUpperCase().slice(0, 20),
          market: alert.market,
          alertType: alert.alertType,
          targetValue: Math.max(0, Number(alert.targetValue)),
          channels: alert.channels.slice(0, 3),
          frequency: alert.frequency,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user]
  );

  const toggleAlertActive = useCallback(
    async (id: string, active: boolean) => {
      if (!user) return;
      const path = `users/${user.uid}/alerts/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'alerts', id), {
          active,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const deleteAlert = useCallback(
    async (id: string) => {
      if (!user) return;
      const path = `users/${user.uid}/alerts/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'alerts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (!user) return;
      const path = `users/${user.uid}/notifications/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
          read: true,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const saveScreenerFilter = useCallback(
    async (filter: Omit<SavedFilterDoc, 'id' | 'userId'>) => {
      if (!user) return;
      const id = `flt_${Date.now()}`;
      const path = `users/${user.uid}/saved_filters/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'saved_filters', id), {
          id,
          userId: user.uid,
          name: filter.name.slice(0, 80),
          market: filter.market,
          ...(filter.sector ? { sector: filter.sector.slice(0, 80) } : {}),
          ...(typeof filter.maxPE === 'number' ? { maxPE: filter.maxPE } : {}),
          ...(typeof filter.minROE === 'number' ? { minROE: filter.minROE } : {}),
          ...(typeof filter.minDY === 'number' ? { minDY: filter.minDY } : {}),
          consensusLevel: filter.consensusLevel,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user]
  );

  const deleteSavedFilter = useCallback(
    async (id: string) => {
      if (!user) return;
      const path = `users/${user.uid}/saved_filters/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'saved_filters', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const exportAllUserData = useCallback(() => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        lgpdNotice: 'Exportação integral de dados pessoais e financeiros conforme LGPD (Lei 13.709/2018).',
        profile,
        portfolios,
        transactions,
        alerts,
        watchlist,
        savedFilters,
      },
      null,
      2
    );
  }, [profile, portfolios, transactions, alerts, watchlist, savedFilters]);

  const deleteAllUserData = useCallback(async () => {
    if (!user) return;
    const uid = user.uid;
    const batch = writeBatch(db);
    for (const t of transactions) batch.delete(doc(db, 'users', uid, 'transactions', t.id));
    for (const p of portfolios) batch.delete(doc(db, 'users', uid, 'portfolios', p.id));
    for (const a of alerts) batch.delete(doc(db, 'users', uid, 'alerts', a.id));
    for (const n of notifications) batch.delete(doc(db, 'users', uid, 'notifications', n.id));
    for (const w of watchlist) batch.delete(doc(db, 'users', uid, 'watchlists', w.id));
    for (const f of savedFilters) batch.delete(doc(db, 'users', uid, 'saved_filters', f.id));
    batch.delete(doc(db, 'users', uid));
    await batch.commit();
    await signOut();
  }, [user, transactions, portfolios, alerts, notifications, watchlist, savedFilters, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authReady,
      isAdmin,
      effectivePlan,
      portfolios,
      transactions,
      alerts,
      notifications,
      watchlist,
      savedFilters,
      signInWithGoogle,
      signOut,
      apiFetch,
      updateProfileSettings,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleWatchlist,
      addAlert,
      toggleAlertActive,
      deleteAlert,
      markNotificationRead,
      saveScreenerFilter,
      deleteSavedFilter,
      setEntitlementToken,
      exportAllUserData,
      deleteAllUserData,
    }),
    [
      user,
      profile,
      authReady,
      isAdmin,
      effectivePlan,
      portfolios,
      transactions,
      alerts,
      notifications,
      watchlist,
      savedFilters,
      signInWithGoogle,
      signOut,
      apiFetch,
      updateProfileSettings,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleWatchlist,
      addAlert,
      toggleAlertActive,
      deleteAlert,
      markNotificationRead,
      saveScreenerFilter,
      deleteSavedFilter,
      setEntitlementToken,
      exportAllUserData,
      deleteAllUserData,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
