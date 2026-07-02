import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export default function SharedRooms() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [sharedRooms, setSharedRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.officeId) return;

    // جلب الغرف المشتركة التي يكون المكتب طرفاً فيها
    const qA = query(
      collection(db, "sharedRooms"),
      where("officeA", "==", userData.officeId)
    );
    const qB = query(
      collection(db, "sharedRooms"),
      where("officeB", "==", userData.officeId)
    );

    const rooms = [];
    let completed = 0;

    const unsubA = onSnapshot(qA, (snapA) => {
      const docsA = snapA.docs.map(d => ({ id: d.id, ...d.data() }));
      rooms.push(...docsA);
      completed++;
      if (completed === 2) {
        const unique = Array.from(new Map(rooms.map(item => [item.id, item])).values());
        setSharedRooms(unique);
        setLoading(false);
      }
    });

    const unsubB = onSnapshot(qB, (snapB) => {
      const docsB = snapB.docs.map(d => ({ id: d.id, ...d.data() }));
      rooms.push(...docsB);
      completed++;
      if (completed === 2) {
        const unique = Array.from(new Map(rooms.map(item => [item.id, item])).values());
        setSharedRooms(unique);
        setLoading(false);
      }
    });

    return () => {
      unsubA();
      unsubB();
    };
  }, [userData?.officeId]);

  const handleAccept = async (roomId) => {
    const ref = doc(db, "sharedRooms", roomId);
    await updateDoc(ref, {
      status: "accepted",
      lastMessage: "🤝 تم قبول طلب الاتصال، وقناة الربط آمنة الآن.",
    });
  };

  const handleReject = async (roomId) => {
    if (!window.confirm("هل أنت متأكد من رفض وحذف هذا الاتصال؟")) return;
    await deleteDoc(doc(db, "sharedRooms", roomId));
  };

  const handleEnterChat = (roomId) => {
    navigate(`/shared-rooms/${roomId}`);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>⏳ جاري تحميل الغرف المشتركة...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🤝 الغرف المشتركة</h2>
        <button 
          onClick={() => navigate('/office/connections')}
          style={styles.newBtn}
        >
          ➕ طلب اتصال جديد
        </button>
      </div>

      {sharedRooms.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📭</div>
          <h3>لا توجد غرف مشتركة</h3>
          <p>يمكنك إرسال طلب اتصال لمكتب آخر من خلال صفحة "إدارة الاتصالات"</p>
          <button 
            onClick={() => navigate('/office/connections')}
            style={styles.emptyBtn}
          >
            الذهاب لإدارة الاتصالات
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {sharedRooms.map((room) => {
            const isOfficeA = room.officeA === userData?.officeId;
            const otherOfficeName = isOfficeA ? room.officeBName : room.officeAName;
            const isPending = room.status === "pending";
            const isIncoming = isPending && !isOfficeA;

            return (
              <div key={room.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.officeInfo}>
                    <div style={styles.avatar}>
                      {otherOfficeName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <h3 style={styles.officeName}>{otherOfficeName || "مكتب خارجي"}</h3>
                      <span style={{
                        ...styles.status,
                        ...(isPending ? styles.pending : styles.accepted)
                      }}>
                        {isPending ? "⏳ قيد الانتظار" : "✅ متصل"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <p style={styles.lastMessage}>
                    💬 {room.lastMessage || "لا توجد رسائل بعد"}
                  </p>
                  {room.lastMessageAt && (
                    <span style={styles.time}>
                      آخر رسالة: {formatTime(room.lastMessageAt)}
                    </span>
                  )}
                </div>

                <div style={styles.cardFooter}>
                  {isPending ? (
                    <>
                      {isIncoming ? (
                        <div style={styles.actions}>
                          <button 
                            onClick={() => handleAccept(room.id)}
                            style={styles.acceptBtn}
                          >
                            ✅ قبول
                          </button>
                          <button 
                            onClick={() => handleReject(room.id)}
                            style={styles.rejectBtn}
                          >
                            ❌ رفض
                          </button>
                        </div>
                      ) : (
                        <span style={styles.waiting}>⏳ في انتظار القبول...</span>
                      )}
                    </>
                  ) : (
                    <button 
                      onClick={() => handleEnterChat(room.id)}
                      style={styles.chatBtn}
                    >
                      💬 فتح المحادثة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "الآن";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} دقيقة`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعة`;
  return date.toLocaleDateString('ar-EG');
}

const styles = {
  container: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e0e0e0',
  },
  title: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '24px',
  },
  newBtn: {
    padding: '10px 20px',
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '2px dashed #ddd',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  emptyBtn: {
    marginTop: '20px',
    padding: '12px 24px',
    background: '#2c3e50',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    padding: '20px',
    background: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
  },
  officeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  officeName: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    color: '#2c3e50',
  },
  status: {
    fontSize: '12px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  pending: {
    background: '#fef3c7',
    color: '#d97706',
  },
  accepted: {
    background: '#dcfce7',
    color: '#15803d',
  },
  cardBody: {
    padding: '15px 20px',
  },
  lastMessage: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#555',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  time: {
    fontSize: '12px',
    color: '#999',
  },
  cardFooter: {
    padding: '15px 20px',
    borderTop: '1px solid #e0e0e0',
    background: '#fafafa',
  },
  actions: {
    display: 'flex',
    gap: '10px',
  },
  acceptBtn: {
    flex: 1,
    padding: '8px',
    background: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  rejectBtn: {
    flex: 1,
    padding: '8px',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  waiting: {
    color: '#999',
    fontSize: '13px',
    textAlign: 'center',
    display: 'block',
  },
  chatBtn: {
    width: '100%',
    padding: '10px',
    background: '#2c3e50',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};