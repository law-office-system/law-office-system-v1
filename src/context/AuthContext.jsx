import { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
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

  // ✅ Prevent double execution in StrictMode / dev
  const initializedRef = useRef(false);

  // ✅ Login function
  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  // ✅ Register function
  const register = async (email, password, name, role = "lawyer", officeId = null) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update profile
      await updateProfile(result.user, { displayName: name });

      // Create user document in Firestore
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

  // ✅ Logout function
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
    // ✅ Prevent double execution in development (StrictMode)
    if (initializedRef.current) {
      console.log("⚠️ AuthProvider already initialized, skipping...");
      return;
    }
    initializedRef.current = true;

    console.log("🔥 AuthProvider: Initializing auth listener...");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔥 AuthProvider: onAuthStateChanged fired", user ? `UID: ${user.uid}` : "No user");

      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);

        // جلب بيانات المستخدم من Firestore
        console.log("🔥 AuthProvider: Fetching userData from Firestore...");
        setUserDataLoading(true);

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          console.log("🔥 AuthProvider: userDoc fetched", userDoc.exists() ? "EXISTS" : "NOT FOUND");

          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log("🔥 AuthProvider: userData loaded:", data);
            setUserData(data);
          } else {
            console.warn("⚠️ AuthProvider: User document not found, auto-creating...");

            // Auto-create user document from Auth data
            const fallbackData = {
              uid: user.uid,
              name: user.displayName || "مستخدم",
              email: user.email,
              role: "client",
              officeId: "",
              emailVerified: user.emailVerified,
              createdAt: new Date().toISOString(),
            };

            try {
              await setDoc(doc(db, "users", user.uid), fallbackData);
              console.log("✅ AuthProvider: Auto-created user document:", fallbackData);
              setUserData(fallbackData);
            } catch (createErr) {
              console.error("❌ AuthProvider: Failed to auto-create user document:", createErr);
              setUserData(null);
            }
          }
        } catch (err) {
          console.error("❌ AuthProvider: Error fetching user data:", err);
          setUserData(null);
        } finally {
          console.log("🔥 AuthProvider: Setting userDataLoading = false");
          setUserDataLoading(false);
        }
      } else {
        console.log("🔥 AuthProvider: No user, resetting state");
        setCurrentUser(null);
        setUserData(null);
        setAuthLoading(false);
        setUserDataLoading(false);
      }
    });

    return () => {
      console.log("🔥 AuthProvider: Cleanup - unsubscribing auth listener");
      unsubscribe();
    };
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
    // ✅ Auth functions
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;