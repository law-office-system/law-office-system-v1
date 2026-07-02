import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, getDoc, getDocs, where, documentId } from 'firebase/firestore';
import AdminTaskCard from '../components/case/AdminTaskCard';
import AdminTaskForm from '../components/case/AdminTaskForm';

export default function AdminTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [casesMap, setCasesMap] = useState({});
  const [clientNamesCache, setClientNamesCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    const q = query(collection(db, 'adminTasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const uniqueCaseIds = [...new Set(tasks.map(t => t.caseId).filter(Boolean))];
    const fetchCases = async () => {
      const newCasesMap = {};
      for (const caseId of uniqueCaseIds) {
        if (caseId && caseId !== 'general' && !casesMap[caseId]) {
          try {
            const caseDoc = await getDoc(doc(db, 'cases', caseId));
            if (caseDoc.exists()) newCasesMap[caseId] = caseDoc.data();
          } catch (err) { console.error('Error fetching case:', caseId, err); }
        }
      }
      if (Object.keys(newCasesMap).length > 0) setCasesMap(prev => ({ ...prev, ...newCasesMap }));
    };
    if (uniqueCaseIds.length > 0) fetchCases();
  }, [tasks]);

  useEffect(() => {
    if (Object.keys(casesMap).length === 0) return;
    const fetchClientNames = async () => {
      const allClientIds = new Set();
      Object.values(casesMap).forEach((c) => {
        if (Array.isArray(c.clients)) {
          c.clients.forEach((clientItem) => {
            const idStr = typeof clientItem === 'object' ? clientItem.id : clientItem;
            if (idStr) allClientIds.add(idStr);
          });
        }
      });
      const idsArray = Array.from(allClientIds).filter(Boolean);
      if (idsArray.length === 0) return;
      const newCache = { ...clientNamesCache };
      for (let i = 0; i < idsArray.length; i += 30) {
        const chunk = idsArray.slice(i, i + 30);
        const q = query(collection(db, 'clientProfiles'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach((doc) => { newCache[doc.id] = doc.data().fullName || 'موكل'; });
      }
      setClientNamesCache(newCache);
    };
    fetchClientNames();
  }, [casesMap]);

  const handleDelete = async (id) => {
    try { await deleteDoc(doc(db, 'adminTasks', id)); } catch (err) { alert('حدث خطأ أثناء الحذف'); }
  };

  const handleToggleStatus = async (id, newStatus) => {
    try { await updateDoc(doc(db, 'adminTasks', id), { status: newStatus }); } catch (err) { alert('حدث خطأ أثناء تحديث الحالة'); }
  };

  const getClientName = (caseData) => {
    if (!caseData || !Array.isArray(caseData.clients) || caseData.clients.length === 0) return '';
    const firstClient = caseData.clients[0];
    const clientId = typeof firstClient === 'object' ? firstClient.id : firstClient;
    return clientNamesCache[clientId] || '';
  };

  const getCaseDisplayName = (caseData) => {
    if (!caseData) return '';
    const clientName = getClientName(caseData);
    if (caseData.caseNumber && caseData.caseYear) return `قضية رقم ${caseData.caseNumber} / ${caseData.caseYear}${clientName ? ' - ' + clientName : ''}`;
    if (caseData.caseSerial && caseData.caseYear) return `قضية رقم ${caseData.caseSerial} / ${caseData.caseYear}${clientName ? ' - ' + clientName : ''}`;
    if (clientName) return clientName;
    if (caseData.court) return `محكمة ${caseData.court}`;
    if (caseData.caseNumber) return `قضية رقم ${caseData.caseNumber}`;
    if (caseData.caseSerial) return `قضية رقم ${caseData.caseSerial}`;
    return 'قضية بدون اسم';
  };

  const getCaseInfo = (caseId) => {
    if (!caseId || caseId === 'general') return null;
    const caseData = casesMap[caseId];
    if (!caseData) return { title: 'جاري التحميل...', number: '' };
    return { title: getCaseDisplayName(caseData), number: caseData.caseNumber || caseData.number || caseData.caseSerial || '' };
  };

  const filteredTasks = tasks.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const caseData = casesMap[t.caseId];
    const caseTitle = getCaseDisplayName(caseData);
    const caseNumber = caseData?.caseNumber || caseData?.number || '';
    const clientName = getClientName(caseData);
    const matchesSearch = !searchTerm || 
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length,
  };

  const filterOptions = [
    { value: 'all', label: 'الكل', icon: null },
    { value: 'pending', label: 'معلقة', icon: Circle, color: '#fbbf24' },
    { value: 'in-progress', label: 'قيد التنفيذ', icon: Clock, color: '#60a5fa' },
    { value: 'completed', label: 'منجزة', icon: CheckCircle2, color: '#4ade80' },
  ];

  const statCards = [
    { label: 'الإجمالي', value: stats.total, color: '#9ca3af', bg: 'rgba(75, 85, 99, 0.3)', icon: ClipboardList },
    { label: 'معلقة', value: stats.pending, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', icon: Circle },
    { label: 'قيد التنفيذ', value: stats.inProgress, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', icon: Clock },
    { label: 'منجزة', value: stats.completed, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)', icon: CheckCircle2 },
    { label: 'متأخرة', value: stats.overdue, color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', icon: AlertCircle },
  ];

  return (
    <div style={styles.page} className="admin-tasks-page">
      <div style={styles.header} className="admin-tasks-header">
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}><ClipboardList color="#4ade80" size={24} strokeWidth={2.5} /></div>
          <div>
            <h1 style={styles.headerTitle}>الأعمال الإدارية</h1>
            <p style={styles.headerSubtitle}>متابعة وإدارة الأعمال الإدارية</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditingTask(null); setShowForm(true); }} style={styles.addBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <Plus size={18} /> إضافة عمل
          </button>
        )}
      </div>

      <div style={styles.statsGrid} className="admin-tasks-stats-grid">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} style={{ ...styles.statCard, borderColor: stat.color + '30' }}>
              <div style={{ ...styles.statIcon, background: stat.bg }}>{Icon && <Icon size={20} color={stat.color} strokeWidth={2.5} />}</div>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.controls} className="admin-tasks-controls">
        <div style={styles.filterGroup} className="admin-tasks-filter-group">
          {filterOptions.map(opt => {
            const Icon = opt.icon;
            const isActive = filter === opt.value;
            return (
              <button key={opt.value} onClick={() => setFilter(opt.value)}
                style={{ ...styles.filterBtn, ...(isActive ? styles.filterBtnActive : styles.filterBtnInactive) }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(55, 65, 81, 0.5)'; e.currentTarget.style.color = '#e5e7eb'; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; } }}>
                {Icon && <Icon size={14} color={isActive ? '#fff' : opt.color} />}{opt.label}
              </button>
            );
          })}
        </div>

        <div style={styles.searchBox} className="admin-tasks-search-box">
          <Search size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="البحث في الأعمال أو القضايا..." style={styles.searchInput} />
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}><div style={styles.spinner} /></div>
      ) : filteredTasks.length === 0 ? (
        <div style={styles.emptyCard}>
          <ClipboardList size={64} color="#374151" strokeWidth={1.5} />
          <h3 style={styles.emptyTitle}>لا توجد أعمال إدارية</h3>
          <p style={styles.emptyText}>{searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لم يتم إضافة أي أعمال بعد'}</p>
        </div>
      ) : (
        <div style={styles.tasksList}>
          {filteredTasks.map(task => (
            <AdminTaskCard key={task.id} task={task} caseInfo={getCaseInfo(task.caseId)}
              onEdit={isAdmin ? (t) => { setEditingTask(t); setShowForm(true); } : null}
              onDelete={isAdmin ? handleDelete : null}
              onToggleStatus={handleToggleStatus} />
          ))}
        </div>
      )}

      {showForm && <AdminTaskForm caseId={editingTask?.caseId || 'general'} task={editingTask} onClose={() => { setShowForm(false); setEditingTask(null); }} />}
    </div>
  );
}

const styles = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerIcon: { width: '52px', height: '52px', background: 'linear-gradient(135deg, #059669, #16a34a)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)' },
  headerTitle: { fontSize: '24px', fontWeight: '700', color: '#f3f4f6', margin: '0 0 4px 0' },
  headerSubtitle: { fontSize: '14px', color: '#6b7280', margin: 0 },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)', fontFamily: 'inherit' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '16px', padding: '20px', textAlign: 'center', transition: 'all 0.2s ease', cursor: 'default' },
  statIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  statValue: { fontSize: '28px', fontWeight: '700', marginBottom: '4px', color: '#f3f4f6' },
  statLabel: { fontSize: '13px', color: '#6b7280', fontWeight: '500' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '4px', background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '14px', padding: '4px' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s ease', fontFamily: 'inherit' },
  filterBtnActive: { background: '#22c55e', color: 'white', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)' },
  filterBtnInactive: { color: '#9ca3af' },
  searchBox: { position: 'relative', width: '280px' },
  searchInput: { width: '100%', padding: '10px 16px 10px 40px', background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '14px', color: '#e5e7eb', fontSize: '14px', outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit' },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(34, 197, 94, 0.2)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  emptyCard: { background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '20px', padding: '60px 24px', textAlign: 'center' },
  emptyTitle: { fontSize: '18px', fontWeight: '600', color: '#9ca3af', margin: '16px 0 8px' },
  emptyText: { fontSize: '14px', color: '#6b7280', margin: 0 },
  tasksList: { display: 'flex', flexDirection: 'column', gap: '12px' },
};