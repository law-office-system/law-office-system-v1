import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebaseAuth";
import {
  linkEmailToCurrentUser,
  sendPhoneLinkCode,
  confirmPhoneLink,
} from "../services/authLinks";

export default function LinkAccountsSection() {
  const { userData, reloadUserData } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const hasEmail = !!userData?.email;
  const hasPhone = !!userData?.phoneNumber;

  useEffect(() => {
    return () => {
      const container = document.getElementById("recaptcha-container-profile");
      if (container) container.innerHTML = "";
    };
  }, []);

  const mapError = (e) => {
    if (e.code === "auth/email-already-in-use")
      return "هذا البريد مستخدم بحساب آخر";
    if (e.code === "auth/credential-already-in-use")
      return "هذا الرقم/البريد مستخدم بحساب آخر";
    if (e.code === "auth/invalid-email") return "البريد غير صالح";
    if (e.code === "auth/weak-password") return "كلمة المرور 6 أحرف على الأقل";
    if (e.code === "auth/invalid-verification-code") return "رمز التحقق غير صحيح";
    return "حدث خطأ — حاول مرة أخرى";
  };

  /* ── إضافة بريد ── */
  const handleAddEmail = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      await linkEmailToCurrentUser(email, password);
      setMsg("✅ تم ربط البريد — افتح بريدك واضغط رابط التحقق");
      setEmail(""); setPassword("");
      await reloadUserData(auth.currentUser.uid);
    } catch (e) {
      setErr(mapError(e));
    } finally {
      setBusy(false);
    }
  };

  /* ── إرسال رمز الهاتف ── */
  const handleSendOtp = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const conf = await sendPhoneLinkCode(phone);
      setConfirmation(conf);
      setMsg("📱 تم إرسال رمز التحقق");
    } catch (e) {
      setErr(mapError(e));
    } finally {
      setBusy(false);
    }
  };

  /* ── تأكيد رمز الهاتف ── */
  const handleConfirmOtp = async () => {
    setErr(""); setBusy(true);
    try {
      await confirmPhoneLink(confirmation, otp);
      setMsg("✅ تم ربط رقم الهاتف بنجاح");
      setConfirmation(null); setOtp(""); setPhone("");
      await reloadUserData(auth.currentUser.uid);
    } catch (e) {
      setErr(mapError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>🔗 ربط وسائل الدخول</h3>
      <p style={styles.sub}>
        أضف بريدًا أو هاتفًا لتستطيع الدخول بأي منهما
      </p>

      {/* ══ حالة البريد ══ */}
      {hasEmail ? (
        <p style={styles.ok}>✅ البريد: {userData.email}</p>
      ) : (
        <div style={styles.section}>
          <p style={styles.label}>إضافة بريد إلكتروني:</p>
          <input
            style={styles.input}
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            autoComplete="off"           // ✅ يمنع تعبئة المتصفح التلقائية
          />
          <input
            style={styles.input}
            type="password"
            placeholder="كلمة مرور للبريد (جديدة)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            autoComplete="new-password"  // ✅ يوقف حفظ/تعبئة كلمات المرور
          />
          <button style={styles.btn} onClick={handleAddEmail} disabled={busy}>
            {busy ? "جاري..." : "إضافة وتفعيل البريد"}
          </button>
        </div>
      )}

      {/* ══ حالة الهاتف ══ */}
      {hasPhone ? (
        <p style={styles.ok}>✅ الهاتف: {userData.phoneNumber}</p>
      ) : (
        <div style={styles.section}>
          <p style={styles.label}>إضافة رقم هاتف:</p>
          <div id="recaptcha-container-profile"></div>
          {!confirmation ? (
            <>
              <input
                style={styles.input}
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                autoComplete="tel"         // ✅ كيبورد الهاتف في الموبايل
              />
              <button style={styles.btn} onClick={handleSendOtp} disabled={busy}>
                {busy ? "جاري..." : "إرسال رمز التحقق"}
              </button>
            </>
          ) : (
            <>
              <input
                style={styles.input}
                placeholder="رمز التحقق"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                dir="ltr"
                autoComplete="one-time-code" // ✅ يقترح رمز SMS تلقائيًا
              />
              <button style={styles.btn} onClick={handleConfirmOtp} disabled={busy}>
                {busy ? "جاري..." : "تأكيد الرمز"}
              </button>
            </>
          )}
        </div>
      )}

      {msg && <p style={styles.msg}>{msg}</p>}
      {err && <p style={styles.err}>{err}</p>}
    </div>
  );
}

/* ══ أنماط داكنة ══ */
const GOLD = "#d4af37";
const styles = {
  card: {
    background: "#1e293b",
    border: "1px solid rgba(212,175,55,0.3)",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    direction: "rtl",
  },
  title: { color: GOLD, marginBottom: 6 },
  sub: { color: "#94a3b8", fontSize: 13, marginBottom: 16 },
  section: { marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 },
  label: { color: "#cbd5e1", fontSize: 14, fontWeight: "bold" },
  ok: { color: "#27ae60", fontSize: 14, marginBottom: 10 },
  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    outline: "none",
  },
  btn: {
    padding: 10,
    borderRadius: 8,
    border: "none",
    background: GOLD,
    color: "#0a0e1a",
    fontWeight: "bold",
    cursor: "pointer",
  },
  msg: { color: "#27ae60", fontSize: 13, marginTop: 8 },
  err: { color: "#f87171", fontSize: 13, marginTop: 8 },
};