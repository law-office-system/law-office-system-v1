import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  doc, getDoc, getDocs,
} from "firebase/firestore";
import { ArrowLeft, Send, Reply, Trash2 } from "lucide-react";

// ===== Color Palette - Matching Sidebar (Gold + Dark) =====
const COLORS = {
  bg: "#0a0e1a",
  bgLight: "#111827",
  bgCard: "#1a1f2e",
  border: "rgba(212, 175, 55, 0.15)",
  gold: "#d4af37",
  goldLight: "#f0d878",
  goldDark: "#b8941f",
  goldBg: "rgba(212, 175, 55, 0.08)",
  goldBgActive: "rgba(212, 175, 55, 0.15)",
  text: "#e5e7eb",
  textMuted: "#6b7280",
  textDark: "#111827",
  myMsgBg: "linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))",
  myMsgBorder: "rgba(212, 175, 55, 0.3)",
  otherMsgBg: "#1a1f2e",
  otherMsgBorder: "rgba(255, 255, 255, 0.08)",
  inputBg: "#111827",
  sendBtn: "linear-gradient(135deg, #d4af37, #b8941f)",
  headerBg: "linear-gradient(135deg, #0a0e1a, #111827)",
};

export default function SharedRoomChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(true);

  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load room
  useEffect(() => {
    if (!id) return;
    const loadRoom = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "sharedRooms", id));
        setRoom(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadRoom();
  }, [id]);

  // Messages listener
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "sharedMessages"),
      where("roomId", "==", id),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const valid = data.filter(m => (m.text && m.text.trim()) || (m.fileUrl));
      setMessages(valid);
      valid.forEach(async (msg) => {
        if (msg.senderId !== userData?.uid && !msg.seenBy?.includes(userData?.uid)) {
          try { await updateDoc(doc(db, "sharedMessages", msg.id), { seenBy: [...(msg.seenBy || []), userData.uid] }); } catch {}
        }
      });
    }, console.error);
    return () => unsub();
  }, [id, userData?.uid]);

  // Typing listener
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "typing"), where("roomId", "==", id), where("userId", "!=", userData?.uid || ""));
    const unsub = onSnapshot(q, (snap) => setTypingUsers(snap.docs.map(d => d.data().userName)));
    return () => unsub();
  }, [id, userData?.uid]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && shouldScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, shouldScroll]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading]);

  const handleScroll = () => {
    if (!chatBoxRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBoxRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldScroll(isAtBottom);
  };

  const sendMessage = async () => {
    if (!text.trim() || !userData) return;
    const currentText = text.trim();
    setText(""); setReplyTo(null); setShouldScroll(true);
    try {
      const msgData = { roomId: id, text: currentText, senderId: userData.uid, senderName: userData.name || "مستخدم", officeId: userData.officeId, createdAt: serverTimestamp(), seenBy: [userData.uid] };
      if (replyTo) msgData.replyTo = { id: replyTo.id, text: replyTo.text, senderName: replyTo.senderName };
      await addDoc(collection(db, "sharedMessages"), msgData);
      await updateDoc(doc(db, "sharedRooms", id), { lastMessage: currentText, lastMessageAt: serverTimestamp() });
      await sendNotification(id, currentText, userData.name);
    } catch (err) { console.error(err); setText(currentText); }
  };

  const sendNotification = async (roomId, msgText, senderName) => {
    try {
      const roomSnap = await getDoc(doc(db, "sharedRooms", roomId));
      if (!roomSnap.exists()) return;
      const rData = roomSnap.data();
      const otherId = rData.officeA === userData.officeId ? rData.officeB : rData.officeA;
      const mq = query(collection(db, "users"), where("officeId", "==", otherId));
      const ms = await getDocs(mq);
      ms.docs.forEach(async (md) => {
        await addDoc(collection(db, "notifications"), { userId: md.data().uid, type: "shared_message", title: `رسالة من ${senderName}`, body: msgText.substring(0, 100), roomId, read: false, createdAt: serverTimestamp() });
      });
    } catch {}
  };

  const handleTyping = useCallback(() => {
    if (!id || !userData?.uid) return;
    const tRef = doc(db, "typing", `${id}_${userData.uid}`);
    updateDoc(tRef, { roomId: id, userId: userData.uid, userName: userData.name || "مستخدم", timestamp: serverTimestamp() }).catch(() => {
      addDoc(collection(db, "typing"), { roomId: id, userId: userData.uid, userName: userData.name || "مستخدم", timestamp: serverTimestamp() });
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => deleteDoc(doc(db, "typing", `${id}_${userData.uid}`)), 3000);
  }, [id, userData]);

  const deleteMessage = async (mid) => { if (!window.confirm("هل أنت متأكد؟")) return; await deleteDoc(doc(db, "sharedMessages", mid)); setSelectedMessage(null); };
  const handleReply = (m) => { setReplyTo(m); inputRef.current?.focus(); };
  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const formatTime = (ts) => { if (!ts) return ""; try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ""; } };
  const formatDate = (ts) => { if (!ts) return ""; try { return ts.toDate().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }); } catch { return ""; } };

  const grouped = messages.reduce((g, m) => {
    let d = 'unknown';
    try { d = m.createdAt?.toDate ? m.createdAt.toDate().toDateString() : new Date(m.createdAt).toDateString(); } catch {}
    if (!g[d]) g[d] = []; g[d].push(m); return g;
  }, {});

  if (loading) return <div style={centered}>⏳ جاري التحميل...</div>;
  if (!room) return <div style={centered}>❌ الغرفة غير موجودة</div>;
  if (!userData) return <div style={centered}>⏳ جاري التحميل...</div>;
  const isMember = room.officeA === userData.officeId || room.officeB === userData.officeId;
  if (!isMember) return <div style={centered}>❌ غير مصرح</div>;
  const otherName = (room.officeA === userData?.officeId ? room.officeBName : room.officeAName) || "غرفة تعاون";

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <div style={headerLeft}>
          {isMobile && <button onClick={() => navigate('/shared-rooms')} style={iconBtn} title="رجوع"><ArrowLeft size={20} /></button>}
          <div style={avatar}>{otherName.charAt(0).toUpperCase()}</div>
          <div style={headerInfo}>
            <h3 style={headerTitle}>{otherName}</h3>
            <p style={headerSub}>{room.status === 'accepted' ? '✅ متصل' : '⏳ قيد الانتظار'}</p>
          </div>
        </div>
        <span style={badge}>🤝 مشتركة</span>
      </div>

      {/* Messages */}
      <div style={chatBox} ref={chatBoxRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: '64px', opacity: 0.3 }}>💬</div>
            <span style={{ color: COLORS.textMuted, fontSize: '15px' }}>لا توجد رسائل بعد. ابدأ المحادثة!</span>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              {date !== 'unknown' && <div style={dateDiv}><span style={dateText}>{formatDate(msgs[0]?.createdAt)}</span></div>}
              {msgs.map((msg) => {
                const isMe = msg.senderId === userData.uid;
                const isSel = selectedMessage === msg.id;
                return (
                  <div key={msg.id} style={{ ...msgWrap, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                    {msg.replyTo && (
                      <div style={replyPrev}>
                        <span style={{ fontSize: 11, color: COLORS.gold, fontWeight: 'bold' }}>{msg.replyTo.senderName}</span>
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{msg.replyTo.text}</span>
                      </div>
                    )}
                    <div style={{ ...bubble, ...(isMe ? bubbleMe : bubbleOther) }} onClick={() => setSelectedMessage(isSel ? null : msg.id)}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, color: isMe ? COLORS.goldLight : COLORS.gold }}>{isMe ? "أنت" : msg.senderName}</div>
                      <div style={{ fontSize: 14.5, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.text}</div>
                      <div style={{ fontSize: 11, marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, color: isMe ? COLORS.goldLight : COLORS.textMuted }}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && <span>{msg.seenBy?.length > 1 ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                    {isSel && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, padding: '0 8px' }}>
                        <button onClick={() => handleReply(msg)} style={actBtn}><Reply size={14} /> رد</button>
                        {isMe && <button onClick={() => deleteMessage(msg.id)} style={actBtn}><Trash2 size={14} /> حذف</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {typingUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', alignSelf: 'flex-start', background: COLORS.bgCard, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.gold, animation: 'bounce 1.4s infinite', animationDelay: '0s' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.gold, animation: 'bounce 1.4s infinite', animationDelay: '0.2s' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.gold, animation: 'bounce 1.4s infinite', animationDelay: '0.4s' }} />
            </div>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{typingUsers.join(", ")} يكتب...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Bar */}
      {replyTo && (
        <div style={replyBar}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: COLORS.gold, fontWeight: 'bold' }}>↩️ رد على:</span>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{replyTo.text}</span>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 16 }}>✖</button>
        </div>
      )}

      {/* Input */}
      <div style={inputBox}>
        <input ref={inputRef} value={text} onChange={(e) => { setText(e.target.value); handleTyping(); }} onKeyDown={handleKeyDown} placeholder="اكتب رسالة..." style={input} />
        <button onClick={sendMessage} disabled={!text.trim()} style={{ ...sendBtn, opacity: text.trim() ? 1 : 0.5 }}>
          <Send size={20} />
        </button>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  );
}

/* ===== Styles matching Sidebar (Gold + Dark) ===== */
const container = { display: "flex", flexDirection: "column", height: "100%", background: COLORS.bg, color: COLORS.text, direction: "rtl", overflow: "hidden" };
const header = { padding: "12px 20px", background: COLORS.headerBg, borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, minHeight: "56px" };
const headerLeft = { display: "flex", alignItems: "center", gap: "12px" };
const iconBtn = { background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" };
const avatar = { width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #d4af37, #b8941f)", color: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", flexShrink: 0, boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)" };
const headerInfo = { display: "flex", flexDirection: "column", gap: "2px" };
const headerTitle = { margin: 0, fontSize: "16px", color: COLORS.gold, fontWeight: "700" };
const headerSub = { fontSize: "12px", color: COLORS.textMuted, margin: 0 };
const badge = { background: COLORS.goldBg, color: COLORS.gold, padding: "4px 12px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", border: `1px solid ${COLORS.border}` };
const chatBox = { flex: 1, padding: "16px", overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: "4px", scrollBehavior: "smooth", background: COLORS.bg };
const empty = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textMuted, gap: "12px" };
const dateDiv = { textAlign: 'center', margin: '12px 0' };
const dateText = { background: COLORS.bgCard, color: COLORS.textMuted, padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', border: `1px solid ${COLORS.border}` };
const msgWrap = { display: 'flex', flexDirection: 'column', maxWidth: '65%', position: 'relative', marginBottom: '4px' };
const bubble = { maxWidth: "100%", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "2px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", cursor: 'pointer', borderRadius: "14px 14px 14px 0px", position: 'relative', transition: "all 0.2s" };
const bubbleMe = { background: COLORS.goldBgActive, color: COLORS.text, borderRadius: "14px 14px 0px 14px", border: `1px solid ${COLORS.myMsgBorder}` };
const bubbleOther = { background: COLORS.otherMsgBg, color: COLORS.text, borderRadius: "14px 14px 14px 0px", border: `1px solid ${COLORS.otherMsgBorder}` };
const replyPrev = { background: COLORS.bgLight, padding: '6px 12px', borderRadius: '10px 10px 0 0', borderRight: `3px solid ${COLORS.gold}`, marginBottom: 2, display: 'flex', flexDirection: 'column', gap: '2px' };
const actBtn = { background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: 'pointer', fontSize: 12, padding: '6px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '4px', transition: "all 0.2s" };
const replyBar = { display: 'flex', alignItems: 'center', padding: '10px 16px', background: COLORS.bgLight, borderTop: `1px solid ${COLORS.border}`, gap: 10, flexShrink: 0 };
const inputBox = { padding: "12px 16px", background: COLORS.bgLight, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 };
const input = { flex: 1, padding: "12px 16px", borderRadius: "24px", border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontSize: "15px", outline: "none", transition: "all 0.2s" };
const sendBtn = { width: "48px", height: "48px", borderRadius: "50%", background: COLORS.sendBtn, color: "#0a0e1a", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(212, 175, 55, 0.3)" };
const centered = { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", fontSize: "16px", color: COLORS.textMuted, background: COLORS.bg, direction: "rtl" };