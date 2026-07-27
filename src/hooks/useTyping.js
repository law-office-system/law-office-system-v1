import { useEffect, useRef, useCallback } from "react";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "../firebaseDb";

const TYPING_TIMEOUT = 3000; // 3 seconds

/**
 * 📝 Hook لإدارة حالة "يكتب الآن"
 */
export function useTyping(roomId, userId, userName) {
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // إرسال حالة الكتابة
  const sendTyping = useCallback(() => {
    if (!roomId || !userId) return;

    const typingDocId = `${roomId}_${userId}`;
    const typingRef = doc(db, "typing", typingDocId);

    updateDoc(typingRef, {
      roomId,
      userId,
      userName: userName || "مستخدم",
      timestamp: serverTimestamp(),
    }).catch(() => {
      // إذا لم يكن المستند موجوداً، أنشئه
      addDoc(collection(db, "typing"), {
        roomId,
        userId,
        userName: userName || "مستخدم",
        timestamp: serverTimestamp(),
      });
    });

    isTypingRef.current = true;

    // حذف حالة الكتابة بعد فترة
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  }, [roomId, userId, userName]);

  // إيقاف حالة الكتابة
  const stopTyping = useCallback(() => {
    if (!roomId || !userId) return;

    const typingDocId = `${roomId}_${userId}`;
    deleteDoc(doc(db, "typing", typingDocId)).catch(() => {});

    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [roomId, userId]);

  // تنظيف عند إزالة المكون
  useEffect(() => {
    return () => {
      stopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [stopTyping]);

  return { sendTyping, stopTyping };
}

/**
 * 👀 Hook للاستماع للمستخدمين الذين يكتبون
 */
export function useListenTyping(roomId, currentUserId, callback) {
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const q = query(
      collection(db, "typing"),
      where("roomId", "==", roomId),
      where("userId", "!=", currentUserId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const users = snap.docs.map(d => ({
        userId: d.data().userId,
        userName: d.data().userName,
      }));
      callback(users);
    });

    return () => unsub();
  }, [roomId, currentUserId, callback]);
}
