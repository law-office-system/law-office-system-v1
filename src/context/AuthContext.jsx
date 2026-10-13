import { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth } from "../firebaseAuth";
import { db } from "../firebaseDb";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(true);

  const initializedRef = useRef(false);

  // إعادة تحميل بيانات المستخدم (تُستخدم بعد إعداد مكتب مستخدم الهاتف)
  const reloadUserData = async (uid) => {
    try {
      const target = uid || auth.currentUser?.uid;
      if (!target) return null;
      const snap = await getDoc(doc(db, "users", target));
      if (snap.exists()) {
        setUserData(snap.data());
        return snap.data();
      }
    } catch (e) {
      console.error("reloadUserData error:", e);
    }
    return null;
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name, role = "lawyer", officeId = null) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email,
        name,
        role,
        officeId,
        createdAt: new Date().toISOString(),
      });
      return { success: true, user: result.user };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
        setUserDataLoading(true);

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else if (sessionStorage.getItem("registering") === "1") {
            // Register.jsx هو الكاتب الوحيد أثناء التسجيل البريدي
            setUserData(null);
          } else {
            // إنشاء تلقائي — يدعم الهاتف (بدون email)
            const fallbackData = {
              uid: user.uid,
              name: user.displayName || "مستخدم",
              email: user.email || null,
              phoneNumber: user.phoneNumber || null,
              role: "client",
              officeId: "",
              emailVerified: user.emailVerified,
              createdAt: new Date().toISOString(),
            };

            try {
              await setDoc(doc(db, "users", user.uid), fallbackData);
              setUserData(fallbackData);
            } catch (createErr) {
              console.error("Failed to auto-create user document:", createErr);
              setUserData(null);
            }
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUserData(null);
        } finally {
          setUserDataLoading(false);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setAuthLoading(false);
        setUserDataLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    user: currentUser,
    userData,
    userRole: userData?.role || null,
    officeId: userData?.officeId || null,
    loading: authLoading || userDataLoading,
    authLoading,
    userDataLoading,
    login,
    register,
    logout,
    reloadUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;