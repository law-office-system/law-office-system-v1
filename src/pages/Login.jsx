import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, Timestamp,
  collection, query, where, getDocs,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { auth } from "../firebaseAuth";
import { db } from "../firebaseDb";
import { useAuth } from "../context/AuthContext";

const cleanEmail = (v) => v.replace(/\s+/g, "").toLowerCase();

// توحيد الصيغة الدولية للرقم المصري
const normalizePhone = (v) => {
  let p = v.replace(/[\s-]/g, "");
  if (p.startsWith("+20")) return p;
  if (p.startsWith("0020")) return "+" + p.slice(2);
  if (p.startsWith("01")) return "+2" + p;      // 010XXXXXXXX → +2010XXXXXXXX
  if (p.startsWith("1")) return "+20" + p;      // 10XXXXXXXX  → +2010XXXXXXXX
  return "+20" + p;
};

export default function Login() {
  const navigate = useNavigate();
  const { reloadUserData } = useAuth();

  const [tab, setTab] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // حالة الهاتف
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [phoneUser, setPhoneUser] = useState(null);
  const [setupMode, setSetupMode] = useState(null);
  const [setupOfficeName, setSetupOfficeName] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const navigateByRole = (role) => {
    if (role === "super_admin") navigate("/super-admin");
    else if (role === "admin") navigate("/");
    else if (role === "lawyer") navigate("/cases");
    else navigate("/client");
  };

  // تنظيف reCAPTCHA عند الخروج من الصفحة
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // ============ تسجيل الدخول البريدي ============
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanMail = cleanEmail(email);
    const cleanPass = password.trim();

    try {
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);

      const result = await signInWithEmailAndPassword(auth, cleanMail, cleanPass);
      const userSnap = await getDoc(doc(db, "users", result.user.uid));
      const userData = userSnap.exists() ? userSnap.data() : null;
      const role = userData?.role || "client";

      // التحقق الرسمي من Auth (غير قابل للتزوير)
      const verified = result.user.emailVerified || userData?.emailVerified === true;
      if (!verified) {
        sessionStorage.setItem("pendingVerificationEmail", cleanMail);
        navigate("/verify-email");
        return;
      }

      navigateByRole(role);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-email") {
        setError("البريد الإلكتروني غير صالح — تأكد من عدم وجود مسافات");
      } else if (err.code === "auth/too-many-requests") {
        setError("محاولات كثيرة — انتظر قليلاً ثم حاول");
      } else {
        setError("خطأ في البريد الإلكتروني أو كلمة المرور");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ الهاتف: إرسال OTP ============
  const ensureVerifier = () => {
    // تنظيف نسخة قديمة + إفراغ الحاوية قبل إنشاء جديدة
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch {}
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";

    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "invisible" }
    );
    return window.recaptchaVerifier;
  };

  const sendOtp = async () => {
    setError("");
    if (!phone.trim()) {
      setError("أدخل رقم الهاتف");
      return;
    }

    // تحقق من صحة الرقم قبل الإرسال
    const fullPhone = normalizePhone(phone);
    const digits = fullPhone.replace(/\D/g, "");
    if (digits.length < 11 || digits.length > 15) {
      setError("رقم الهاتف غير صحيح — مثال: 01001234567 أو +201001234567");
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithPhoneNumber(auth, fullPhone, ensureVerifier());
      setConfirmation(result);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-phone-number") {
        setError("رقم الهاتف غير صالح — تأكد من كتابة 11 رقماً يبدأ بـ 01");
      } else if (err.code === "auth/too-many-requests") {
        setError("محاولات كثيرة — انتظر قليلاً ثم حاول");
      } else {
        setError("تعذر إرسال الرمز — تأكد من الرقم ومن تفعيل Phone في Firebase");
      }
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ الهاتف: تأكيد OTP ============
  const confirmOtp = async () => {
    setError("");
    // ✅ منع AuthContext من إنشاء وثيقة تلقائية أثناء إعداد المستخدم الجديد
    sessionStorage.setItem("registering", "1");

    try {
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);
      const cred = await confirmation.confirm(otp);

      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (snap.exists()) {
        // مستخدم موجود — لا خطر من إزالة العلم
        sessionStorage.removeItem("registering");
        navigateByRole(snap.data().role || "client");
      } else {
        // مستخدم هاتف جديد → يحتاج إعداد المكتب
        setPhoneUser(cred.user);
      }
    } catch (err) {
      sessionStorage.removeItem("registering");
      console.error(err);
      setError("الرمز غير صحيح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  };

  // ============ إعداد مكتب لمستخدم الهاتف ============
  const handleSetup = async () => {
    setError("");
    try {
      setLoading(true);

      if (setupMode === "create") {
        const officeId = crypto.randomUUID();
        const code = nanoid(8);
        await setDoc(doc(db, "offices", officeId), {
          id: officeId, officeId,
          name: setupOfficeName,
          ownerId: phoneUser.uid,
          inviteCode: code,
          createdAt: Timestamp.now(),
        });
        await setDoc(doc(db, "users", phoneUser.uid), {
          uid: phoneUser.uid,
          name: phoneUser.displayName || "مستخدم",
          email: null,
          phoneNumber: phoneUser.phoneNumber,
          role: "admin",
          officeId,
          emailVerified: true,
          createdAt: Timestamp.now(),
        });
        setCreatedCode(code);
      } else {
        const q = query(collection(db, "offices"), where("inviteCode", "==", setupCode.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          setError("كود المكتب غير صحيح");
          return;
        }
        await setDoc(doc(db, "users", phoneUser.uid), {
          uid: phoneUser.uid,
          name: phoneUser.displayName || "مستخدم",
          email: null,
          phoneNumber: phoneUser.phoneNumber,
          role: "client",
          officeId: snap.docs[0].id,
          emailVerified: true,
          createdAt: Timestamp.now(),
        });
        await reloadUserData(phoneUser.uid);
        navigate("/client");
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء إعداد الحساب");
    } finally {
      setLoading(false);
      sessionStorage.removeItem("registering");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2>⚖️ تسجيل الدخول</h2>
        <p style={{ marginBottom: 15, color: "#cbd5e1" }}>
          نظام إدارة مكتب المحاماة
        </p>

        {/* تبويبات الدخول */}
        {!phoneUser && !createdCode && (
          <div style={tabBar}>
            <button
              style={tab === "email" ? tabActive : tabBtn}
              onClick={() => { setTab("email"); setError(""); }}
            >
              📧 بريد إلكتروني
            </button>
            <button
              style={tab === "phone" ? tabActive : tabBtn}
              onClick={() => { setTab("phone"); setError(""); }}
            >
              📱 رقم الهاتف
            </button>
          </div>
        )}

        {/* ============ نموذج البريد ============ */}
        {tab === "email" && !phoneUser && !createdCode && (
          <form onSubmit={handleLogin} style={form}>
            <input
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(cleanEmail(e.target.value))}
              style={input}
              dir="ltr"
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={input}
              dir="ltr"
            />
            <div style={{ textAlign: "left", marginBottom: 8 }}>
              <Link to="/forgot-password" style={forgotLink}>
                🔐 نسيت كلمة المرور؟
              </Link>
            </div>
            <button type="submit" disabled={loading} style={button}>
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        )}

        {/* ============ نموذج الهاتف ============ */}
        {tab === "phone" && !phoneUser && !createdCode && (
          <div style={form}>
            <div id="recaptcha-container"></div>

            {!confirmation ? (
              <>
                <input
                  placeholder="01001234567 أو +201001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={input}
                  dir="ltr"
                />
                <button onClick={sendOtp} disabled={loading} style={button}>
                  {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                </button>
              </>
            ) : (
              <>
                <input
                  placeholder="رمز التحقق (6 أرقام)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={input}
                  dir="ltr"
                />
                <button onClick={confirmOtp} disabled={loading} style={button}>
                  {loading ? "جاري التحقق..." : "تأكيد الرمز"}
                </button>
                <button
                  onClick={() => { setConfirmation(null); setOtp(""); }}
                  style={{ ...button, background: "#475569" }}
                >
                  تغيير الرقم
                </button>
              </>
            )}
          </div>
        )}

        {/* ============ إعداد المكتب لمستخدم الهاتف الجديد ============ */}
        {phoneUser && !createdCode && (
          <div style={form}>
            <h3 style={{ color: "#f1f5f9", marginBottom: 5 }}>أهلاً بك! اختر نوع حسابك</h3>
            <div style={tabBar}>
              <button
                style={setupMode === "create" ? tabActive : tabBtn}
                onClick={() => setSetupMode("create")}
              >
                إنشاء مكتب جديد
              </button>
              <button
                style={setupMode === "join" ? tabActive : tabBtn}
                onClick={() => setSetupMode("join")}
              >
                الانضمام بكود
              </button>
            </div>

            {setupMode === "create" && (
              <input
                placeholder="اسم المكتب"
                value={setupOfficeName}
                onChange={(e) => setSetupOfficeName(e.target.value)}
                style={input}
              />
            )}
            {setupMode === "join" && (
              <input
                placeholder="كود المكتب"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                style={input}
                dir="ltr"
              />
            )}

            {setupMode && (
              <button onClick={handleSetup} disabled={loading} style={button}>
                {loading ? "جاري..." : "متابعة"}
              </button>
            )}
          </div>
        )}

        {error && <p style={errorStyle}>{error}</p>}

        {!phoneUser && (
          <p style={footer}>
            ليس لديك حساب؟{" "}
            <Link to="/register" style={link}>إنشاء حساب جديد</Link>
          </p>
        )}
      </div>

      {/* مودال كود المكتب (مستخدم الهاتف) */}
      {createdCode && (
        <div style={modalOverlay}>
          <div style={{ ...card, maxWidth: 380 }}>
            <h3 style={{ marginBottom: 10 }}>🎉 تم إنشاء مكتبك</h3>
            <p style={{ color: "#cbd5e1", marginBottom: 15 }}>
              احفظ كود المكتب لدعوة فريقك:
            </p>
            <div style={codeBox}>{createdCode}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...button, background: "#2563eb" }} onClick={copyCode}>
                {copied ? "✓ تم النسخ" : "📋 نسخ"}
              </button>
              <button
                style={button}
                onClick={async () => {
                  await reloadUserData(phoneUser.uid);
                  navigate("/");
                }}
              >
                دخول المكتب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  minHeight: "100vh",
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

const tabBar = { display: "flex", gap: 8, marginBottom: 15 };
const tabBtn = {
  flex: 1, padding: 10, borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.08)",
  color: "#cbd5e1", cursor: "pointer",
};
const tabActive = {
  flex: 1, padding: 10, borderRadius: 10,
  border: "none", background: "#2563eb",
  color: "#fff", cursor: "pointer", fontWeight: "bold",
};

const form = { display: "flex", flexDirection: "column", gap: 12 };

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

const errorStyle = { color: "#f87171", marginTop: 10, fontSize: 13 };
const footer = { marginTop: 15, color: "#cbd5e1", fontSize: 13 };
const link = { color: "#60a5fa", textDecoration: "none" };
const forgotLink = {
  color: "#94a3b8", textDecoration: "none",
  fontSize: 13, display: "inline-block",
};

const modalOverlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
  display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
};

const codeBox = {
  fontSize: 24, fontWeight: "bold", letterSpacing: 3,
  background: "rgba(255,255,255,0.12)", padding: "12px 20px",
  borderRadius: 10, marginBottom: 15, direction: "ltr", color: "#fff",
};