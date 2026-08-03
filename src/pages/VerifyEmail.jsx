import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebaseAuth";
import { sendEmailVerification } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [resendTimer, setResendTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const pendingEmail = sessionStorage.getItem("pendingVerificationEmail");

  // Check if user is verified
  useEffect(() => {
    // If no pending email and no user, redirect to login
    if (!pendingEmail && !currentUser) {
      navigate("/login");
      return;
    }

    // If user is verified, mark as verified
    if (currentUser?.emailVerified) {
      setIsVerified(true);
      sessionStorage.removeItem("pendingVerificationEmail");
      sessionStorage.removeItem("pendingVerificationPassword");

      // Redirect after showing success message
      const timer = setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentUser, pendingEmail, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleResend = async () => {
    if (resendTimer > 0) return;

    // Need currentUser to resend
    if (!currentUser) {
      setMessage("يرجى تسجيل الدخول أولاً");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    setResending(true);
    setMessage("");

    try {
      await sendEmailVerification(currentUser);
      setResendTimer(60);
      setMessage("تم إعادة إرسال رابط التأكيد ✔");
    } catch (err) {
      console.error(err);
      setMessage("حدث خطأ أثناء إعادة الإرسال");
    }

    setResending(false);
  };

  if (isVerified) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.icon}>🎉</div>
          <h1 style={styles.title}>تم التأكيد بنجاح!</h1>
          <p style={styles.text}>جاري تحويلك إلى لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>📧</div>
        <h1 style={styles.title}>تأكيد البريد الإلكتروني</h1>

        <p style={styles.email}>
          {pendingEmail || currentUser?.email || "بريدك الإلكتروني"}
        </p>

        <div style={styles.infoBox}>
          <div style={styles.infoIcon}>✅</div>
          <div style={styles.infoContent}>
            <p style={styles.infoTitle}>تم إنشاء حسابك بنجاح!</p>
            <p style={styles.infoText}>
              أرسلنا رابط التأكيد إلى بريدك الإلكتروني. يرجى فتح Gmail والضغط على الرابط لتفعيل حسابك.
            </p>
          </div>
        </div>

        <div style={styles.tipBox}>
          <div style={styles.tipIcon}>💡</div>
          <div>
            <p style={styles.tipTitle}>لم تجد الرابط؟</p>
            <p style={styles.tipText}>
              قد يصل إلى مجلد <strong>المهملات (Spam)</strong> أو <strong>الإعلانات (Promotions)</strong>. يرجى التحقق منها.
            </p>
          </div>
        </div>

        {message && <div style={styles.message}>{message}</div>}

        <button
          onClick={handleResend}
          disabled={resendTimer > 0 || resending}
          style={{
            ...styles.resendBtn,
            opacity: resendTimer > 0 || resending ? 0.6 : 1,
            cursor: resendTimer > 0 || resending ? "not-allowed" : "pointer",
          }}
        >
          {resending
            ? "⏳ جاري الإرسال..."
            : resendTimer > 0
            ? `إعادة الإرسال بعد ${resendTimer} ثانية`
            : "🔄 إعادة إرسال الرابط"}
        </button>

        <Link 
          to="/login" 
          style={styles.loginLink}
          onClick={() => {
            sessionStorage.removeItem("pendingVerificationEmail");
            sessionStorage.removeItem("pendingVerificationPassword");
          }}
        >
          🔙 تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },

  card: {
    background: "rgba(30,41,59,0.9)",
    borderRadius: 24,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 460,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
    backdropFilter: "blur(20px)",
    textAlign: "center",
  },

  icon: {
    fontSize: 56,
    marginBottom: 16,
  },

  title: {
    margin: "0 0 12px 0",
    fontSize: 24,
    fontWeight: 700,
    color: "#f1f5f9",
  },

  text: {
    margin: "8px 0",
    fontSize: 15,
    color: "#94a3b8",
  },

  email: {
    margin: "12px 0 20px",
    fontSize: 15,
    color: "#60a5fa",
    fontWeight: 600,
    fontFamily: "monospace",
    direction: "ltr",
    background: "rgba(59,130,246,0.1)",
    padding: "10px 16px",
    borderRadius: 10,
    wordBreak: "break-all",
  },

  infoBox: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.15)",
    borderRadius: 14,
    padding: "18px",
    marginBottom: 14,
    textAlign: "right",
  },

  infoIcon: {
    fontSize: 28,
    flexShrink: 0,
  },

  infoContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  infoTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#60a5fa",
  },

  infoText: {
    margin: 0,
    fontSize: 14,
    color: "#93c5fd",
    lineHeight: 1.7,
  },

  tipBox: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "rgba(234,179,8,0.08)",
    border: "1px solid rgba(234,179,8,0.15)",
    borderRadius: 14,
    padding: "16px",
    marginBottom: 20,
    textAlign: "right",
  },

  tipIcon: {
    fontSize: 20,
    flexShrink: 0,
    marginTop: 2,
  },

  tipTitle: {
    margin: "0 0 4px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#eab308",
  },

  tipText: {
    margin: 0,
    fontSize: 13,
    color: "#ca8a04",
    lineHeight: 1.7,
  },

  message: {
    background: "rgba(34,197,94,0.1)",
    color: "#4ade80",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid rgba(34,197,94,0.2)",
    fontSize: 14,
    marginBottom: 14,
  },

  resendBtn: {
    width: "100%",
    padding: "14px 24px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 14,
    boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
    fontFamily: "inherit",
  },

  loginLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    transition: "color 0.2s",
    display: "block",
    marginTop: 8,
    padding: "12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.03)",
  },
};