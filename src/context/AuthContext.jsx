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

      try {
        // 🔴 no user
        if (!u) {
          setUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }

        setUser(u);

        const ref = doc(db, "users", u.uid);

        const snap = await getDoc(ref);

        console.log("USER DOC EXISTS:", snap.exists());

        // 🔵 create user if not exists
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

        unsubscribeFirestore = onSnapshot(
          ref,
          (docSnap) => {
            console.log("USER SNAPSHOT:", docSnap.data());

            if (!docSnap.exists()) {
              setUserData({
                uid: u.uid,
                role: "client",
                officeId: null,
                officeStatus: "active",
                isOfficeAdmin: false,
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
              isOfficeAdmin:
                data.role === "admin" ||
                data.role === "lawyer",
            });

            setLoading(false);
          },
          (error) => {
            console.error("SNAPSHOT ERROR:", error);

            setUserData({
              uid: u.uid,
              role: "client",
              officeId: null,
              officeStatus: "active",
              isOfficeAdmin: false,
            });

            setLoading(false);
          }
        );
      } catch (err) {
        console.error("AUTH CONTEXT ERROR:", err);

        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

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