import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { auth } from "../firebaseAuth";
import { db } from "../firebaseDb";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Auto-login after email verification
  useEffect(() => {
    const pendingEmail = sessionStorage.getItem("pendingVerificationEmail");
    const pendingPassword = sessionStorage.getItem("pendingVerificationPassword");

    if (pendingEmail && pendingPassword) {
      console.log("🔄 Auto-login after verification...");
      setEmail(pendingEmail);
      setPassword(pendingPassword);

      // Clear stored credentials
      sessionStorage.removeItem("pendingVerificationEmail");
      sessionStorage.removeItem("pendingVerificationPassword");

      // Auto-submit after a short delay
      const timer = setTimeout(() => {
        handleAutoLogin(pendingEmail, pendingPassword);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleAutoLogin = async (autoEmail, autoPassword) => {
    setLoading(true);
    setError("");

    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, autoEmail, autoPassword);

      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      const role = userSnap.exists()
        ? userSnap.data().role
        : "client";

      // Check if email needs verification
      const userData = userSnap.data();
      const isOldAccount = userData && !userData.hasOwnProperty('emailVerified');

      // For old accounts, mark them as verified and allow login
      if (isOldAccount) {
        await updateDoc(userRef, { emailVerified: true });
        // Old accounts don't need verification
      } else if (!userData?.emailVerified) {
        // New unverified user - needs to verify email first
        sessionStorage.setItem("pendingVerificationEmail", result.user.email);
        sessionStorage.setItem("pendingVerificationPassword", password);
        setError("يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول");
        setLoading(false);
        navigate("/verify-email");
        return;
      }

      if (role === "super_admin") {
        navigate("/super-admin");
      } else if (role === "admin") {
        navigate("/");
      } else if (role === "lawyer") {
        navigate("/cases");
      } else {
        navigate("/client");
      }

    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تسجيل الدخول التلقائي، يرجى المحاولة يدوياً");
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Clear any pending verification data
    sessionStorage.removeItem("pendingVerificationEmail");
    sessionStorage.removeItem("pendingVerificationPassword");

    try {
      setLoading(true);

      await setPersistence(
        auth,
        browserLocalPersistence
      );

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

      // Check if email needs verification
      const userData = userSnap.data();
      const isOldAccount = userData && !userData.hasOwnProperty('emailVerified');

      // For old accounts, mark them as verified and allow login
      if (isOldAccount) {
        await updateDoc(userRef, { emailVerified: true });
        // Old accounts don't need verification
      } else if (!userData?.emailVerified) {
        // New unverified user - needs to verify email first
        sessionStorage.setItem("pendingVerificationEmail", result.user.email);
        sessionStorage.setItem("pendingVerificationPassword", password);
        setError("يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول");
        setLoading(false);
        navigate("/verify-email");
        return;
      }

      if (role === "super_admin") {
        navigate("/super-admin");
      } else if (role === "admin") {
        navigate("/");
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

        <p
          style={{
            marginBottom: 15,
            color: "#cbd5e1",
          }}
        >
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

          <div style={{ textAlign: "left", marginBottom: 8 }}>
            <Link to="/forgot-password" style={forgotLink}>
              🔐 نسيت كلمة المرور؟
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={button}
          >
            {loading
              ? "جاري الدخول..."
              : "تسجيل الدخول"}
          </button>

          {error && (
            <p style={errorStyle}>
              {error}
            </p>
          )}
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
  background:
    "linear-gradient(135deg, #0f172a, #1e293b, #334155)",
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

const forgotLink = {
  color: "#94a3b8",
  textDecoration: "none",
  fontSize: 13,
  transition: "color 0.2s",
  display: "inline-block",
};