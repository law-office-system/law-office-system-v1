import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useCallback, useRef, lazy, Suspense, useState } from "react";
import { useAuth } from "./context/AuthContext";

import Layout from "./components/Layout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import ErrorBoundary from "./components/ErrorBoundary";

/* ================= PAGES (Lazy Loaded) ================= */
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AddCase = lazy(() => import("./pages/AddCase"));
const EditCase = lazy(() => import("./pages/EditCase"));
const ActiveCases = lazy(() => import("./pages/ActiveCases"));
const Archive = lazy(() => import("./pages/Archive"));
const CaseDetails = lazy(() => import("./pages/CaseDetails"));
const AddSession = lazy(() => import("./pages/AddSession"));
const AddStage = lazy(() => import("./pages/AddStage"));
const Cases = lazy(() => import("./pages/Cases"));
const Judgments = lazy(() => import("./pages/Judgments"));
const AdminTasks = lazy(() => import("./pages/AdminTasks"));
const RoomMembersAdmin = lazy(() => import("./pages/RoomMembersAdmin"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const OfficesManagement = lazy(() => import("./pages/OfficesManagement"));
const OfficeRoomsManagement = lazy(() => import("./pages/OfficeRoomsManagement"));
const Finance = lazy(() => import("./pages/Finance"));
const CaseFinance = lazy(() => import("./pages/CaseFinance"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Users = lazy(() => import("./pages/Users"));
const AddClient = lazy(() => import("./pages/AddClient"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const OfficeInfo = lazy(() => import("./pages/OfficeInfo"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Chat = lazy(() => import("./pages/Chat"));
const SharedRooms = lazy(() => import("./pages/SharedRooms"));
const SharedRoomChat = lazy(() => import("./pages/SharedRoomChat"));
const OfficeConnections = lazy(() => import("./pages/OfficeConnections"));

import './styles/chat-animations.css';
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

/* ================= OPTIMIZED LOADING SCREEN ================= */
function LoadingScreen() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      background: "#0f172a",
      color: "#d4af37",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        width: "50px",
        height: "50px",
        border: "3px solid rgba(212, 175, 55, 0.2)",
        borderTop: "3px solid #d4af37",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "20px"
      }} />
      <div style={{ fontSize: "18px", fontWeight: 500 }}>
        جاري تحميل النظام...
      </div>
      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>
        Law Office Management System
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ================= OPTIMIZED NOTIFICATION SYNC ================= */
function NotificationSync() {
  const { userData } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncRef = useRef(0);
  const syncTimeoutRef = useRef(null);

  const checkAndSync = useCallback(async () => {
    if (!userData?.officeId || isSyncing) return;

    const now = Date.now();
    // ✅ منع التزامن المتكرر (أقل من 5 دقائق)
    if (now - lastSyncRef.current < 5 * 60 * 1000) return;

    setIsSyncing(true);
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("./firebase");
      const { syncNotifications } = await import("./utils/syncNotifications");

      const casesQuery = query(
        collection(db, "cases"), 
        where("officeId", "==", userData.officeId)
      );
      const snapshot = await getDocs(casesQuery);
      const cases = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      await syncNotifications(cases, [], [], userData.officeId);
      lastSyncRef.current = Date.now();
    } catch (err) {
      console.error("❌ Notification sync failed:", err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [userData?.officeId, isSyncing]);

  useEffect(() => {
    if (!userData?.officeId) return;

    // ✅ التزامن الأولي بعد 3 ثواني (مش فوراً)
    const initialTimer = setTimeout(() => {
      checkAndSync();
    }, 3000);

    // ✅ التزامن الدوري كل 15 دقيقة (مش 10)
    const interval = setInterval(() => {
      if (!document.hidden) {
        checkAndSync();
      }
    }, 15 * 60 * 1000);

    // ✅ التزامن عند العودة للصفحة بعد 30 ثانية
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          checkAndSync();
        }, 30000); // 30 ثانية بعد العودة
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userData?.officeId, checkAndSync]);

  return null;
}

/* ================= HOME REDIRECT ================= */
function HomeRedirect() {
  const { user, userData, loading } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  if (user && userData?.officeId) return <Navigate to="/dashboard" replace />;
  if (user && !userData?.officeId) return <Navigate to="/profile" replace />;
  return <Navigate to="/home" replace />;
}

/* ================= APP EXPORT ================= */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <NotificationSync />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/super-login" element={<SuperAdminLogin />} />
              <Route path="/home" element={<Home />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<HomeRedirect />} />
                <Route path="dashboard" element={<ProtectedRoute page="dashboard"><Dashboard /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute page="users"><Users /></ProtectedRoute>} />
                <Route path="clients" element={<ProtectedRoute page="users"><Clients /></ProtectedRoute>} />
                <Route path="clients/add" element={<ProtectedRoute page="cases"><AddClient /></ProtectedRoute>} />
                <Route path="clients/:id" element={<ClientProfile />} />
                <Route path="room-members" element={<ProtectedRoute page="dashboard"><RoomMembersAdmin /></ProtectedRoute>} />
                <Route path="cases" element={<ProtectedRoute page="cases"><Cases /></ProtectedRoute>} />
                <Route path="add-case" element={<ProtectedRoute page="cases"><AddCase /></ProtectedRoute>} />
                <Route path="edit/:id" element={<ProtectedRoute page="cases"><EditCase /></ProtectedRoute>} />
                <Route path="case/:id" element={<ProtectedRoute page="cases"><CaseDetails /></ProtectedRoute>} />
                <Route path="active-cases" element={<ProtectedRoute page="cases"><ActiveCases /></ProtectedRoute>} />
                <Route path="archive" element={<ProtectedRoute page="cases"><Archive /></ProtectedRoute>} />
                <Route path="judgments" element={<ProtectedRoute page="cases"><Judgments /></ProtectedRoute>} />
                <Route path="admin-tasks" element={<ProtectedRoute page="cases"><AdminTasks /></ProtectedRoute>} />
                <Route path="add-session/:id" element={<ProtectedRoute page="cases"><AddSession /></ProtectedRoute>} />
                <Route path="add-stage/:id" element={<ProtectedRoute page="cases"><AddStage /></ProtectedRoute>} />
                <Route path="finance" element={<ProtectedRoute page="finance"><Finance /></ProtectedRoute>} />
                <Route path="case-finance/:id" element={<ProtectedRoute page="finance"><CaseFinance /></ProtectedRoute>} />
                <Route path="office" element={<ProtectedRoute page="dashboard"><OfficeInfo /></ProtectedRoute>} />
                <Route path="office/rooms" element={<ProtectedRoute page="officeRooms"><OfficeRoomsManagement /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute page="profile"><Profile /></ProtectedRoute>} />
                <Route path="chat" element={<ProtectedRoute page="chat"><Chat /></ProtectedRoute>} />
                <Route path="rooms/:roomId" element={<ProtectedRoute page="chat"><Chat /></ProtectedRoute>} />
                <Route path="rooms/:roomId/admin" element={<ProtectedRoute page="chat"><RoomMembersAdmin /></ProtectedRoute>} />
                <Route path="shared-rooms" element={<ProtectedRoute page="chat"><SharedRooms /></ProtectedRoute>} />
                <Route path="shared-rooms/:id" element={<ProtectedRoute page="chat"><SharedRoomChat /></ProtectedRoute>} />
                <Route path="office/connections" element={<ProtectedRoute page="dashboard"><OfficeConnections /></ProtectedRoute>} />
                <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              </Route>
              <Route path="/super-admin" element={<ProtectedRoute superOnly={true}><SuperAdminLayout /></ProtectedRoute>}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="offices" element={<OfficesManagement />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
