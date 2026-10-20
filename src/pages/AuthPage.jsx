import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { nanoid } from "nanoid";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, Timestamp,
  collection, query, where, getDocs,
} from "firebase/firestore";
import { auth } from "../firebaseAuth";
import { db } from "../firebaseDb";
import { useAuth } from "../context/AuthContext";

const cleanEmail = (v) => v.replace(/\s+/g, "").toLowerCase();

const normalizePhone = (v) => {
  let p = v.replace(/[\s-]/g, "");
  if (p.startsWith("+20")) return p;
  if (p.startsWith("0020")) return "+" + p.slice(2);
  if (p.startsWith("01")) return "+2" + p;
  if (p.startsWith("1")) return "+20" + p;
  return "+20" + p;
};

const GOLD = "#d4af37";

export default function AuthPage({ initialTab = "email", initialMode = "login" }) {
  const navigate = useNavigate();
  const { reloadUserData } = useAuth();

  // التبويب الرئيسي: email | phone
  const [tab, setTab] = useState(initialTab);

  // ===== وضع البريد الداخلي: login | new =====
  const [emailMode, setEmailMode] = useState(initialMode);

  // ===== حقول مشتركة (بريد) =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ===== حقول إنشاء الحساب (بريد) =====
  const [name, setName] = useState("");
  const [officeMode, setOfficeMode] = useState("create"); // create | join
  const [officeName, setOfficeName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // ===== هاتف =====
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [phoneUser, setPhoneUser] = useState(null);
  const [setupName, setSetupName] = useState("");
  const [setupMode, setSetupMode] = useState(null);
  const [setupOfficeName, setSetupOfficeName] = useState("");
  const [setupCode, setSetupCode] = useState("");

  // ===== مشترك =====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [createdFor, setCreatedFor] = useState(null); // 'phone' | 'email'
  const [pendingEmail, setPendingEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const navigateByRole = (role) => {
    if (role === "super_admin") navigate("/super-admin");
    else if (role === "admin") navigate("/");
    else if (role === "lawyer") navigate("/cases");
    else navigate("/client");
  };

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  /* ==================== بريد: تسجيل الدخول ==================== */
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

  /* ==================== بريد: إنشاء حساب ==================== */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    sessionStorage.setItem("registering", "1");

    const cleanMail = cleanEmail(email);
    const cleanPass = password.trim();

    try {
      const result = await createUserWithEmailAndPassword(auth, cleanMail, cleanPass);
      const user = result.user;
      await updateProfile(user, { displayName: name.trim() });

      try {
        await sendEmailVerification(user);
      } catch (firebaseErr) {
        console.error("Firebase email failed:", firebaseErr);
        try {
          await emailjs.send(
            "service_83c997s", "template_pvllp4d",
            { to_name: name.trim(), to_email: cleanMail, email: cleanMail,
              verification_link: "https://law-office-78a96.web.app/login" },
            "ZWRWlbpfVQegdwz9I"
          );
        } catch (e2) { console.error("EmailJS also failed:", e2); }
      }

      if (officeMode === "create") {
        const officeId = crypto.randomUUID();
        const code = nanoid(8);
        await setDoc(doc(db, "offices", officeId), {
          id: officeId, officeId,
          name: officeName.trim(),
          ownerId: user.uid,
          inviteCode: code,
          createdAt: Timestamp.now(),
        });
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name.trim(),
          email: cleanMail,
          role: "admin",
          officeId,
          joinMethod: "email",        // ✅ التعديل 1: إنشاء مكتب بالبريد
          emailVerified: false,
          createdAt: Timestamp.now(),
        });
        await auth.signOut();
        setPendingEmail(cleanMail);
        setCreatedFor("email");
        setCreatedCode(code);
      } else {
        const q = query(collection(db, "offices"), where("inviteCode", "==", inviteCode.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          setError("كود المكتب غير صحيح");
          await auth.signOut();
          return;
        }
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name.trim(),
          email: cleanMail,
          role: "client",
          officeId: snap.docs[0].id,
          joinMethod: "email",        // ✅ التعديل 2: الانضمام بالبريد
          emailVerified: false,
          createdAt: Timestamp.now(),
        });
        await auth.signOut();
        sessionStorage.setItem("pendingVerificationEmail", cleanMail);
        navigate("/verify-email");
      }
    } catch (err) {
      console.error(err);
      await auth.signOut().catch(() => {});
      if (err.code === "auth/email-already-in-use") {
        setError("هذا البريد مسجل بالفعل — جرّب تسجيل الدخول");
      } else if (err.code === "auth/weak-password") {
        setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      } else if (err.code === "auth/invalid-email") {
        setError("البريد الإلكتروني غير صالح");
      } else {
        setError("حدث خطأ أثناء التسجيل، حاول مرة أخرى");
      }
    } finally {
      setLoading(false);
      sessionStorage.removeItem("registering");
    }
  };

  /* ==================== هاتف: إرسال OTP ==================== */
  const ensureVerifier = () => {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch {}
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    return window.recaptchaVerifier;
  };

  const sendOtp = async () => {
    setError("");
    if (!phone.trim()) { setError("أدخل رقم الهاتف"); return; }
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
        setError("رقم الهاتف غير صالح — 11 رقماً يبدأ بـ 01");
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

  /* ==================== هاتف: تأكيد OTP ==================== */
  const confirmOtp = async () => {
    setError("");
    sessionStorage.setItem("registering", "1");
    try {
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);
      const cred = await confirmation.confirm(otp);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (snap.exists()) {
        sessionStorage.removeItem("registering");
        navigateByRole(snap.data().role || "client");
      } else {
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

  /* ==================== هاتف: إعداد المكتب ==================== */
  const handlePhoneSetup = async () => {
    setError("");
    if (!setupName.trim()) { setError("أدخل اسمك أولاً"); return; }
    const finalName = setupName.trim() || phoneUser.displayName || "مستخدم";

    try {
      setLoading(true);
      if (setupMode === "create") {
        if (!setupOfficeName.trim()) { setError("أدخل اسم المكتب"); return; }
        const officeId = crypto.randomUUID();
        const code = nanoid(8);
        await setDoc(doc(db, "offices", officeId), {
          id: officeId, officeId,
          name: setupOfficeName.trim(),
          ownerId: phoneUser.uid,
          inviteCode: code,
          createdAt: Timestamp.now(),
        });
        await setDoc(doc(db, "users", phoneUser.uid), {
          uid: phoneUser.uid,
          name: finalName,
          email: null,
          phoneNumber: phoneUser.phoneNumber,
          role: "admin",
          officeId,
          joinMethod: "phone",        // ✅ التعديل 3: إنشاء مكتب بالهاتف
          emailVerified: true,
          createdAt: Timestamp.now(),
        });
        setPendingEmail("");
        setCreatedFor("phone");
        setCreatedCode(code);
      } else {
        const q = query(collection(db, "offices"), where("inviteCode", "==", setupCode.trim()));
        const snap = await getDocs(q);
        if (snap.empty) { setError("كود المكتب غير صحيح"); return; }
        await setDoc(doc(db, "users", phoneUser.uid), {
          uid: phoneUser.uid,
          name: finalName,
          email: null,
          phoneNumber: phoneUser.phoneNumber,
          role: "client",
          officeId: snap.docs[0].id,
          joinMethod: "phone",        // ✅ التعديل 4: الانضمام بالهاتف
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

  const finishAfterModal = () => {
    if (createdFor === "email") {
      sessionStorage.setItem("pendingVerificationEmail", pendingEmail);
      navigate("/verify-email");
    } else {
      reloadUserData(phoneUser.uid).then(() => navigate("/"));
    }
  };

  /* ================= RENDER ================= */

  // شاشة إعداد الهاتف (مستخدم هاتف جديد)
  if (phoneUser && !createdCode) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h2 style={s.goldTitle}>⚖️ نظام إدارة مكتب المحاماة</h2>
          <h3 style={{ color: "#f1f5f9", marginBottom: 12 }}>أهلاً بك! أكمل بياناتك</h3>
          <div style={s.form}>
            <input style={s.input} placeholder="اسمك" value={setupName}
              onChange={(e) => setSetupName(e.target.value)} />
            <div style={s.tabBar}>
              <button style={setupMode === "create" ? s.tabActive : s.tabBtn}
                onClick={() => setSetupMode("create")}>إنشاء مكتب جديد</button>
              <button style={setupMode === "join" ? s.tabActive : s.tabBtn}
                onClick={() => setSetupMode("join")}>الانضمام بكود</button>
            </div>
            {setupMode === "create" && (
              <input style={s.input} placeholder="اسم المكتب" value={setupOfficeName}
                onChange={(e) => setSetupOfficeName(e.target.value)} />
            )}
            {setupMode === "join" && (
              <input style={s.input} placeholder="كود المكتب" value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)} dir="ltr" />
            )}
            {setupMode && (
              <button onClick={handlePhoneSetup} disabled={loading} style={s.goldBtn}>
                {loading ? "جاري..." : "متابعة"}
              </button>
            )}
            {error && <p style={s.error}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={s.goldTitle}>⚖️ نظام إدارة مكتب المحاماة</h2>
        <p style={{ color: "#cbd5e1", marginBottom: 18 }}>إنشاء حساب أو تسجيل دخول</p>

        {/* التبويبان الرئيسيان */}
        {!createdCode && (
          <div style={s.tabBar}>
            <button style={tab === "email" ? s.tabActive : s.tabBtn}
              onClick={() => { setTab("email"); setError(""); }}>
              📧 إنشاء حساب / دخول بالبريد
            </button>
            <button style={tab === "phone" ? s.tabActive : s.tabBtn}
              onClick={() => { setTab("phone"); setError(""); }}>
              📱 إنشاء حساب / دخول بالهاتف
            </button>
          </div>
        )}

        {/* ============ تبويب البريد ============ */}
        {tab === "email" && !createdCode && (
          <>
            {/* المفتاح الداخلي: دخول | إنشاء حساب */}
            <div style={{ ...s.tabBar, marginBottom: 12 }}>
              <button style={emailMode === "login" ? s.tabActive : s.tabBtn}
                onClick={() => { setEmailMode("login"); setError(""); }}>تسجيل دخول</button>
              <button style={emailMode === "new" ? s.tabActive : s.tabBtn}
                onClick={() => { setEmailMode("new"); setError(""); }}>إنشاء حساب</button>
            </div>

            {/* وضع الدخول */}
            {emailMode === "login" && (
              <form onSubmit={handleLogin} style={s.form}>
                <input placeholder="البريد الإلكتروني" value={email}
                  onChange={(e) => setEmail(cleanEmail(e.target.value))}
                  style={s.input} dir="ltr" />
                <input type="password" placeholder="كلمة المرور" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={s.input} dir="ltr" />
                <div style={{ textAlign: "left" }}>
                  <Link to="/forgot-password" style={s.mutedLink}>🔐 نسيت كلمة المرور؟</Link>
                </div>
                <button type="submit" disabled={loading} style={s.goldBtn}>
                  {loading ? "جاري الدخول..." : "تسجيل الدخول"}
                </button>
              </form>
            )}

            {/* وضع إنشاء الحساب */}
            {emailMode === "new" && (
              <form onSubmit={handleRegister} style={s.form}>
                <div style={{ ...s.tabBar, marginBottom: 2 }}>
                  <button type="button" style={officeMode === "create" ? s.tabActive : s.tabBtn}
                    onClick={() => setOfficeMode("create")}>إنشاء مكتب</button>
                  <button type="button" style={officeMode === "join" ? s.tabActive : s.tabBtn}
                    onClick={() => setOfficeMode("join")}>الانضمام بكود</button>
                </div>
                <input style={s.input} placeholder="الاسم" value={name}
                  onChange={(e) => setName(e.target.value)} required />
                <input style={s.input} placeholder="البريد الإلكتروني" value={email}
                  onChange={(e) => setEmail(cleanEmail(e.target.value))} dir="ltr" required />
                <input style={s.input} type="password" placeholder="كلمة المرور"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  dir="ltr" required />
                {officeMode === "create" && (
                  <input style={s.input} placeholder="اسم المكتب" value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)} required />
                )}
                {officeMode === "join" && (
                  <input style={s.input} placeholder="كود المكتب" value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)} dir="ltr" required />
                )}
                <button style={s.goldBtn} disabled={loading}>
                  {loading ? "جاري..." : "إنشاء الحساب"}
                </button>
              </form>
            )}
          </>
        )}

        {/* ============ تبويب الهاتف ============ */}
        {tab === "phone" && !createdCode && (
          <div style={s.form}>
            <div id="recaptcha-container"></div>
            {!confirmation ? (
              <>
                <input placeholder="01001234567 أو +201001234567" value={phone}
                  onChange={(e) => setPhone(e.target.value)} style={s.input} dir="ltr" />
                <button onClick={sendOtp} disabled={loading} style={s.goldBtn}>
                  {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                </button>
              </>
            ) : (
              <>
                <input placeholder="رمز التحقق (6 أرقام)" value={otp}
                  onChange={(e) => setOtp(e.target.value)} style={s.input} dir="ltr" />
                <button onClick={confirmOtp} disabled={loading} style={s.goldBtn}>
                  {loading ? "جاري التحقق..." : "تأكيد الرمز"}
                </button>
                <button onClick={() => { setConfirmation(null); setOtp(""); }}
                  style={{ ...s.goldBtn, background: "#475569" }}>تغيير الرقم</button>
              </>
            )}
            <p style={{ ...s.footer, fontSize: 12 }}>
              💡 أول مرة بالرقم؟ سنطلب منك إكمال بياناتك بعد التحقق
            </p>
          </div>
        )}

        {error && !createdCode && <p style={s.error}>{error}</p>}
      </div>

      {/* مودال كود المكتب */}
      {createdCode && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <h3 style={{ marginBottom: 10, color: "#f1f5f9" }}>🎉 تم إنشاء مكتبك بنجاح</h3>
            <p style={{ color: "#cbd5e1", marginBottom: 15 }}>
              احفظ كود المكتب — ستحتاجه لدعوة فريقك للانضمام:
            </p>
            <div style={s.codeBox}>{createdCode}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={s.blueBtn} onClick={copyCode}>
                {copied ? "✓ تم النسخ" : "📋 نسخ الكود"}
              </button>
              <button style={s.goldBtn} onClick={finishAfterModal}>متابعة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f172a, #1e293b, #334155)",
    direction: "rtl",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    padding: 28,
    borderRadius: 16,
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    color: "#f1f5f9",
    textAlign: "center",
    border: "1px solid rgba(212,175,55,0.15)",
  },
  goldTitle: { color: GOLD, marginBottom: 8 },
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 5 },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    fontWeight: "500",
    caretColor: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  tabBar: { display: "flex", gap: 8, marginBottom: 15 },
  tabBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1", cursor: "pointer",
    whiteSpace: "nowrap", fontSize: 13,
  },
  tabActive: {
    flex: 1, padding: 10, borderRadius: 10,
    border: "none", background: GOLD,
    color: "#0a0e1a", cursor: "pointer",
    fontWeight: "bold", whiteSpace: "nowrap", fontSize: 13,
  },
  goldBtn: {
    padding: 12, borderRadius: 10, border: "none",
    background: GOLD, color: "#0a0e1a",
    fontWeight: "bold", cursor: "pointer",
  },
  blueBtn: {
    padding: 12, borderRadius: 10, border: "none",
    background: "#2563eb", color: "#fff",
    fontWeight: "bold", cursor: "pointer",
  },
  error: { color: "#f87171", marginTop: 10, fontSize: 13 },
  footer: { marginTop: 12, color: "#cbd5e1", fontSize: 13 },
  goldLink: { color: GOLD, textDecoration: "none", fontWeight: "bold", cursor: "pointer" },
  mutedLink: { color: "#94a3b8", textDecoration: "none", fontSize: 13 },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modal: {
    background: "#1e293b", padding: 25, borderRadius: 16,
    width: 380, maxWidth: "90%", textAlign: "center",
    border: "1px solid rgba(212,175,55,0.3)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  codeBox: {
    fontSize: 24, fontWeight: "bold", letterSpacing: 3,
    background: "rgba(212,175,55,0.1)", color: GOLD,
    border: "1px solid rgba(212,175,55,0.3)",
    padding: "12px 20px", borderRadius: 10,
    marginBottom: 15, direction: "ltr",
  },
};