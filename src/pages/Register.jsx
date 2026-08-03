import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { nanoid } from "nanoid";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth } from "../firebaseAuth";
import { db } from "../firebaseDb";

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      await updateProfile(user, { displayName: name });

      // Send email verification via Firebase (EmailJS as backup)
      try {
        await sendEmailVerification(user);
        console.log("✅ Firebase verification email sent");
      } catch (firebaseErr) {
        console.error("❌ Firebase email failed:", firebaseErr);

        // Fallback to EmailJS
        try {
          const templateParams = {
            to_name: name,
            to_email: email,
            email: email,  // Required by EmailJS template
            verification_link: "https://law-office-78a96.web.app/login",
          };

          const response = await emailjs.send(
            "service_83c997s",
            "template_pvllp4d",
            templateParams,
            "ZWRWlbpfVQegdwz9I"
          );

          console.log("✅ EmailJS fallback sent:", response.status);
        } catch (emailjsErr) {
          console.error("❌ EmailJS also failed:", emailjsErr);
        }
      }

      let officeId = "";

      if (mode === "create") {
        officeId = crypto.randomUUID();
        const code = nanoid(8);

        await setDoc(doc(db, "offices", officeId), {
          id: officeId,
          name: officeName,
          ownerId: user.uid,
          inviteCode: code,
          createdAt: Timestamp.now(),
        });

        // Store user with retry logic
        const userData = {
          uid: user.uid,
          name,
          email,
          role: "admin",
          officeId,
          emailVerified: false,
          createdAt: Timestamp.now(),
        };

        try {
          await setDoc(doc(db, "users", user.uid), userData);
          console.log("✅ User document created successfully");
        } catch (docErr) {
          console.error("❌ Failed to create user document:", docErr);
          setError("حدث خطأ أثناء حفظ بيانات المستخدم");
          setLoading(false);
          return;
        }

        alert("كود المكتب: " + code);
      }

      if (mode === "join") {
        const { collection, getDocs } = await import("firebase/firestore");

        const snap = await getDocs(collection(db, "offices"));

        let found = null;

        snap.forEach((d) => {
          if (d.data().inviteCode === inviteCode.trim()) {
            found = d;
          }
        });

        if (!found) {
          setError("كود المكتب غير صحيح");
          setLoading(false);
          return;
        }

        officeId = found.id;

        // Store user with retry logic
        const userData = {
          uid: user.uid,
          name,
          email,
          role: "client",
          officeId,
          emailVerified: false,
          createdAt: Timestamp.now(),
        };

        try {
          await setDoc(doc(db, "users", user.uid), userData);
          console.log("✅ User document created successfully");
        } catch (docErr) {
          console.error("❌ Failed to create user document:", docErr);
          setError("حدث خطأ أثناء حفظ بيانات المستخدم");
          setLoading(false);
          return;
        }
      }

      // Sign out the user - they must verify email before using the system
      await auth.signOut();

      // Store email in sessionStorage so verify page can show it
      sessionStorage.setItem("pendingVerificationEmail", email);

      navigate("/verify-email");
    } catch (err) {
  console.error(err);

  if (err.code === "auth/email-already-in-use") {
    setError("هذا البريد الإلكتروني مستخدم بالفعل");
  } else if (err.code === "auth/weak-password") {
    setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  } else if (err.code === "auth/invalid-email") {
    setError("البريد الإلكتروني غير صحيح");
  } else {
    setError("حدث خطأ أثناء التسجيل");
  }
} finally {
  setLoading(false);
}
};

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>إنشاء حساب / الانضمام لمكتب</h2>

        {error && <div style={styles.error}>{error}</div>}

        {/* SWITCH */}
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
            الانضمام
          </button>
        </div>

        <form onSubmit={handleRegister}>
          <input
            style={styles.input}
            placeholder="الاسم"
            onChange={(e) => setName(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="البريد الإلكتروني"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="كلمة المرور"
            onChange={(e) => setPassword(e.target.value)}
          />

          {mode === "create" && (
            <input
              style={styles.input}
              placeholder="اسم المكتب"
              onChange={(e) => setOfficeName(e.target.value)}
            />
          )}

          {mode === "join" && (
            <input
              style={styles.input}
              placeholder="كود المكتب"
              onChange={(e) => setInviteCode(e.target.value)}
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
    </div>
  );
}

/* 🎨 STYLES */

const styles = {
  page: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2f7, #f7f9fc)",
  },

  card: {
    width: 420,
    padding: 25,
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },

  title: {
    textAlign: "center",
    marginBottom: 15,
  },

  input: {
    width: "100%",
    padding: 12,
    margin: "8px 0",
    borderRadius: 8,
    border: "1px solid #ddd",
    outline: "none",
  },

  switch: {
    display: "flex",
    gap: 10,
    marginBottom: 15,
  },

  btn: {
    flex: 1,
    padding: 10,
    border: "1px solid #ccc",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
  },

  activeBtn: {
    flex: 1,
    padding: 10,
    border: "none",
    background: "#2c3e50",
    color: "white",
    borderRadius: 8,
    cursor: "pointer",
  },

  submit: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    background: "#2c3e50",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  error: {
    background: "#ffe5e5",
    color: "red",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    textAlign: "center",
  },

  footer: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
};