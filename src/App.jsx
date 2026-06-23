import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import OfficeConnections from "./pages/OfficeConnections";
import SharedRooms from "./pages/SharedRooms";
import SharedRoomChat from "./pages/SharedRoomChat"; // 1. استيراد الصفحة الجديدة هنا 💡

/* ================= AUTH ================= */
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ================= AUTH ROUTES ================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/super-login" element={<SuperAdminLogin />} />

          {/* ================= MAIN LAYOUT ================= */}
          <Route path="/" element={<Layout />}>

            {/* DASHBOARD */}
            <Route
              index
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

            <Route
              path="clients/:id"
              element={<ClientProfile />}
            />

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
              element={<OfficeRoomsManagement />}
            />

            <Route path="/home" element={<Home />} />

            {/* PROFILE */}
            <Route
              path="profile"
              element={
                <ProtectedRoute page="profile">
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* CHAT */}
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

            {/* SHARED ROOMS */}
            <Route
              path="shared-rooms"
              element={
                <ProtectedRoute page="chat">
                  <SharedRooms />
                </ProtectedRoute>
              }
            />

            {/* 2. إضافة مسار الشات المشترك الديناميكي لتوجيه الـ Sidebar إليه بنجاح 💡 */}
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

          {/* ================= NOTIFICATIONS ================= */}
          <Route
            path="/notifications"
            element={<Notifications />}
          />

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}