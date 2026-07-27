import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function OfficeConnections() {
  const { userData } = useAuth();
  const [connections, setConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // تم تغيير الاسم ليعبر عن صيغة البحث العامة
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);

  // ===== 1️⃣ جلب طلبات الاتصال (الواردة والصادرة) =====
  useEffect(() => {
    if (!userData?.officeId) return;

    const qA = query(collection(db, "sharedRooms"), where("officeA", "==", userData.officeId));
    const qB = query(collection(db, "sharedRooms"), where("officeB", "==", userData.officeId));

    const unsubA = onSnapshot(qA, (snapA) => {
      const docsA = snapA.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const unsubB = onSnapshot(qB, (snapB) => {
        const docsB = snapB.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const all = [...docsA, ...docsB].filter(
          (value, index, self) => self.findIndex(t => t.id === value.id) === index
        );
        setConnections(all);
      });
    });

    return () => {
      unsubA();
    };
  }, [userData?.officeId]);

  // ===== 2️⃣ دالة البحث الشامل (إيميل / اسم مكتب / اسم مدير / رقم هاتف) =====
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchError("");
    setSearchResult(null);

    const queryText = searchQuery.trim();

    try {
      // أ. محاولة أولى: البحث عن طريق البريد الإلكتروني
      let q = query(collection(db, "users"), where("email", "==", queryText), where("role", "==", "admin"));
      let snap = await getDocs(q);

      // ب. محاولة ثانية: البحث عن طريق اسم المكتب
      if (snap.empty) {
        q = query(collection(db, "users"), where("officeName", "==", queryText), where("role", "==", "admin"));
        snap = await getDocs(q);
      }

      // ج. محاولة ثالثة: البحث عن طريق اسم المدير الشخصي
      if (snap.empty) {
        q = query(collection(db, "users"), where("name", "==", queryText), where("role", "==", "admin"));
        snap = await getDocs(q);
      }

      // د. محاولة رابعة: البحث عن طريق رقم الهاتف (سواء سُجل كـ phone أو phoneNum حسب حقول قاعدة بياناتك)
      if (snap.empty) {
        q = query(collection(db, "users"), where("phone", "==", queryText), where("role", "==", "admin"));
        snap = await getDocs(q);
      }
      
      // هـ. محاولة احتياطية لرقم الهاتف إذا كان اسم الحقل بمشروعك phoneNumber
      if (snap.empty) {
        q = query(collection(db, "users"), where("phoneNumber", "==", queryText), where("role", "==", "admin"));
        snap = await getDocs(q);
      }

      // فحص النتيجة النهائية بعد استنفاد خيارات البحث
      if (snap.empty) {
        setSearchError("❌ لم نجد أي مكتب يطابق هذه البيانات (إيميل، اسم، أو رقم هاتف)");
      } else {
        const targetUser = snap.docs[0].data();
        if (targetUser.officeId === userData.officeId) {
          setSearchError("🛑 لا يمكنك إرسال طلب اتصال لمكتبك الحالي!");
        } else {
          setSearchResult(targetUser);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("❌ حدث خطأ أثناء عملية البحث");
    } finally {
      setLoading(false);
    }
  };

  // ===== 3️⃣ إرسال طلب تواصل جديد =====
  const sendRequest = async () => {
    if (!searchResult || !userData) return;

    const alreadyExists = connections.some(
      c => c.officeA === searchResult.officeId || c.officeB === searchResult.officeId
    );

    if (alreadyExists) {
      setSearchError("🤝 هناك طلب أو اتصال قائم بالفعل مع هذا المكتب!");
      return;
    }

    await addDoc(collection(db, "sharedRooms"), {
      officeA: userData.officeId,
      officeAName: userData.officeName || userData.name || "مكتب أ",
      officeB: searchResult.officeId,
      officeBName: searchResult.officeName || searchResult.name || "مكتب ب",
      status: "pending",
      name: "غرفة تعاون بين المكاتب",
      createdAt: serverTimestamp(),
      lastMessage: "تم إرسال طلب اتصال جديد..."
    });

    setSearchQuery("");
    setSearchResult(null);
    alert("🚀 تم إرسال طلب الاتصال بنجاح!");
  };

  // ===== 4️⃣ قبول طلب التواصل الوارد =====
  const acceptRequest = async (roomId) => {
    const ref = doc(db, "sharedRooms", roomId);
    await updateDoc(ref, {
      status: "accepted",
      lastMessage: "🤝 تم قبول طلب الاتصال، وقناة الربط آمنة الآن."
    });
    alert("✅ تم قبول الاتصال بنجاح!");
  };

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto", direction: "rtl", fontFamily: "sans-serif" }}>
      
      <h2 style={{ color: "#2c3e50", borderBottom: "2px solid #27ae60", paddingBottom: "10px" }}>
        🤝 إدارة اتصالات المكاتب الخارجية
      </h2>

      {/* ===== نموذج إرسال طلب جديد ===== */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "30px", border: "1px solid #e0e0e0" }}>
        <h4 style={{ margin: "0 0 15px 0", color: "#34495e" }}>🔍 إرسال طلب ربط لمكتب جديد</h4>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="ابحث بالإيميل، اسم المكتب، اسم المدير، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}
          />
          <button type="submit" style={{ padding: "10px 20px", background: "#2c3e50", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "جاري البحث..." : "بحث"}
          </button>
        </form>

        {searchError && <p style={{ color: "red", fontSize: "13px", marginTop: "10px", fontWeight: "bold" }}>{searchError}</p>}

        {searchResult && (
          <div style={{ marginTop: "15px", padding: "15px", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0", display: "flex", justifyProject: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ color: "#166534", fontSize: "15px" }}>🏢 {searchResult.officeName || "مكتب متاح"}</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#555" }}>👨‍💼 المدير: {searchResult.name}</p>
              {(searchResult.phone || searchResult.phoneNumber) && (
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#27ae60", fontWeight: "500" }}>
                  📞 الهاتف: {searchResult.phone || searchResult.phoneNumber}
                </p>
              )}
            </div>
            <button onClick={sendRequest} style={{ padding: "8px 16px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              إرسال طلب ربط
            </button>
          </div>
        )}
      </div>

      {/* ===== قائمة الطلبات والاتصالات الحالية ===== */}
      <h3 style={{ color: "#2c3e50", marginBottom: "15px" }}>📋 طلبات وقنوات الاتصال الحالية</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {connections.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #eee" }}>
            لا توجد طلبات اتصال واردة أو صادرة حالياً.
          </p>
        ) : (
          connections.map((item) => {
            const isSentByMe = item.officeA === userData?.officeId;
            const otherOfficeName = isSentByMe ? item.officeBName : item.officeAName;

            return (
              <div
                key={item.id}
                style={{
                  background: "#ffffff",
                  padding: "15px 20px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}
              >
                <div>
                  <strong style={{ fontSize: "16px", color: "#2c3e50" }}>🏢 {otherOfficeName}</strong>
                  <div style={{ marginTop: "5px" }}>
                    {item.status === "pending" ? (
                      <span style={{ fontSize: "12px", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold", background: isSentByMe ? "#fef3c7" : "#dbeafe", color: isSentByMe ? "#d97706" : "#1d4ed8" }}>
                        {isSentByMe ? "⏳ طلب صادر (في انتظار قبوله)" : "📩 طلب وارد (بحاجة لموافقتك)"}
                      </span>
                    ) : (
                      <span style={{ fontSize: "12px", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold", background: "#dcfce7", color: "#15803d" }}>
                        ✅ متصل (قناة نشطة)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {item.status === "pending" && !isSentByMe && (
                    <button
                      onClick={() => acceptRequest(item.id)}
                      style={{ padding: "8px 16px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      قبول الطلب وتفعيل الربط
                    </button>
                  )}
                  {item.status === "accepted" && (
                    <span style={{ color: "#27ae60", fontWeight: "bold", fontSize: "14px" }}>🔒 الرابط مؤمن</span>
                  )}
                  {item.status === "pending" && isSentByMe && (
                    <span style={{ color: "#999", fontSize: "13px" }}>قيد الانتظار...</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}