import useNotifications from "../hooks/useNotifications";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const { count, hasNotifications } = useNotifications();

  return (
    <Link
      to="/notifications"
      style={{
        position: "relative",
        fontSize: "22px",
        color: hasNotifications ? "#dc2626" : "#374151",
        textDecoration: "none",
      }}
    >
      🔔

      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-6px",
            right: "-10px",
            background: "#dc2626",
            color: "#fff",
            borderRadius: "999px",
            minWidth: "18px",
            height: "18px",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            padding: "0 4px",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}