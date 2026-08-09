import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { CASE_STATUS } from "../constants/caseStatus";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function EditCase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clientNames, setClientNames] = useState({});
  const [allClients, setAllClients] = useState([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [form, setForm] = useState({
    caseName: "",
    caseNumber: "",
    caseYear: "",
    caseType: "",
    court: "",
    department: "",
    secretary: "",
    status: CASE_STATUS.ACTIVE,
    caseSubject: "",
    clients: [],
    opponents: [],
  });

  useEffect(() => {
    const fetchCaseAndClients = async () => {
      try {
        const snap = await getDoc(doc(db, "cases", id));
        if (userData?.officeId) {
          const clientsQuery = query(collection(db, "clientProfiles"), where("officeId", "==", userData.officeId));
          const clientsSnap = await getDocs(clientsQuery);
          setAllClients(clientsSnap.docs.map(d => ({ id: d.id, fullName: d.data().fullName })));
        }

        if (snap.exists()) {
          const data = snap.data();
          let normalizedClients = Array.isArray(data.clients) ? data.clients.map(c => typeof c === "string" ? { id: c, caseRole: "مدعي" } : { id: c.id || "", caseRole: c.caseRole || "" }) : [];

          const namesMap = {};
          const clientIds = normalizedClients.map(c => c.id).filter(Boolean);
          if (clientIds.length > 0) {
            const q = query(collection(db, "clientProfiles"), where(documentId(), "in", clientIds));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => { namesMap[docSnap.id] = docSnap.data().fullName || "موكل"; });
            setClientNames(namesMap);
          }

          setForm({
            caseName: data.caseName || "",
            caseNumber: data.caseNumber || data.caseSerial || "",
            caseYear: data.caseYear || "",
            caseType: data.caseType || "",
            court: data.court || "",
            department: data.department || "",
            secretary: data.secretary || "",
            status: data.status || CASE_STATUS.ACTIVE,
            caseSubject: data.caseSubject || data.notes || "",
            clients: normalizedClients,
            opponents: Array.isArray(data.opponents) ? data.opponents : [],
          });
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchCaseAndClients();
  }, [id, userData]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addClient = (clientId) => {
    if (form.clients.some((c) => c.id === clientId)) return;
    setForm(p => ({ ...p, clients: [...p.clients, { id: clientId, caseRole: "مدعي" }] }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "cases", id), { ...form, updatedAt: new Date() });
    alert("تم تحديث القضية بنجاح");
    navigate(`/case/${id}`);
  };

  if (loading) return <h2>جاري التحميل...</h2>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        {form.caseName ? `✏️ ${form.caseName}` : "✏️ تعديل بيانات القضية"}
      </h1>
      <form onSubmit={handleUpdate}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🏛️ البيانات القضائية</h3>
          <div style={styles.grid}>
            {/* ❌ حُذف حقل caseName من هنا */}
            <input name="caseNumber" value={form.caseNumber} onChange={handleChange} placeholder="رقم القضية" style={styles.input} />
            <input name="caseYear" value={form.caseYear} onChange={handleChange} placeholder="السنة" style={styles.input} />
            <input name="caseType" value={form.caseType} onChange={handleChange} placeholder="نوع الدعوى" style={styles.input} />
            <input name="court" value={form.court} onChange={handleChange} placeholder="المحكمة" style={styles.input} />
            <input name="department" value={form.department} onChange={handleChange} placeholder="الدائرة" style={styles.input} />
            <input name="secretary" value={form.secretary} onChange={handleChange} placeholder="السكرتير" style={styles.input} />
            <select name="status" value={form.status} onChange={handleChange} style={styles.input}>
              <option value={CASE_STATUS.ACTIVE}>نشطة</option>
              <option value={CASE_STATUS.EXECUTION}>تنفيذ</option>
              <option value={CASE_STATUS.CLOSED}>منتهية</option>
            </select>
          </div>
        </div>

        {/* ✅ عنوان القضية + موضوع الدعوى مجتمعان */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📝 موضوع الدعوى</h3>
          <input
            name="caseName"
            value={form.caseName}
            onChange={handleChange}
            placeholder="عنوان القضية (اسم القضية)"
            style={{ ...styles.input, width: "100%", marginBottom: 12, fontWeight: 600, boxSizing: "border-box" }}
          />
          <textarea
            name="caseSubject"
            value={form.caseSubject}
            onChange={handleChange}
            placeholder="موضوع الدعوى"
            style={styles.textarea}
          />
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>👤 الموكلون</h3>
          <button type="button" onClick={() => setShowSearch(!showSearch)} style={styles.addBtn}>{showSearch ? "إخفاء القائمة" : "➕ إضافة موكل من المكتب"}</button>
          {showSearch && (
            <div style={styles.searchBox}>
              <input placeholder="🔍 ابحث عن موكل بالاسم..." onChange={(e) => setSearch(e.target.value)} style={{...styles.input, marginBottom: 10}} />
              <div style={styles.scrollList}>
                {allClients.filter(c => c.fullName.includes(search)).map(c => (
                  <div key={c.id} style={styles.searchRow}>
                    <span>{c.fullName}</span>
                    <button type="button" onClick={() => addClient(c.id)} style={styles.addSmallBtn}>إضافة</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {form.clients.map(c => (
            <div key={c.id} style={styles.row}>
              <span style={{flex: 1, fontWeight: 'bold'}}>{clientNames[c.id]}</span>
              <input value={c.caseRole} onChange={(e) => setForm(p => ({...p, clients: p.clients.map(cl => cl.id === c.id ? {...cl, caseRole: e.target.value} : cl)}))} placeholder="الصفة القانونية" style={styles.input} />
              <button type="button" onClick={() => setForm(p => ({...p, clients: p.clients.filter(cl => cl.id !== c.id)}))} style={styles.delBtn}>🗑️</button>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>⚔️ الخصوم</h3>
          <button type="button" onClick={() => setForm(p => ({...p, opponents: [...p.opponents, {id: Date.now().toString(), name: "", caseRole: "", address: ""}]}))} style={styles.addBtn}>➕ إضافة خصم</button>
          {form.opponents.map(o => (
            <div key={o.id} style={styles.opponentRow}>
              <input value={o.name} onChange={(e) => setForm(p => ({...p, opponents: p.opponents.map(op => op.id === o.id ? {...op, name: e.target.value} : op)}))} placeholder="اسم الخصم" style={styles.input} />
              <input value={o.caseRole} onChange={(e) => setForm(p => ({...p, opponents: p.opponents.map(op => op.id === o.id ? {...op, caseRole: e.target.value} : op)}))} placeholder="الصفة" style={styles.input} />
              <input value={o.address} onChange={(e) => setForm(p => ({...p, opponents: p.opponents.map(op => op.id === o.id ? {...op, address: e.target.value} : op)}))} placeholder="العنوان" style={styles.input} />
              <button type="button" onClick={() => setForm(p => ({...p, opponents: p.opponents.filter(op => op.id !== o.id)}))} style={styles.delBtn}>🗑️</button>
            </div>
          ))}
        </div>
        <button type="submit" style={styles.saveBtn}>💾 حفظ كافة التعديلات</button>
      </form>
    </div>
  );
}

const styles = {
  container: { maxWidth: 900, margin: 'auto', padding: 10, direction: 'rtl', fontFamily: 'system-ui' },
  title: { color: '#1e3a8a', textAlign: 'center' },
  section: { background: '#fff', padding: 15, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 15, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  sectionTitle: { fontSize: 16, marginBottom: 10, borderBottom: '2px solid #e2e8f0', paddingBottom: 5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 },
  input: { padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' },
  textarea: { width: '100%', height: 100, marginTop: 10, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  addBtn: { background: '#059669', color: '#fff', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer', marginBottom: 10 },
  addSmallBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: 4, borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  searchBox: { border: '1px solid #cbd5e1', padding: 10, marginBottom: 10, borderRadius: 8, background: '#f8fafc' },
  scrollList: { maxHeight: 200, overflowY: 'auto', borderTop: '1px solid #eee' },
  searchRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  opponentRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 8, background: '#f1f5f9', padding: 8, borderRadius: 6 },
  delBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' },
  saveBtn: { width: '100%', padding: 15, background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 'bold' }
};