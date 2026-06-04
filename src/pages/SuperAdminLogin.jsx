import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        setError("مستخدم غير موجود");
        return;
      }

      const data = snap.data();

      // 🚫 منع أي شخص غير super_admin
      if (data.role !== "super_admin") {
        setError("غير مسموح لك بالدخول هنا");
        return;
      }

      navigate("/super-admin");
    } catch (err) {
      setError("خطأ في تسجيل الدخول");
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h2>🔐 Super Admin Login</h2>

        {error && <p style={styles.error}>{error}</p>}

        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button style={styles.btn}>Login</button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },
  card: {
    width: 320,
    padding: 20,
    background: "#fff",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  btn: {
    padding: 10,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  error: {
    color: "red",
    fontSize: 13,
  },
};