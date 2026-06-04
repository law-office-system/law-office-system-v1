import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      const role = userSnap.exists()
        ? userSnap.data().role
        : "client";

      if (role === "super_admin") {
        navigate("/super-admin");
      } else if (role === "admin") {
        navigate("/dashboard");
      } else if (role === "lawyer") {
        navigate("/cases");
      } else {
        navigate("/client");
      }

    } catch (err) {
      console.error(err);
      setError("خطأ في البريد الإلكتروني أو كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2>⚖️ تسجيل الدخول</h2>
        <p style={{ marginBottom: 15, color: "#cbd5e1" }}>
          نظام إدارة مكتب المحاماة
        </p>

        <form onSubmit={handleLogin} style={form}>
          <input
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />

          <button type="submit" disabled={loading} style={button}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>

          {error && <p style={errorStyle}>{error}</p>}
        </form>

        <p style={footer}>
          ليس لديك حساب؟{" "}
          <Link to="/register" style={link}>
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #0f172a, #1e293b, #334155)",
  direction: "rtl",
  padding: 20,
};

const card = {
  width: "100%",
  maxWidth: 420,
  padding: 25,
  borderRadius: 16,
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  color: "#f1f5f9",
  textAlign: "center",
};

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  fontWeight: "500",
  caretColor: "#fff",
  outline: "none",
};

const button = {
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const errorStyle = {
  color: "#f87171",
  marginTop: 10,
  fontSize: 13,
};

const footer = {
  marginTop: 15,
  color: "#cbd5e1",
  fontSize: 13,
};

const link = {
  color: "#60a5fa",
  textDecoration: "none",
};