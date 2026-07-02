import React, { useState, useEffect, useCallback } from 'react';
import { 
  Gavel, Plus, Search, Scale, AlertTriangle, 
  CheckCircle2, Clock, Calendar, FileText, ChevronDown, Landmark, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc, documentId } from 'firebase/firestore';
import JudgmentCard from '../components/case/JudgmentCard';
import JudgmentForm from '../components/case/JudgmentForm';

const JUDGMENT_CATEGORIES = {
  order: 'أمر',
  preliminary: 'حكم تمهيدي',
  final: 'حكم قطعي',
};

const categoryConfig = {
  order: {
    label: 'الأوامر',
    description: 'إجراءات إدارية وتنظيمية (أوامر على عرائض، ندب خبراء، استجواب)',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    icon: FileText,
  },
  preliminary: {
    label: 'الأحكام التمهيدية',
    description: 'إعداد للفصل في الدعوى (ندب خبراء، استجواب، معاينة)',
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: 'rgba(217, 119, 6, 0.3)',
    icon: Clock,
  },
  final: {
    label: 'الأحكام القطعية',
    description: 'تُنهي القضية (أحكام ابتدائية، استئناف، نقض، نهائية)',
    color: '#1e40af',
    bgColor: 'rgba(30, 64, 175, 0.15)',
    borderColor: 'rgba(30, 64, 175, 0.3)',
    icon: CheckCircle2,
  },
};

export default function Judgments() {
  const { user, userData } = useAuth();
  const officeId = userData?.officeId;

  const [judgments, setJudgments] = useState([]);
  const [casesMap, setCasesMap] = useState({});
  const [clientNamesCache, setClientNamesCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJudgment, setEditingJudgment] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({ order: true, preliminary: true, final: true });

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // ✅ Fetch judgments with officeId filter (getDocs instead of onSnapshot)
  const fetchJudgments = useCallback(async () => {
    if (!officeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'judgments'),
        where('officeId', '==', officeId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setJudgments(data);
    } catch (err) {
      console.error('Error fetching judgments:', err);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    fetchJudgments();
  }, [fetchJudgments]);

  // Fetch case data for judgments
  useEffect(() => {
    const uniqueCaseIds = [...new Set(judgments.map(j => j.caseId).filter(Boolean))];
    const fetchCases = async () => {
      const newCasesMap = {};
      for (const caseId of uniqueCaseIds) {
        if (caseId && caseId !== 'general' && !casesMap[caseId]) {
          try {
            const caseDoc = await getDoc(doc(db, 'cases', caseId));
            if (caseDoc.exists()) newCasesMap[caseId] = caseDoc.data();
          } catch (err) {
            console.error('Error fetching case:', caseId, err);
          }
        }
      }
      if (Object.keys(newCasesMap).length > 0) setCasesMap(prev => ({ ...prev, ...newCasesMap }));
    };
    if (uniqueCaseIds.length > 0) fetchCases();
  }, [judgments]);

  // Fetch client names
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
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await deleteDoc(doc(db, 'judgments', id));
      setJudgments(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handleToggleFollowUp = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'judgments', id), { 
        needsFollowUp: !currentStatus, 
        updatedAt: new Date() 
      });
      setJudgments(prev => prev.map(j => 
        j.id === id ? { ...j, needsFollowUp: !currentStatus, updatedAt: new Date() } : j
      ));
    } catch (err) {
      alert('حدث خطأ أثناء التحديث');
    }
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
    if (caseData.caseNumber && caseData.caseYear) return 'قضية رقم ' + caseData.caseNumber + ' / ' + caseData.caseYear + (clientName ? ' - ' + clientName : '');
    if (caseData.caseSerial && caseData.caseYear) return 'قضية رقم ' + caseData.caseSerial + ' / ' + caseData.caseYear + (clientName ? ' - ' + clientName : '');
    if (clientName) return clientName;
    if (caseData.court) return 'محكمة ' + caseData.court;
    if (caseData.caseNumber) return 'قضية رقم ' + caseData.caseNumber;
    if (caseData.caseSerial) return 'قضية رقم ' + caseData.caseSerial;
    return 'قضية بدون اسم';
  };

  const getCaseInfo = (caseId) => {
    if (!caseId || caseId === 'general') return null;
    const caseData = casesMap[caseId];
    if (!caseData) return { title: 'جاري التحميل...', number: '' };
    return { title: getCaseDisplayName(caseData), number: caseData.caseNumber || caseData.number || caseData.caseSerial || '' };
  };

  const orderJudgments = judgments.filter(j => j.category === 'order');
  const preliminaryJudgments = judgments.filter(j => j.category === 'preliminary');
  const finalJudgments = judgments.filter(j => j.category === 'final');

  const filterJudgments = (list) => list.filter(j => {
    const caseData = casesMap[j.caseId];
    const caseTitle = getCaseDisplayName(caseData);
    const clientName = getClientName(caseData);
    const matchesSearch = !searchTerm || 
      j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.caseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.judge?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredOrder = filterJudgments(orderJudgments);
  const filteredPreliminary = filterJudgments(preliminaryJudgments);
  const filteredFinal = filterJudgments(finalJudgments);

  const stats = {
    total: judgments.length,
    order: orderJudgments.length,
    preliminary: preliminaryJudgments.length,
    final: finalJudgments.length,
    win: judgments.filter(j => j.result === 'win' && j.category === 'final').length,
    lose: judgments.filter(j => j.result === 'lose' && j.category === 'final').length,
    draw: judgments.filter(j => j.result === 'draw' && j.category === 'final').length,
    needsFollowUp: judgments.filter(j => j.needsFollowUp).length,
  };

  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const renderJudgmentSection = (title, description, data, type, color, bgColor, borderColor, Icon) => (
    <div style={{ marginBottom: '24px' }}>
      <button onClick={() => toggleSection(type)} style={{ ...styles.sectionHeader, background: bgColor, border: `1px solid ${borderColor}` }}>
        <div style={styles.sectionHeaderLeft}>
          <div style={{ ...styles.sectionIcon, background: color + '20' }}><Icon size={22} color={color} strokeWidth={2.5} /></div>
          <div>
            <h2 style={{ ...styles.sectionTitle, color }}>{title}</h2>
            <p style={styles.sectionDescription}>{description}</p>
          </div>
        </div>
        <div style={styles.sectionHeaderRight}>
          <span style={{ ...styles.sectionCount, background: color + '20', color }}>{data.length}</span>
          <ChevronDown size={20} color={color} style={{ transform: expandedSections[type] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </div>
      </button>
      {expandedSections[type] && (
        <div style={styles.sectionContent}>
          {data.length === 0 ? (
            <div style={styles.emptySection}><Scale size={40} color="#374151" strokeWidth={1.5} /><p style={styles.emptyText}>لا توجد أحكام في هذا القسم</p></div>
          ) : data.map(judgment => (
            <JudgmentCard key={judgment.id} judgment={judgment} caseInfo={getCaseInfo(judgment.caseId)}
              onEdit={isAdmin ? (j) => { setEditingJudgment(j); setShowForm(true); } : null}
              onDelete={isAdmin ? handleDelete : null}
              onToggleFollowUp={(type === 'order' || type === 'preliminary') ? handleToggleFollowUp : null} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.page} className="judgments-page">
      <div style={styles.header} className="judgments-header">
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}><Landmark color="#fbbf24" size={24} strokeWidth={2.5} /></div>
          <div>
            <h1 style={styles.headerTitle}>الأحكام القضائية</h1>
            <p style={styles.headerSubtitle}>إدارة ومتابعة جميع الأحكام والقرارات</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchJudgments} style={{ ...styles.addBtn, background: '#374151' }}>
            🔄 تحديث
          </button>
          {isAdmin && (
            <button onClick={() => { setEditingJudgment(null); setShowForm(true); }} style={styles.addBtn}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#b45309'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#d97706'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <Plus size={18} /> إضافة حكم
            </button>
          )}
        </div>
      </div>

      <div style={styles.statsGrid} className="judgments-stats-grid">
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(30, 64, 175, 0.15)' }}><Scale size={20} color="#1e40af" strokeWidth={2.5} /></div>
          <div style={{ ...styles.statValue, color: '#1e40af' }}>{stats.total}</div>
          <div style={styles.statLabel}>إجمالي الأحكام</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(107, 114, 128, 0.15)' }}><FileText size={20} color="#6b7280" strokeWidth={2.5} /></div>
          <div style={{ ...styles.statValue, color: '#6b7280' }}>{stats.order}</div>
          <div style={styles.statLabel}>أوامر</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(217, 119, 6, 0.15)' }}><Clock size={20} color="#d97706" strokeWidth={2.5} /></div>
          <div style={{ ...styles.statValue, color: '#d97706' }}>{stats.preliminary}</div>
          <div style={styles.statLabel}>تمهيدية</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(30, 64, 175, 0.15)' }}><CheckCircle2 size={20} color="#1e40af" strokeWidth={2.5} /></div>
          <div style={{ ...styles.statValue, color: '#1e40af' }}>{stats.final}</div>
          <div style={styles.statLabel}>قطعية</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(16, 185, 129, 0.15)' }}><CheckCircle2 size={20} color="#10b981" strokeWidth={2.5} /></div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.win}</div>
          <div style={styles.statLabel}>لصالحنا</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(239, 68, 68, 0.15)' }}><AlertTriangle size={20} color="#ef4444" strokeWidth={2.5} /></div>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{stats.lose}</div>
          <div style={styles.statLabel}>ضدنا</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(217, 119, 6, 0.15)' }}><Bell size={20} color="#d97706" strokeWidth={2.5} /></div>
          <div style={{ ...styles.statValue, color: '#d97706' }}>{stats.needsFollowUp}</div>
          <div style={styles.statLabel}>تحتاج متابعة</div>
        </div>
      </div>

      <div style={styles.controls} className="judgments-controls">
        <div style={styles.searchBox} className="judgments-search-box">
          <Search size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="البحث في الأحكام أو القضايا..." style={styles.searchInput} />
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}><div style={styles.spinner} /></div>
      ) : (
        <>
          {renderJudgmentSection(categoryConfig.order.label, categoryConfig.order.description, filteredOrder, 'order', categoryConfig.order.color, categoryConfig.order.bgColor, categoryConfig.order.borderColor, categoryConfig.order.icon)}
          {renderJudgmentSection(categoryConfig.preliminary.label, categoryConfig.preliminary.description, filteredPreliminary, 'preliminary', categoryConfig.preliminary.color, categoryConfig.preliminary.bgColor, categoryConfig.preliminary.borderColor, categoryConfig.preliminary.icon)}
          {renderJudgmentSection(categoryConfig.final.label, categoryConfig.final.description, filteredFinal, 'final', categoryConfig.final.color, categoryConfig.final.bgColor, categoryConfig.final.borderColor, categoryConfig.final.icon)}
        </>
      )}

      {showForm && <JudgmentForm caseId={editingJudgment?.caseId || 'general'} judgment={editingJudgment} onClose={() => { setShowForm(false); setEditingJudgment(null); }} onSuccess={fetchJudgments} />}
    </div>
  );
}

const styles = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerIcon: { width: '52px', height: '52px', background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(30, 64, 175, 0.25)' },
  headerTitle: { fontSize: '24px', fontWeight: '700', color: '#f3f4f6', margin: '0 0 4px 0' },
  headerSubtitle: { fontSize: '14px', color: '#6b7280', margin: 0 },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#d97706', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(217, 119, 6, 0.3)', fontFamily: 'inherit' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '16px', padding: '16px', textAlign: 'center', transition: 'all 0.2s ease' },
  statIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  statValue: { fontSize: '24px', fontWeight: '700', marginBottom: '4px' },
  statLabel: { fontSize: '12px', color: '#6b7280', fontWeight: '500' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  searchBox: { position: 'relative', width: '100%', maxWidth: '400px' },
  searchInput: { width: '100%', padding: '10px 16px 10px 40px', background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '14px', color: '#e5e7eb', fontSize: '14px', outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit' },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(30, 64, 175, 0.2)', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '12px' },
  sectionHeaderLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  sectionIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0' },
  sectionDescription: { fontSize: '13px', color: '#6b7280', margin: 0 },
  sectionHeaderRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  sectionCount: { padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '700' },
  sectionContent: { padding: '0 8px' },
  emptySection: { background: '#1e293b', border: '1px dashed rgba(55, 65, 81, 0.5)', borderRadius: '16px', padding: '40px 24px', textAlign: 'center' },
  emptyText: { color: '#6b7280', fontSize: '14px', marginTop: '12px' },
};