import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "./context/AuthContext";

import Layout from "./components/Layout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";

/* ================= PAGES ================= */
import Dashboard from "./pages/Dashboard";
import AddCase from "./pages/AddCase";
import EditCase from "./pages/EditCase";
import ActiveCases from "./pages/ActiveCases";
import Archive from "./pages/Archive";
import CaseDetails from "./pages/CaseDetails";
import AddSession from "./pages/AddSession";
import AddStage from "./pages/AddStage";
import Cases from "./pages/Cases";
import Judgments from "./pages/Judgments";
import AdminTasks from "./pages/AdminTasks";

import RoomMembersAdmin from "./pages/RoomMembersAdmin";

import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import OfficesManagement from "./pages/OfficesManagement";
import OfficeRoomsManagement from "./pages/OfficeRoomsManagement";

import Finance from "./pages/Finance";
import CaseFinance from "./pages/CaseFinance";

import Home from "./pages/Home";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Users from "./pages/Users";
import AddClient from "./pages/AddClient";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";

import Profile from "./pages/Profile";
import OfficeInfo from "./pages/OfficeInfo";
import Notifications from "./pages/Notifications";

/* ================= CHAT ================= */
import Chat from "./pages/Chat";
import SharedRooms from "./pages/SharedRooms";
import SharedRoomChat from "./pages/SharedRoomChat";
import OfficeConnections from "./pages/OfficeConnections";

import './styles/chat-animations.css';
/* ================= AUTH ================= */
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

/* ================= NOTIFICATIONS SYNC ================= */
import { syncNotifications } from "./utils/syncNotifications";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

import "./App.css";

/* ================= REAL-TIME SYNC COMPONENT (OPTIMIZED) ================= */
function NotificationSync() {
  const { userData } = useAuth();
  const intervalRef = useRef(null);
  const lastSyncRef = useRef(0);
  const isSyncingRef = useRef(false);

  const checkAndSync = useCallback(async () => {
    if (!userData?.officeId) return;
    if (isSyncingRef.current) return; // ✅ prevent concurrent syncs

    // ✅ debounce: max once per 2 minutes
    const now = Date.now();
    if (now - lastSyncRef.current < 2 * 60 * 1000) return;

    isSyncingRef.current = true;
    console.log("⏰ Running scheduled notification check...");

    try {
      const casesQuery = query(
        collection(db, "cases"),
        where("officeId", "==", userData.officeId)
      );

      const snapshot = await getDocs(casesQuery);
      const cases = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      await syncNotifications(cases, [], [], userData.officeId);
      lastSyncRef.current = Date.now();
    } catch (err) {
      console.error("❌ Notification sync failed:", err.message);
    } finally {
      isSyncingRef.current = false;
    }
  }, [userData?.officeId]);

  useEffect(() => {
    if (!userData?.officeId) return;

    // ✅ Sync once on mount
    checkAndSync();

    // ✅ Interval every 10 minutes (not 5), skip if hidden
    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          checkAndSync();
        }
      }, 10 * 60 * 1000);
    };

    startInterval();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ App visible, checking notifications...");
        checkAndSync();
      } else {
        // ✅ pause interval when hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userData?.officeId, checkAndSync]);

  return null;
}

/* ================= HOME REDIRECT ================= */
function HomeRedirect() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        background: "#0f172a" 
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(212, 175, 55, 0.2)",
          borderTop: "3px solid #d4af37",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
      </div>
    );
  }

  if (user && userData?.officeId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && !userData?.officeId) {
    return <Navigate to="/profile" replace />;
  }

  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationSync />
        <Routes>

          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/super-login" element={<SuperAdminLogin />} />
          <Route path="/home" element={<Home />} />

          {/* ================= MAIN LAYOUT ================= */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />

            {/* DASHBOARD */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute page="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* USERS */}
            <Route
              path="users"
              element={
                <ProtectedRoute page="users">
                  <Users />
                </ProtectedRoute>
              }
            />

            {/* CLIENTS */}
            <Route
              path="clients"
              element={
                <ProtectedRoute page="users">
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="clients/add"
              element={
                <ProtectedRoute page="cases">
                  <AddClient />
                </ProtectedRoute>
              }
            />
            <Route path="clients/:id" element={<ClientProfile />} />

            {/* ROOM MEMBERS */}
            <Route
              path="room-members"
              element={
                <ProtectedRoute page="dashboard">
                  <RoomMembersAdmin />
                </ProtectedRoute>
              }
            />

            {/* CASES */}
            <Route
              path="cases"
              element={
                <ProtectedRoute page="cases">
                  <Cases />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-case"
              element={
                <ProtectedRoute page="cases">
                  <AddCase />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit/:id"
              element={
                <ProtectedRoute page="cases">
                  <EditCase />
                </ProtectedRoute>
              }
            />
            <Route
              path="case/:id"
              element={
                <ProtectedRoute page="cases">
                  <CaseDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="active-cases"
              element={
                <ProtectedRoute page="cases">
                  <ActiveCases />
                </ProtectedRoute>
              }
            />
            <Route
              path="archive"
              element={
                <ProtectedRoute page="cases">
                  <Archive />
                </ProtectedRoute>
              }
            />
            <Route
              path="judgments"
              element={
                <ProtectedRoute page="cases">
                  <Judgments />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin-tasks"
              element={
                <ProtectedRoute page="cases">
                  <AdminTasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-session/:id"
              element={
                <ProtectedRoute page="cases">
                  <AddSession />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-stage/:id"
              element={
                <ProtectedRoute page="cases">
                  <AddStage />
                </ProtectedRoute>
              }
            />

            {/* FINANCE */}
            <Route
              path="finance"
              element={
                <ProtectedRoute page="finance">
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="case-finance/:id"
              element={
                <ProtectedRoute page="finance">
                  <CaseFinance />
                </ProtectedRoute>
              }
            />

            {/* OFFICE */}
            <Route
              path="office"
              element={
                <ProtectedRoute page="dashboard">
                  <OfficeInfo />
                </ProtectedRoute>
              }
            />
            <Route
              path="office/rooms"
              element={
                <ProtectedRoute page="officeRooms">
                  <OfficeRoomsManagement />
                </ProtectedRoute>
              }
            />

            {/* PROFILE */}
            <Route
              path="profile"
              element={
                <ProtectedRoute page="profile">
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* CHAT - Internal Rooms */}
            <Route
              path="chat"
              element={
                <ProtectedRoute page="chat">
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="rooms/:roomId"
              element={
                <ProtectedRoute page="chat">
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="rooms/:roomId/admin"
              element={
                <ProtectedRoute page="chat">
                  <RoomMembersAdmin />
                </ProtectedRoute>
              }
            />

            {/* SHARED ROOMS - Inter-Office Chat */}
            <Route
              path="shared-rooms"
              element={
                <ProtectedRoute page="chat">
                  <SharedRooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="shared-rooms/:id"
              element={
                <ProtectedRoute page="chat">
                  <SharedRoomChat />
                </ProtectedRoute>
              }
            />

            {/* OFFICE CONNECTIONS */}
            <Route
              path="office/connections"
              element={
                <ProtectedRoute page="dashboard">
                  <OfficeConnections />
                </ProtectedRoute>
              }
            />

            {/* NOTIFICATIONS */}
            <Route
              path="notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />

          </Route>

          {/* ================= SUPER ADMIN ================= */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute superOnly={true}>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="offices" element={<OfficesManagement />} />
          </Route>

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}