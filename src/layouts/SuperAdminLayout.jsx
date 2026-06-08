import { Outlet } from "react-router-dom";

export default function SuperAdminLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: 20,
      }}
    >
      <Outlet />
    </div>
  );
}