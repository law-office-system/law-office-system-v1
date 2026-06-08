import { useEffect, useRef, useState } from "react";
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, getDoc, updateDoc 
} from "firebase/firestore";
import { db } from "../../firebase";

export default function Messages({ room, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // 1. جلب الرسائل وتحديث حالة المشاهدة تلقائياً
  useEffect(() => {
    if (!room?.id || !currentUser?.uid) return;
    setLoading(true);
    
    const q = query(collection(db, "messages"), where("roomId", "==", room.id), orderBy("createdAt", "asc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const fetchedMessages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(fetchedMessages);
      setLoading(false);

      // تحديث حالة القراءة (Seen) للرسائل التي لم يراها المستخدم الحالي
      fetchedMessages.forEach(async (msg) => {
        if (msg.senderId !== currentUser.uid && !msg.seenBy?.includes(currentUser.uid)) {
          const msgRef = doc(db, "messages", msg.id);
          await updateDoc(msgRef, {
            seenBy: [...(msg.seenBy || []), currentUser.uid]
          });
        }
      });
    });
    return () => unsub();
  }, [room?.id, currentUser?.uid]);

  // 2. التمرير التلقائي للأسفل
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. التحقق من صلاحية الإرسال
  useEffect(() => {
    const checkPermission = async () => {
      if (!room?.id || !currentUser?.uid) return;
      const memberRef = doc(db, "roomMembers", `${currentUser.uid}_${room.id}`);
      const snap = await getDoc(memberRef);
      if (snap.exists()) setCanSend(snap.data().canSend !== false);
    };
    checkPermission();
  }, [room?.id, currentUser?.uid]);

  // 4. دالة الإرسال مع تحديث "آخر رسالة" في مستند الغرفة
  const sendMessage = async () => {
    if (!text.trim() || !canSend) return;

    // أ. إضافة الرسالة الجديدة
    await addDoc(collection(db, "messages"), {
      roomId: room.id,
      text,
      senderId: currentUser.uid,
      senderName: currentUser.name || "مستخدم",
      createdAt: serverTimestamp(),
      seenBy: [currentUser.uid],
    });

    // ب. تحديث مستند الغرفة لتظهر "آخر رسالة" في القائمة الجانبية (Sidebar)
    await updateDoc(doc(db, "rooms", room.id), {
      lastMessage: text,
      updatedAt: serverTimestamp()
    });

    setText("");
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") sendMessage(); };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div style={styles.center}>⏳ جاري التحميل...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        {messages.map((m) => (
          <div key={m.id} style={{
            ...styles.bubble,
            alignSelf: m.senderId === currentUser.uid ? 'flex-end' : 'flex-start',
            background: m.senderId === currentUser.uid ? '#dcf8c6' : '#fff'
          }}>
            <div style={styles.senderName}>{m.senderId === currentUser.uid ? "أنت" : m.senderName}</div>
            <div style={styles.text}>{m.text}</div>
            <div style={styles.time}>
              {formatTime(m.createdAt)}
              {m.senderId === currentUser.uid && (
                <span style={{ marginLeft: 5, color: m.seenBy?.length > 1 ? '#34b7f1' : '#aaa' }}>
                  {m.seenBy?.length > 1 ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <div style={styles.inputBox}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} style={styles.input} placeholder="رسالة..." />
          <button onClick={sendMessage}>إرسال</button>
        </div>
      ) : (
        <div style={styles.readOnly}>🔒 لا تملك صلاحية الإرسال</div>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%", background: "#fdfdfd" },
  chatBox: { flex: 1, overflowY: "auto", padding: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  bubble: { padding: "10px 15px", borderRadius: 18, maxWidth: '75%', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  senderName: { fontSize: 11, fontWeight: '600', color: '#007bff', marginBottom: 4 },
  text: { fontSize: 15, color: "#333" },
  time: { fontSize: 10, color: '#888', marginTop: 5, textAlign: 'right', display: "flex", justifyContent: "flex-end", alignItems: "center" },
  inputBox: { display: "flex", padding: 15, background: "#fff", borderTop: "1px solid #eee", gap: 10 },
  input: { flex: 1, padding: 12, borderRadius: 25, border: "1px solid #ddd", outline: 'none' },
  readOnly: { padding: 15, textAlign: "center", color: "#777", background: "#f4f4f4", fontSize: 13, borderTop: "1px solid #ddd" },
  center: { textAlign: 'center', padding: 40, color: '#999' }
};