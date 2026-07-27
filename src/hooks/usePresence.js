import { useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function usePresence() {
  const { userData } = useAuth();

  useEffect(() => {
    if (!userData?.uid) return;

    const userRef = doc(db, "userPresence", userData.uid);

    const setOnline = async () => {
      await setDoc(userRef, {
        uid: userData.uid,
        officeId: userData.officeId,
        isOnline: true,
        lastSeen: serverTimestamp(),
      });
    };

    const setOffline = async () => {
      await setDoc(userRef, {
        uid: userData.uid,
        officeId: userData.officeId,
        isOnline: false,
        lastSeen: serverTimestamp(),
      });
    };

    setOnline();

    window.addEventListener("beforeunload", setOffline);

    return () => {
      setOffline();
      window.removeEventListener("beforeunload", setOffline);
    };
  }, [userData]);
}