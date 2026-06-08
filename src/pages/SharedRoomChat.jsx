import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc, // 💡 تم استيرادها لتحديث الرسالة الأخيرة في الـ Sidebar
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

export default function SharedRoomChat() {
  const { id } = useParams();
  const { userData } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  // ===== تحميل الغرفة =====
  useEffect(() => {
    if (!id) return;

    const loadRoom = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "sharedRooms", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setRoom({ id: snap.id, ...snap.data() });
        } else {
          setRoom(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [id]);

  // ===== الرسائل =====
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "sharedMessages"),
      where("roomId", "==", id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sortedMessages = data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });

      setMessages(sortedMessages);
    });

    return () => unsub();
  }, [id]);

  // ===== النزول التلقائي لآخر رسالة =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== إرسال رسالة + تحديث الفايربيس للسايدبار =====
  const sendMessage = async () => {
    if (!text.trim() || !userData) return;

    const currentText = text;
    setText("");

    try {
      // 1. إضافة الرسالة المكتوبة
      await addDoc(collection(db, "sharedMessages"), {
        roomId: id,
        text: currentText,
        senderId: userData.uid,
        senderName: userData.name || "مستخدم",
        officeId: userData.officeId,
        createdAt: serverTimestamp(),
      });

      // 2. تحديث مستند الغرفة ليعرض السايدبار آخر رسالة فوراً 💡
      const roomRef = doc(db, "sharedRooms", id);
      await updateDoc(roomRef, {
        lastMessage: currentText,
        lastMessageAt: serverTimestamp()
      });

    } catch (err) {
      console.error("خطأ أثناء الإرسال والتحديث:", err);
      alert("فشل الإرسال");
      setText(currentText);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  if (loading) return <div style={styles.centeredState}>جاري تحميل الغرفة...</div>;
  if (!room) return <div style={styles.centeredState}>الغرفة غير موجودة</div>;
  if (!userData) return <div style={styles.centeredState}>جاري تحميل المستخدم...</div>;

  // ===== التحقق من العضوية =====
  const isMember = room.officeA === userData.officeId || room.officeB === userData.officeId;
  if (!isMember) return <div style={styles.centeredState}>غير مصرح لك بالدخول</div>;

  // 💡 معادلة ذكية: إذا كنت أنا صاحب المكتب A، اعرض لي اسم المكتب B.. والعكس صحيح
  const isOfficeA = room.officeA === userData?.officeId;
  const otherOfficeName = isOfficeA ? room.officeBName : room.officeAName;

  return (
    <div style={styles.container}>
      {/* Header المعدل ديناميكياً */}
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          🤝 {otherOfficeName || room.name || "غرفة تعاون بين المكاتب"}
        </h3>
        <span style={styles.badge}>غرفة مشتركة</span>
      </div>

      {/* Messages */}
      <div style={styles.chatBox}>
        {messages.map((msg) => {
          const isMe = msg.senderId === userData.uid;
          return (
            <div
              key={msg.id}
              style={{
                ...styles.message,
                alignSelf: isMe ? "flex-end" : "flex-start",
                background: isMe ? "#007bff" : "#f1f2f6",
                color: isMe ? "#fff" : "#2d3436",
                borderRadius: isMe ? "12px 12px 0px 12px" : "12px 12px 12px 0px",
              }}
            >
              <div style={styles.senderName}>{isMe ? "أنت" : msg.senderName}</div>
              <div style={styles.messageText}>{msg.text}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputBox}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.button}>إرسال</button>
      </div>
    </div>
  );
}

/* ===== STYLES ===== */
const styles = {
  container: { display: "flex", flexDirection: "column", height: "100vh", background: "#f8f9fa", direction: "rtl" },
  header: { padding: "15px 20px", background: "#fff", borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { margin: 0, fontSize: "16px", color: "#2c3e50", fontWeight: "bold" },
  badge: { background: "#27ae60", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "11px" },
  chatBox: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" },
  message: { maxWidth: "70%", padding: "10px 14px", boxShadow: "0px 1px 2px rgba(0,0,0,0.05)", lineHeight: "1.5" },
  senderName: { fontSize: "11px", fontWeight: "bold", marginBottom: "3px", opacity: 0.8 },
  messageText: { fontSize: "14px", wordBreak: "break-word" },
  inputBox: { padding: "15px", background: "#fff", borderTop: "1px solid #e0e0e0", display: "flex", gap: "10px" },
  input: { flex: 1, padding: "12px", border: "1px solid #ccc", borderRadius: "8px", fontSize: "14px", outline: "none" },
  button: { padding: "0 25px", background: "#007bff", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" },
  centeredState: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "15px" },
};