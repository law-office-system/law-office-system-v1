import { useEffect, useState, useRef, useCallback } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseDb";

/**
 * 💬 Hook لإدارة الرسائل في الغرفة
 */
export function useMessages(roomId, roomType = 'internal', currentUser) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const unsubscribeRef = useRef(null);

  const messagesCollection = roomType === 'shared' ? 'sharedMessages' : 'messages';
  const roomsCollection = roomType === 'shared' ? 'sharedRooms' : 'rooms';

  // جلب الرسائل
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, messagesCollection),
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

        // تحديث حالة القراءة
        if (currentUser?.uid) {
          fetchedMessages.forEach(async (msg) => {
            if (msg.senderId !== currentUser.uid && !msg.seenBy?.includes(currentUser.uid)) {
              try {
                await updateDoc(doc(db, messagesCollection, msg.id), {
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

    unsubscribeRef.current = unsub;
    return () => unsub();
  }, [roomId, roomType, currentUser?.uid]);

  // إرسال رسالة
  const sendMessage = useCallback(async () => {
    if (!text.trim() || !roomId || !currentUser?.uid) return false;
    if (sending) return false; // ✅ منع الإرسال المزدوج

    setSending(true);

    try {
      const data = {
        roomId,
        senderId: currentUser.uid,
        senderName: currentUser.name || "مستخدم",
        createdAt: serverTimestamp(),
        seenBy: [currentUser.uid],
        text: text.trim(),
      };

      if (replyTo) {
        data.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderName,
        };
      }

      await addDoc(collection(db, messagesCollection), data);

      // تحديث آخر رسالة في الغرفة
      await updateDoc(doc(db, roomsCollection, roomId), {
        lastMessage: text.trim(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });

      // ✅ تفريغ الـ input بعد الإرسال الناجح
      setText("");
      setReplyTo(null);

      return true;
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.message);
      return false;
    } finally {
      setSending(false);
    }
  }, [text, replyTo, roomId, roomType, currentUser, sending]);

  // إرسال إشعار للأعضاء
  const sendNotification = useCallback(async (messageText, senderName) => {
    if (!roomId) return;

    try {
      const membersQuery = query(
        collection(db, "roomMembers"),
        where("roomId", "==", roomId)
      );
      const membersSnap = await getDocs(membersQuery);

      const batch = writeBatch(db);
      let count = 0;

      membersSnap.docs.forEach((memberDoc) => {
        const memberData = memberDoc.data();
        if (memberData.uid !== currentUser?.uid) {
          const notifRef = doc(collection(db, "notifications"));
          batch.set(notifRef, {
            userId: memberData.uid,
            type: "message",
            title: `رسالة جديدة من ${senderName || currentUser?.name || "مستخدم"}`,
            body: messageText.substring(0, 100),
            roomId: roomId,
            roomType: roomType,
            read: false,
            createdAt: serverTimestamp(),
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  }, [roomId, roomType, currentUser]);

  // حذف رسالة
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await deleteDoc(doc(db, messagesCollection, messageId));
      return true;
    } catch (err) {
      console.error("Error deleting message:", err);
      return false;
    }
  }, [messagesCollection]);

  // تعديل رسالة
  const editMessage = useCallback(async (messageId, newText) => {
    try {
      await updateDoc(doc(db, messagesCollection, messageId), {
        text: newText,
        editedAt: serverTimestamp(),
        isEdited: true,
      });
      return true;
    } catch (err) {
      console.error("Error editing message:", err);
      return false;
    }
  }, [messagesCollection]);

  // تجميع الرسائل حسب التاريخ
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = msg.createdAt?.toDate().toDateString() || 'unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  // 🏛️ Multi-Tenant: Calculate unread count (messages not seen by current user)
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
    sendNotification,
    deleteMessage,
    editMessage,
    unreadCount,  // 🆕 Multi-Tenant: unread messages count
  };
}