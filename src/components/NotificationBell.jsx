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
        color: hasNotifications ? "red" : "#333",
        textDecoration: "none",
      }}
    >
      🔔

      {hasNotifications && (
        <span
          style={{
            position: "absolute",
            top: "-5px",
            right: "-8px",
            background: "red",
            color: "white",
            borderRadius: "50%",
            width: "18px",
            height: "18px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}