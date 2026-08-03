import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseAuth";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("لا يوجد حساب مرتبط بهذا البريد الإلكتروني");
      } else if (err.code === "auth/invalid-email") {
        setError("البريد الإلكتروني غير صالح");
      } else {
        setError("حدث خطأ أثناء إرسال الرابط، حاول مرة أخرى");
      }
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🔐</div>
          <h1 style={styles.title}>استعادة كلمة المرور</h1>
          <p style={styles.subtitle}>
            {sent
              ? "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني"
              : "أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين"}
          </p>
        </div>

        {sent ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>📧</div>
            <h3 style={styles.successTitle}>تم إرسال الرابط بنجاح</h3>
            <p style={styles.successText}>
              لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
            </p>
            <p style={styles.emailHighlight}>{email}</p>

            <div style={styles.tipBox}>
              <div style={styles.tipIcon}>💡</div>
              <div style={styles.tipContent}>
                <p style={styles.tipTitle}>لم تجد الرابط؟</p>
                <p style={styles.tipText}>
                  قد يصل الرابط إلى مجلد <strong>المهملات (Spam)</strong> أو <strong>الإعلانات (Promotions)</strong> في Gmail. يرجى التحقق منها.
                </p>
              </div>
            </div>

            <Link to="/login" style={styles.backLink}>
              🔙 العودة إلى تسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "⏳ جاري الإرسال..." : "📧 إرسال رابط إعادة التعيين"}
            </button>

            <div style={styles.footer}>
              <Link to="/login" style={styles.link}>
                🔙 تذكرت كلمة المرور؟ تسجيل الدخول
              </Link>
            </div>
          </form>
        )}
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
    maxWidth: 420,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
    backdropFilter: "blur(20px)",
  },

  header: {
    textAlign: "center",
    marginBottom: 28,
  },

  icon: {
    fontSize: 48,
    marginBottom: 12,
  },

  title: {
    margin: "0 0 8px 0",
    fontSize: 24,
    fontWeight: 700,
    color: "#f1f5f9",
  },

  subtitle: {
    margin: 0,
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 1.6,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#94a3b8",
  },

  input: {
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(15,23,42,0.6)",
    color: "#e2e8f0",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },

  submitBtn: {
    padding: "14px 24px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  },

  errorBox: {
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid rgba(239,68,68,0.2)",
    fontSize: 13,
    textAlign: "center",
  },

  successBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    textAlign: "center",
    padding: "8px 0",
  },

  successIcon: {
    fontSize: 48,
  },

  successText: {
    margin: "4px 0",
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: 400,
  },

  emailHighlight: {
    margin: "4px 0",
    fontSize: 15,
    color: "#60a5fa",
    fontWeight: 600,
    fontFamily: "monospace",
    direction: "ltr",
    background: "rgba(59,130,246,0.1)",
    padding: "8px 16px",
    borderRadius: 8,
    wordBreak: "break-all",
  },

  successHint: {
    margin: "4px 0 16px",
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.6,
  },

  backLink: {
    padding: "12px 24px",
    borderRadius: 12,
    background: "rgba(59,130,246,0.1)",
    color: "#60a5fa",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    border: "1px solid rgba(59,130,246,0.2)",
    transition: "all 0.2s",
    display: "inline-block",
  },

  successTitle: {
    margin: "8px 0 4px 0",
    fontSize: 18,
    fontWeight: 700,
    color: "#f1f5f9",
  },

  tipBox: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "rgba(234,179,8,0.08)",
    border: "1px solid rgba(234,179,8,0.15)",
    borderRadius: 12,
    padding: "16px",
    margin: "16px 0",
    textAlign: "right",
  },

  tipIcon: {
    fontSize: 20,
    flexShrink: 0,
    marginTop: 2,
  },

  tipContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  tipTitle: {
    margin: 0,
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

  footer: {
    textAlign: "center",
    marginTop: 8,
    paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },

  link: {
    color: "#60a5fa",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    transition: "color 0.2s",
  },
};