import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot, getDoc as getDocOnce } from "firebase/firestore";
import { enablePushNotifications } from "../utils/pushNotifications";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      console.log(
        "AUTH STATE:",
        u ? "LOGGED IN" : "LOGGED OUT"
      );

      setLoading(true);

      try {
        // لا يوجد مستخدم مسجل دخول
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

        // إنشاء سجل المستخدم إذا لم يكن موجوداً
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
          async (docSnap) => {
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

            // ✅ جيب officeName من offices collection
            let officeName = null;
            if (data.officeId) {
              try {
                const officeRef = doc(db, "offices", data.officeId);
                const officeSnap = await getDocOnce(officeRef);
                if (officeSnap.exists()) {
                  officeName = officeSnap.data().name || officeSnap.data().officeName || null;
                }
              } catch (err) {
                console.error("Error fetching office:", err);
              }
            }

            console.log("FCM CHECK", {
              permission: Notification.permission,
              hasToken: !!data.fcmToken,
              fcmToken: data.fcmToken,
            });

            setUserData({
              uid: u.uid,
              ...data,
              role: data.role || "client",
              officeId: data.officeId || null,
              officeName: officeName || data.officeName || data.officeId || "المكتب", // ✅ أضف officeName
              officeStatus: data.officeStatus || "active",
              isOfficeAdmin:
                data.role === "admin" ||
                data.role === "lawyer",
            });

            // ================= PUSH NOTIFICATIONS =================
            if (
              Notification.permission !== "denied" &&
              !data.fcmToken
            ) {
              console.log(
                "🚀 Calling enablePushNotifications"
              );

              enablePushNotifications(u.uid);
            }

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

        // لا نمسح المستخدم عند الخطأ المؤقت
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }

      unsubAuth();
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