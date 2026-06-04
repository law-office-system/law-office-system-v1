import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";

import Dashboard from "./pages/Dashboard";
import AddCase from "./pages/AddCase";
import EditCase from "./pages/EditCase";
import ActiveCases from "./pages/ActiveCases";
import Archive from "./pages/Archive";
import CaseDetails from "./pages/CaseDetails";
import AddSession from "./pages/AddSession";
import AddStage from "./pages/AddStage";
import Cases from "./pages/Cases";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import Finance from "./pages/Finance";
import CaseFinance from "./pages/CaseFinance";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Users from "./pages/Users";
import AddClient from "./pages/AddClient";
import Clients from "./pages/Clients";

import Profile from "./pages/Profile";
import OfficeInfo from "./pages/OfficeInfo";
import ClientProfile from "./pages/ClientProfile";
import Notifications from "./pages/Notifications";

import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import OfficesManagement from "./pages/OfficesManagement";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ================= AUTH ================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/super-login" element={<SuperAdminLogin />} />
          {/* ================= MAIN APP ================= */}
          <Route path="/" element={<Layout />}>

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

            {/* CASES */}
            <Route path="cases" element={<ProtectedRoute page="cases"><Cases /></ProtectedRoute>} />
            <Route path="add-case" element={<ProtectedRoute page="addCase"><AddCase /></ProtectedRoute>} />
            <Route path="edit/:id" element={<ProtectedRoute page="editCase"><EditCase /></ProtectedRoute>} />
            <Route path="case/:id" element={<ProtectedRoute page="caseDetails"><CaseDetails /></ProtectedRoute>} />

            <Route path="active-cases" element={<ProtectedRoute page="activeCases"><ActiveCases /></ProtectedRoute>} />
            <Route path="archive" element={<ProtectedRoute page="archive"><Archive /></ProtectedRoute>} />

            {/* SESSIONS */}
            <Route path="add-session/:id" element={<ProtectedRoute page="cases"><AddSession /></ProtectedRoute>} />
            <Route path="add-stage/:id" element={<ProtectedRoute page="cases"><AddStage /></ProtectedRoute>} />

            {/* FINANCE */}
            <Route path="finance" element={<ProtectedRoute page="finance"><Finance /></ProtectedRoute>} />
            <Route path="case-finance/:id" element={<ProtectedRoute page="finance"><CaseFinance /></ProtectedRoute>} />

            {/* OFFICE */}
            <Route path="office" element={<ProtectedRoute page="dashboard"><OfficeInfo /></ProtectedRoute>} />

            {/* PROFILE */}
            <Route path="profile" element={<ProtectedRoute page="profile"><Profile /></ProtectedRoute>} />

            <Route path="clients/:id" element={<ClientProfile />} />
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

          {/* NOTIFICATIONS */}
          <Route path="/notifications" element={<Notifications />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}