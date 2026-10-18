import { useState, useEffect, useCallback } from 'react';

import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { useAuth } from '../context/AuthContext';

import { db } from "../firebaseDb";

/**
 * 💬 Hook لإدارة الرسائل في غرف المكتب الداخلية
 * ✅ الرسائل الداخلية تبقى في الجذر "messages" مع officeId
 *    (القالب العام في القواعد يتطلب officeId في الوثيقة والاستعلام)
 */
export function useMessages(roomId, roomType = 'internal', currentUser) {
  const { userData } = useAuth();
  const officeId = currentUser?.officeId || userData?.officeId;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  // جلب الرسائل
  useEffect(() => {
    if (!roomId || !officeId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // ✅ officeId في الاستعلام — إلزامي لتوافق قواعد Firestore
    const q = query(
      collection(db, 'messages'),
      where("officeId", "==", officeId),
      where("roomId", "==", roomId),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q,
      (snap) => {
        const fetchedMessages = snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }));
        setMessages(fetchedMessages);
        setLoading(false);

        if (currentUser?.uid) {
          fetchedMessages.forEach(async (msg) => {
            if (msg.senderId !== currentUser.uid && !msg.seenBy?.includes(currentUser.uid)) {
              try {
                await updateDoc(doc(db, 'messages', msg.id), {
                  seenBy: [...(msg.seenBy || []), currentUser.uid]
                });
              } catch (err) {
                console.error("Error updating seen status:", err);
              }
            }
          });
        }
      },
      (err) => {
        console.error("Error fetching messages:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [roomId, officeId, currentUser?.uid]);

  // إرسال رسالة
  const sendMessage = useCallback(async () => {
    if (!text.trim() || !roomId || !currentUser?.uid || !officeId) return false;
    if (sending) return false;

    setSending(true);
    try {
      const data = {
        roomId,
        senderId: currentUser.uid,
        senderName: currentUser.name || "مستخدم",
        officeId,                    // ✅ إلزامي لقواعد القراءة
        createdAt: serverTimestamp(),
        seenBy: [currentUser.uid],
        text: text.trim(),
      };

      if (replyTo) {
        data.replyTo = { id: replyTo.id, text: replyTo.text, senderName: replyTo.senderName };
      }

      await addDoc(collection(db, 'messages'), data);

      await updateDoc(doc(db, 'rooms', roomId), {
        lastMessage: text.trim(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });

      setText("");
      setReplyTo(null);
      return true;
    } catch (err) {
      console.error('Error adding message:', err);
      setError(err.message);
      return false;
    } finally {
      setSending(false);
    }
  }, [text, replyTo, roomId, currentUser, sending, officeId]);

  // حذف رسالة
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      return false;
    }
  }, []);

  // تعديل رسالة
  const editMessage = useCallback(async (messageId, newText) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        text: newText,
        editedAt: serverTimestamp(),
        isEdited: true,
      });
      return true;
    } catch (err) {
      console.error('Error editing message:', err);
      return false;
    }
  }, []);

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = msg.createdAt?.toDate ? msg.createdAt.toDate().toDateString() : 'unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const unreadCount = messages.filter(
    (msg) => msg.senderId !== currentUser?.uid && !msg.seenBy?.includes(currentUser?.uid)
  ).length;

  return {
    messages,
    groupedMessages,
    text,
    setText,
    replyTo,
    setReplyTo,
    loading,
    error,
    sending,
    sendMessage,
    deleteMessage,
    editMessage,
    unreadCount,
  };
}