import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

/* ===== 💡 وضع كائن التنسيقات في الأعلى لمنع مشاكل الـ Build نهائياً ===== */
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f9f9f9",
    direction: "rtl"
  },
  header: {
    padding: "15px 20px",
    background: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  chatBox: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  message: {
    maxWidth: "70%",
    padding: "10px 14px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },
  inputBox: {
    padding: "15px 20px",
    background: "#ffffff",
    borderTop: "1px solid #e0e0e0",
    display: "flex",
    gap: "10px"
  },
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    outline: "none"
  },
  button: {
    padding: "0 20px",
    background: "#27ae60",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "background 0.2s"
  }
};

export default function SharedRoomChat() {
  const { id } = useParams();
  const { userData } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===== تحميل الغرفة =====
  useEffect(() => {
    if (!id) return;

    const loadRoom = async () => {
      setLoading(true);

      const ref = doc(db, "sharedRooms", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setRoom({ id: snap.id, ...snap.data() });
      } else {
        setRoom(null);
      }

      setLoading(false);
    };

    loadRoom();
  }, [id]);

  // ===== الرسائل =====
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "sharedMessages"),
      where("roomId", "==", id),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(data);
    });

    return () => unsub();
  }, [id]);

  // ===== إرسال رسالة =====
  const sendMessage = async () => {
    if (!text.trim() || !userData) return;

    await addDoc(collection(db, "sharedMessages"), {
      roomId: id,
      text,
      senderId: userData.uid,
      senderName: userData.name || "مستخدم",
      officeId: userData.officeId,
      createdAt: serverTimestamp(),
    });

    setText("");
  };

  // ===== حالات التحميل =====
  if (loading) {
    return <div style={{ padding: 20, direction: "rtl" }}>جاري تحميل الغرفة...</div>;
  }

  if (!room) {
    return (
      <div style={{ padding: 20, color: "red", direction: "rtl" }}>
        ❌ الغرفة غير موجودة
      </div>
    );
  }

  if (!userData) {
    return <div style={{ padding: 20, direction: "rtl" }}>جاري تحميل المستخدم...</div>;
  }

  // ===== التحقق من العضوية =====
  const isMember =
    room.officeA === userData.officeId ||
    room.officeB === userData.officeId;

  if (!isMember) {
    return (
      <div style={{ padding: 20, color: "red", direction: "rtl" }}>
        ❌ غير مصرح لك بالدخول لهذه الغرفة
      </div>
    );
  }

  /* 💡 حساب الاسم الديناميكي للطرف الآخر لعرضه في الهيدر */
  const isOfficeA = room.officeA === userData?.officeId;
  const otherOfficeName = isOfficeA ? room.officeBName : room.officeAName;
  const displayName = otherOfficeName || (room.name !== "غرفة تعاون بين المكاتب" ? room.name : "مكتب خارجي متصل");

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={{ margin: 0, color: "#2c3e50" }}>🤝 {displayName}</h3>
        <p style={{ fontSize: "12px", color: "#27ae60", margin: 0, fontWeight: "bold" }}>
          ● قناة اتصال نشطة وآمنة مع المكتب الخارجي
        </p>
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
                background: isMe ? "#27ae60" : "#ffffff",
                color: isMe ? "#fff" : "#333",
                border: isMe ? "none" : "1px solid #e0e0e0",
                borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0"
              }}
            >
              <div style={{ fontSize: "11px", opacity: 0.7, fontWeight: "bold", marginBottom: "2px" }}>
                {msg.senderName}
              </div>
              <div style={{ fontSize: "14px", lineHeight: "1.4" }}>{msg.text}</div>
            </div>
          );
        })}
      </div>
      
      {/* Input */}
      <div style={styles.inputBox}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالة..."
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button onClick={sendMessage} style={styles.button}>
          إرسال
        </button>
      </div>
    </div>
  );
}