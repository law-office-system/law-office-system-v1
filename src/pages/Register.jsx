import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { nanoid } from "nanoid";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc, setDoc, Timestamp, collection, query, where, getDocs,
} from "firebase/firestore";
import { auth } from "../firebaseAuth";
import { db } from "../firebaseDb";

// تنظيف البريد من كل المسافات (التعبئة التلقائية تضيف مسافات)
const cleanEmail = (v) => v.replace(/\s+/g, "").toLowerCase();

export default function Register() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("create");
  const [officeName, setOfficeName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const finishAndGoVerify = (cleanMail) => {
    sessionStorage.setItem("pendingVerificationEmail", cleanMail);
    navigate("/verify-email");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // إبلاغ AuthContext أن التسجيل جارٍ — لا ينشئ وثيقة تلقائياً
    sessionStorage.setItem("registering", "1");

    const cleanMail = cleanEmail(email);
    const cleanPass = password.trim();

    try {
      const result = await createUserWithEmailAndPassword(auth, cleanMail, cleanPass);
      const user = result.user;

      await updateProfile(user, { displayName: name });

      // إرسال بريد التأكيد (EmailJS كاحتياط)
      try {
        await sendEmailVerification(user);
      } catch (firebaseErr) {
        console.error("Firebase email failed:", firebaseErr);
        try {
          await emailjs.send(
            "service_83c997s",
            "template_pvllp4d",
            {
              to_name: name,
              to_email: cleanMail,
              email: cleanMail,
              verification_link: "https://law-office-78a96.web.app/login",
            },
            "ZWRWlbpfVQegdwz9I"
          );
        } catch (e2) {
          console.error("EmailJS also failed:", e2);
        }
      }

      if (mode === "create") {
        const officeId = crypto.randomUUID();
        const code = nanoid(8);

        await setDoc(doc(db, "offices", officeId), {
          id: officeId,
          officeId,
          name: officeName,
          ownerId: user.uid,
          inviteCode: code,
          createdAt: Timestamp.now(),
        });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name,
          email: cleanMail,
          role: "admin",
          officeId,
          emailVerified: false,
          createdAt: Timestamp.now(),
        });

        await auth.signOut();
        // مودال بدل alert — المستخدم ينسخ الكود ثم يكمل
        setCreatedCode(code);
      } else {
        const q = query(
          collection(db, "offices"),
          where("inviteCode", "==", inviteCode.trim())
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("كود المكتب غير صحيح");
          await auth.signOut();
          return;
        }

        const officeId = snap.docs[0].id;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name,
          email: cleanMail,
          role: "client",
          officeId,
          emailVerified: false,
          createdAt: Timestamp.now(),
        });

        await auth.signOut();
        finishAndGoVerify(cleanMail);
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
      } else if (err.code === "auth/invalid-credential") {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        setError("حدث خطأ أثناء التسجيل، حاول مرة أخرى");
      }
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
    } catch {
      /* المتصفح قد يرفض النسخ */
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>إنشاء حساب / الانضمام لمكتب</h2>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.switch}>
          <button
            onClick={() => setMode("create")}
            style={mode === "create" ? styles.activeBtn : styles.btn}
          >
            إنشاء مكتب
          </button>
          <button
            onClick={() => setMode("join")}
            style={mode === "join" ? styles.activeBtn : styles.btn}
          >
            الانضمام بكود
          </button>
        </div>

        <form onSubmit={handleRegister}>
          <input
            style={styles.input}
            placeholder="الاسم"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            style={styles.input}
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(cleanEmail(e.target.value))}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {mode === "create" && (
            <input
              style={styles.input}
              placeholder="اسم المكتب"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              required
            />
          )}

          {mode === "join" && (
            <input
              style={styles.input}
              placeholder="كود المكتب"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
          )}

          <button style={styles.submit} disabled={loading}>
            {loading ? "جاري..." : "تسجيل"}
          </button>
        </form>

        <p style={styles.footer}>
          لديك حساب؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </div>

      {/* مودال كود المكتب */}
      {createdCode && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: 10 }}>🎉 تم إنشاء مكتبك بنجاح</h3>
            <p style={{ color: "#555", marginBottom: 15 }}>
              احفظ كود المكتب — ستحتاجه لدعوة فريقك للانضمام:
            </p>
            <div style={styles.codeBox}>{createdCode}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={styles.copyBtn} onClick={copyCode}>
                {copied ? "✓ تم النسخ" : "📋 نسخ الكود"}
              </button>
              <button
                style={styles.submit}
                onClick={() => finishAndGoVerify(cleanEmail(email))}
              >
                متابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2f7, #f7f9fc)",
    padding: 20,
  },
  card: {
    width: 420,
    maxWidth: "100%",
    padding: 25,
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  title: { textAlign: "center", marginBottom: 15 },
  input: {
    width: "100%",
    padding: 12,
    margin: "8px 0",
    borderRadius: 8,
    border: "1px solid #ddd",
    outline: "none",
    boxSizing: "border-box",
  },
  switch: { display: "flex", gap: 10, marginBottom: 15 },
  btn: {
    flex: 1, padding: 10, border: "1px solid #ccc",
    background: "#fff", borderRadius: 8, cursor: "pointer",
  },
  activeBtn: {
    flex: 1, padding: 10, border: "none", background: "#2c3e50",
    color: "white", borderRadius: 8, cursor: "pointer",
  },
  submit: {
    flex: 1,
    padding: 12, marginTop: 10, background: "#2c3e50", color: "white",
    border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold",
  },
  copyBtn: {
    flex: 1,
    padding: 12, marginTop: 10, background: "#2563eb", color: "white",
    border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold",
  },
  error: {
    background: "#ffe5e5", color: "red", padding: 10,
    borderRadius: 8, marginBottom: 10, textAlign: "center",
  },
  footer: { textAlign: "center", marginTop: 10, fontSize: 14 },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modal: {
    background: "#fff", padding: 25, borderRadius: 14,
    width: 380, maxWidth: "90%", textAlign: "center",
  },
  codeBox: {
    fontSize: 24, fontWeight: "bold", letterSpacing: 3,
    background: "#f1f5f9", padding: "12px 20px",
    borderRadius: 10, marginBottom: 15, direction: "ltr",
  },
};