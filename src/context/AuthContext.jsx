import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setLoading(true);

      // ================= NOT LOGGED IN =================
      if (!u) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(u);

      const ref = doc(db, "users", u.uid);

      try {
        // ================= CHECK USER EXISTS =================
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(ref, {
            uid: u.uid,
            name: u.displayName || "",
            email: u.email || "",
            role: "client",
            officeId: null,
            createdAt: new Date().toISOString(),
          });
        }

        // ================= REALTIME USER DATA =================
        unsubscribeFirestore = onSnapshot(ref, (docSnap) => {
          if (!docSnap.exists()) {
            setUserData({
              uid: u.uid,
              role: "client",
              officeId: null,
              officeStatus: "active",
            });

            setLoading(false);
            return;
          }

          const data = docSnap.data();

          setUserData({
            uid: u.uid,
            ...data,
            role: data.role || "client",
            officeId: data.officeId || null,
            officeStatus: data.officeStatus || "active",
          });

          setLoading(false);
        });
      } catch (err) {
        console.error("AuthContext Error:", err);

        setUserData({
          uid: u.uid,
          role: "client",
          officeId: null,
          officeStatus: "active",
        });

        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // ================= LOGOUT =================
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);