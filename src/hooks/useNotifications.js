import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "notifications"),
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      }
    );

    return () => unsub();
  }, []);

  const unread = notifications.filter((n) => !n.read);

  return {
    notifications,
    count: unread.length,
    hasNotifications: unread.length > 0,
  };
}