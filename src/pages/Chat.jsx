import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import ChatSidebar from "../components/chat/ChatSidebar";
import Messages from "../components/chat/Messages";
import RoomHeader from "../components/chat/RoomHeader";
import { listenToRoomMembers } from "../services/roomMembers";
import { useMessages } from "../hooks/useMessages";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
  writeBatch,
  limit,
} from "firebase/firestore";

// ===== Color Palette - Matching Sidebar (Gold + Dark) =====
const COLORS = {
  bg: "#0a0e1a",
  bgLight: "#111827",
  bgCard: "#1a1f2e",
  border: "rgba(212, 175, 55, 0.15)",
  gold: "#d4af37",
  goldLight: "#f0d878",
  text: "#e5e7eb",
  textMuted: "#6b7280",
};

// ✅ Loading Skeleton
function ChatSkeleton() {
  return (
    <div style={{ 
      display: "flex", 
      height: "100%", 
      justifyContent: "center", 
      alignItems: "center", 
      background: COLORS.bg, 
      color: COLORS.text 
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(212, 175, 55, 0.2)",
          borderTop: "3px solid #d4af37",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px"
        }} />
        <div>⏳ جاري تحميل البيانات...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function Chat() {
  const { userData } = useAuth();
  const { roomId } = useParams();

  const [rooms, setRooms] = useState([]);
  const [sharedRooms, setSharedRooms] = useState([]);
  const [officesMap, setOfficesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [canSend, setCanSend] = useState(true);
  const typingTimeoutRef = useRef(null);

  // ✅ Refs للـ cleanup
  const unsubscribersRef = useRef([]);
  const isMountedRef = useRef(true);

  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === roomId) || sharedRooms.find((r) => r.id === roomId) || null;
  }, [roomId, rooms, sharedRooms]);

  // ✅ استخدم الـ hook مع options
  const {
    messages,
    groupedMessages,
    text,
    setText,
    replyTo,
    setReplyTo,
    sending,
    sendMessage,
    deleteMessage,
    loading: messagesLoading,
    hasMore,
    loadMore,
  } = useMessages(roomId, activeRoom?.type, userData, {
    initialLimit: 50,
    paginationLimit: 30
  });

  // ✅ Cleanup function
  const cleanup = useCallback(() => {
    unsubscribersRef.current.forEach(unsub => {
      try { unsub(); } catch (e) { console.error("Cleanup error:", e); }
    });
    unsubscribersRef.current = [];
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  // ✅ Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 1024) setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ✅ Load offices (optimized - single query)
  useEffect(() => {
    if (!userData?.officeId) return;

    const unsub = onSnapshot(collection(db, "offices"), (snap) => {
      if (!isMountedRef.current) return;
      const map = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data().name || "مكتب";
      });
      setOfficesMap(map);
    }, (err) => {
      console.error("Error loading offices:", err);
    });

    unsubscribersRef.current.push(unsub);
    return () => unsub();
  }, [userData?.officeId]);

  // ✅ Load internal rooms (optimized with limit)
  useEffect(() => {
    if (!userData?.uid) { setLoading(false); return; }

    const q = query(collection(db, "roomMembers"), where("uid", "==", userData.uid));
    const unsub = onSnapshot(q, (snap) => {
      if (!isMountedRef.current) return;

      const roomIds = snap.docs.map(d => d.data().roomId);
      if (roomIds.length === 0) { setRooms([]); setLoading(false); return; }

      // ✅ Batch query with limit
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < roomIds.length; i += batchSize) {
        batches.push(roomIds.slice(i, i + batchSize));
      }

      let allRooms = [];
      let completed = 0;
      const batchUnsubscribes = [];

      batches.forEach((batch) => {
        const roomsQuery = query(
          collection(db, "rooms"), 
          where("__name__", "in", batch),
          limit(batchSize)
        );
        const unsubRoom = onSnapshot(roomsQuery, (roomSnap) => {
          if (!isMountedRef.current) return;
          const batchRooms = roomSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          allRooms = [...allRooms.filter(r => !batchRooms.find(br => br.id === r.id)), ...batchRooms];
          completed++;
          if (completed === batches.length) { 
            setRooms(allRooms); 
            setLoading(false); 
          }
        });
        batchUnsubscribes.push(unsubRoom);
        unsubscribersRef.current.push(unsubRoom);
      });

      return () => {
        unsub();
        batchUnsubscribes.forEach(u => {
          try { u(); } catch (e) {}
        });
      };
    });

    unsubscribersRef.current.push(unsub);
    return () => unsub();
  }, [userData?.uid]);

  // ✅ Load shared rooms (optimized)
  useEffect(() => {
    if (!userData?.officeId) return;

    const qA = query(
      collection(db, "sharedRooms"), 
      where("officeA", "==", userData.officeId),
      limit(20)
    );
    const qB = query(
      collection(db, "sharedRooms"), 
      where("officeB", "==", userData.officeId),
      limit(20)
    );

    const rooms = [];
    let completed = 0;

    const unsubA = onSnapshot(qA, (snapA) => { 
      if (!isMountedRef.current) return;
      rooms.push(...snapA.docs.map(d => ({ id: d.id, ...d.data() }))); 
      completed++; 
      if (completed === 2) {
        const unique = Array.from(new Map(rooms.map(item => [item.id, item])).values());
        setSharedRooms(unique);
      }
    });

    const unsubB = onSnapshot(qB, (snapB) => { 
      if (!isMountedRef.current) return;
      rooms.push(...snapB.docs.map(d => ({ id: d.id, ...d.data() }))); 
      completed++; 
      if (completed === 2) {
        const unique = Array.from(new Map(rooms.map(item => [item.id, item])).values());
        setSharedRooms(unique);
      }
    });

    unsubscribersRef.current.push(unsubA, unsubB);
    return () => { unsubA(); unsubB(); };
  }, [userData?.officeId]);

  // ✅ Role + canSend
  useEffect(() => {
    if (!activeRoom?.id || !userData?.uid) { setMyRole(null); setCanSend(true); return; }
    const unsub = listenToRoomMembers(activeRoom.id, (members) => { 
      if (!isMountedRef.current) return;
      const me = members.find((m) => m.uid === userData.uid); 
      setMyRole(me?.role || null);
      setCanSend(me?.canSend !== false);
    });
    unsubscribersRef.current.push(unsub);
    return () => {
      try { unsub?.(); } catch (e) {}
    };
  }, [activeRoom?.id, userData?.uid]);

  // ✅ Typing indicator (optimized with debounce cleanup)
  useEffect(() => {
    if (!activeRoom?.id || !userData?.uid) return;

    const typingRef = collection(db, "typing");
    const q = query(
      typingRef,
      where("roomId", "==", activeRoom.id),
      where("userId", "!=", userData.uid),
      limit(5)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!isMountedRef.current) return;
      const users = snap.docs.map(d => d.data().userName);
      setTypingUsers(users);
    });

    unsubscribersRef.current.push(unsub);
    return () => unsub();
  }, [activeRoom?.id, userData?.uid]);

  // ✅ Handle typing (with cleanup)
  const handleTyping = useCallback(() => {
    if (!activeRoom?.id || !userData?.uid) return;

    const typingDocRef = doc(db, "typing", `${activeRoom.id}_${userData.uid}`);
    updateDoc(typingDocRef, {
      roomId: activeRoom.id,
      userId: userData.uid,
      userName: userData.name || "مستخدم",
      timestamp: serverTimestamp(),
    }).catch(() => {
      addDoc(collection(db, "typing"), {
        roomId: activeRoom.id,
        userId: userData.uid,
        userName: userData.name || "مستخدم",
        timestamp: serverTimestamp(),
      });
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      deleteDoc(doc(db, "typing", `${activeRoom.id}_${userData.uid}`)).catch(() => {});
    }, 3000);
  }, [activeRoom?.id, userData]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const handleRoomSelect = () => { if (isMobile) setSidebarOpen(false); };

  // ✅ Send with notification (optimized batch)
  const handleSend = useCallback(async () => {
    if (!text.trim() || !canSend || sending) return;

    const messageText = text.trim();
    const success = await sendMessage();

    if (success && activeRoom) {
      try {
        const membersQuery = query(
          collection(db, "roomMembers"),
          where("roomId", "==", activeRoom.id),
          limit(50)
        );
        const membersSnap = await getDocs(membersQuery);

        const batch = writeBatch(db);
        let count = 0;
        membersSnap.docs.forEach((memberDoc) => {
          const memberData = memberDoc.data();
          if (memberData.uid !== userData?.uid) {
            const notifRef = doc(collection(db, "notifications"));
            batch.set(notifRef, {
              userId: memberData.uid,
              type: "message",
              title: `رسالة جديدة من ${userData?.name || "مستخدم"}`,
              body: messageText.substring(0, 100),
              roomId: activeRoom.id,
              roomType: activeRoom.type,
              read: false,
              createdAt: serverTimestamp(),
            });
            count++;
          }
        });

        if (count > 0) await batch.commit();
      } catch (err) {
        console.error("Error sending notification:", err);
      }
    }
  }, [text, canSend, sending, sendMessage, activeRoom, userData]);

  // ✅ Component cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  if (loading) {
    return <ChatSkeleton />;
  }

  return (
    <div style={containerStyle}>
      <ChatSidebar 
        rooms={rooms} 
        sharedRooms={sharedRooms} 
        officesMap={officesMap}
        userOfficeId={userData?.officeId}
        activeRoomId={roomId}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onRoomSelect={handleRoomSelect}
      />

      <div style={contentStyle}>
        {activeRoom ? (
          <>
            <div style={headerContainerStyle}>
              <RoomHeader 
                room={activeRoom} 
                userData={userData} 
                onMenuToggle={toggleSidebar}
                isSidebarOpen={sidebarOpen}
                isMobile={isMobile}
              />
            </div>

            <div style={messagesContainerStyle}>
              <Messages 
                messages={messages}
                groupedMessages={groupedMessages}
                text={text}
                setText={setText}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                sending={sending}
                onSend={handleSend}
                onDelete={deleteMessage}
                currentUser={userData}
                typingUsers={typingUsers}
                canSend={canSend}
                loading={messagesLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            </div>
          </>
        ) : (
          <div style={welcomeStyle}>
            <div style={welcomeIconStyle}>💬</div>
            <h2 style={welcomeTitleStyle}>مرحباً بك في نظام المحادثات</h2>
            <p style={welcomeTextStyle}>اختر غرفة محادثة من القائمة الجانبية للبدء</p>
            <div style={welcomeStatsStyle}>
              <div style={statStyle}>
                <span style={statNumberStyle}>{rooms.length}</span>
                <span style={statLabelStyle}>غرف داخلية</span>
              </div>
              <div style={statStyle}>
                <span style={statNumberStyle}>{sharedRooms.length}</span>
                <span style={statLabelStyle}>غرف مشتركة</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const containerStyle = { display: "flex", height: "100%", overflow: "hidden", background: COLORS.bg };
const contentStyle = { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 };
const headerContainerStyle = { flexShrink: 0, background: COLORS.bgLight, borderBottom: `1px solid ${COLORS.border}` };
const messagesContainerStyle = { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" };
const welcomeStyle = { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: COLORS.bg, padding: '40px' };
const welcomeIconStyle = { fontSize: '64px', marginBottom: '20px', opacity: 0.5 };
const welcomeTitleStyle = { margin: '0 0 10px 0', color: COLORS.gold, fontSize: '24px', fontWeight: 'bold' };
const welcomeTextStyle = { margin: '0 0 30px 0', color: COLORS.textMuted, fontSize: '16px' };
const welcomeStatsStyle = { display: 'flex', gap: '30px' };
const statStyle = { textAlign: 'center', padding: '20px 30px', background: COLORS.bgCard, borderRadius: '12px', border: `1px solid ${COLORS.border}` };
const statNumberStyle = { display: 'block', fontSize: '32px', fontWeight: 'bold', color: COLORS.gold };
const statLabelStyle = { fontSize: '14px', color: COLORS.textMuted };
