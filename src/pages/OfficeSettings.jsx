import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { THEMES, ACCENT_OPTIONS } from '../styles/themes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { usePermissions } from '../hooks/usePermissions';
import { db } from '../firebaseDb.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Button, Card, Page, Section, Input } from '../components/ui';
import { 
  Palette, Building2, Bell, Users, Check, Save, Loader2, 
  Phone, Mail, MapPin, User, Shield, Trash2, Plus, X
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// إعدادات الصلاحيات — مخزنة في offices/{officeId}.permissions
// ⚠️ مدير المكتب (admin) يملك كل شيء تلقائياً ولا يظهر في المصفوفة
// ⚠️ لو المكتب لم يضبط الإعدادات → تُستخدم الافتراضيات (= النظام الحالي)
// ═══════════════════════════════════════════════════════════════
const STAFF_ROLES = [
  { value: 'lawyer',     label: 'محامٍ' },
  { value: 'assistant',  label: 'مساعد' },
  { value: 'secretary',  label: 'سكرتير' },
  { value: 'accountant', label: 'محاسب' },
];

const PERMISSION_RESOURCES = [
  { key: 'cases',      label: 'القضايا',            actions: [{ key: 'view', label: 'عرض' }, { key: 'create', label: 'إضافة' }, { key: 'edit', label: 'تعديل' }, { key: 'delete', label: 'حذف' }] },
  { key: 'sessions',   label: 'الجلسات',            actions: [{ key: 'view', label: 'عرض' }, { key: 'manage', label: 'إدارة' }] },
  { key: 'judgments',  label: 'الأحكام',            actions: [{ key: 'view', label: 'عرض' }, { key: 'manage', label: 'إدارة' }, { key: 'delete', label: 'حذف' }] },
  { key: 'clients',    label: 'العملاء (الموكلين)', actions: [{ key: 'view', label: 'عرض' }, { key: 'create', label: 'إضافة' }, { key: 'edit', label: 'تعديل' }, { key: 'delete', label: 'حذف' }] },
  { key: 'documents',  label: 'المستندات',          actions: [{ key: 'view', label: 'عرض' }, { key: 'upload', label: 'رفع' }, { key: 'delete', label: 'حذف' }] },
  { key: 'finance',    label: 'المالية',            actions: [{ key: 'view', label: 'عرض' }, { key: 'add', label: 'إضافة' }, { key: 'edit', label: 'تعديل' }, { key: 'delete', label: 'حذف' }] },
  { key: 'archive',    label: 'الأرشيف',            actions: [{ key: 'view', label: 'عرض' }, { key: 'delete', label: 'حذف' }] },
  { key: 'adminTasks', label: 'المهام الإدارية',     actions: [{ key: 'view', label: 'عرض' }, { key: 'create', label: 'إنشاء' }] },
  { key: 'officeRooms', label: 'القاعات والمحادثات', actions: [{ key: 'view', label: 'عرض' }, { key: 'manage', label: 'إدارة' }] },
  { key: 'members',    label: 'إدارة الأعضاء',       actions: [{ key: 'view', label: 'عرض' }, { key: 'changeRole', label: 'تغيير الأدوار' }, { key: 'remove', label: 'إزالة' }] },
];

// الافتراضيات = نفس سلوك النظام الحالي (زي permissions.js)
const DEFAULT_PERMISSIONS = {
  cases:      { view: ['lawyer', 'assistant', 'secretary'], create: ['lawyer'], edit: ['lawyer'], delete: [] },
  sessions:   { view: ['lawyer', 'assistant', 'secretary'], manage: ['lawyer'] },
  judgments:  { view: ['lawyer', 'assistant', 'secretary'], manage: ['lawyer'], delete: [] },
  clients:    { view: ['lawyer', 'assistant', 'secretary'], create: ['lawyer'], edit: ['lawyer'], delete: [] },
  documents:  { view: ['lawyer', 'assistant', 'secretary'], upload: ['lawyer', 'secretary'], delete: ['lawyer'] },
  finance:    { view: ['lawyer', 'accountant'], add: ['accountant'], edit: [], delete: [] },
  archive:    { view: ['lawyer', 'assistant', 'secretary'], delete: [] },
  adminTasks: { view: ['lawyer', 'assistant', 'secretary'], create: ['lawyer'] },
  officeRooms: { view: ['lawyer', 'assistant', 'secretary'], manage: [] },
  members:    { view: [], changeRole: [], remove: [] },
};

// دمج الإعدادات المحفوظة مع الافتراضيات (أي مفتاح ناقص ياخد الافتراضي)
function mergePermissions(saved) {
  const merged = {};
  for (const res of PERMISSION_RESOURCES) {
    merged[res.key] = {};
    for (const act of res.actions) {
      const savedList = saved?.[res.key]?.[act.key];
      merged[res.key][act.key] = Array.isArray(savedList) ? savedList : (DEFAULT_PERMISSIONS[res.key]?.[act.key] || []);
    }
  }
  return merged;
}

export default function OfficeSettings() {
  const { themeId, accentId, setThemeId, setAccentId, saveTheme, theme } = useTheme();
  const { userData, user } = useAuth();
  const { can } = usePermissions();
  const { colors } = theme;

  const [activeTab, setActiveTab] = useState('appearance');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── General tab state ──
  const [officeInfo, setOfficeInfo] = useState({
    name: '', address: '', phone: '', email: '',
  });
  const [officeLoading, setOfficeLoading] = useState(true);

  // ── Notifications tab state ──
  const [notifSettings, setNotifSettings] = useState({
    sessionReminder: true,
    taskAssigned: false,
    caseStatusChange: true,
    newMessage: true,
    reminderHours: 24,
  });

  // ── Users tab state ──
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // ── Permissions tab state ──
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  // ── Load office info ──
  useEffect(() => {
    if (!userData?.officeId) return;
    let cancelled = false;

    const loadOffice = async () => {
      try {
        const snap = await getDoc(doc(db, 'offices', userData.officeId));
        if (!cancelled && snap.exists()) {
          const data = snap.data();
          setOfficeInfo({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
          });
          if (data.notifications) {
            setNotifSettings(prev => ({ ...prev, ...data.notifications }));
          }
          if (data.permissions) {
            setPermissions(mergePermissions(data.permissions));
          }
        }
      } catch (e) {
        console.error('Office load failed:', e);
      } finally {
        if (!cancelled) setOfficeLoading(false);
      }
    };

    loadOffice();
    return () => { cancelled = true; };
  }, [userData?.officeId]);

  // ── Load users ──
  useEffect(() => {
    if (!userData?.officeId) return;
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const q = query(collection(db, 'users'), where('officeId', '==', userData.officeId));
        const snap = await getDocs(q);
        if (!cancelled) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setUsers(list);
        }
      } catch (e) {
        console.error('Users load failed:', e);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };

    loadUsers();
    return () => { cancelled = true; };
  }, [userData?.officeId]);

  // ── Save theme ──
  const handleSaveTheme = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveTheme(themeId, accentId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Save office info ──
  const handleSaveOfficeInfo = async () => {
    if (!userData?.officeId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'offices', userData.officeId),
        { ...officeInfo, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save office info failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Save notifications ──
  const handleSaveNotifications = async () => {
    if (!userData?.officeId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'offices', userData.officeId),
        { notifications: notifSettings, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save notifications failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Save permissions ──
  const handleSavePermissions = async () => {
    if (!userData?.officeId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'offices', userData.officeId),
        { permissions, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save permissions failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // 🔐 الحماية: الصفحة لمدير المكتب فقط
  if (!can("officeSettings", "view")) {
    return (
      <Page>
        <div style={{ padding: 40, textAlign: "center", color: colors.text.muted }}>
          🚫 هذه الصفحة متاحة لمدير المكتب فقط
        </div>
      </Page>
    );
  }

  const tabs = [
    { id: 'appearance',    label: 'المظهر',     icon: Palette },
    { id: 'general',       label: 'عام',      icon: Building2 },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'users',         label: 'المستخدمين', icon: Users },
    { id: 'permissions',   label: 'الصلاحيات', icon: Shield },
  ];

  return (
    <Page>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: colors.text.primary }}>
              إعدادات المكتب
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: colors.text.muted }}>
              تخصيص مظهر وإعدادات مكتب المحاماة
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saved && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: colors.accent.green.main, fontSize: 14, fontWeight: 500,
              }}>
                <Check size={16} /> تم الحفظ
              </span>
            )}
            <Button
              onClick={
                activeTab === 'appearance' ? handleSaveTheme :
                activeTab === 'general' ? handleSaveOfficeInfo :
                activeTab === 'notifications' ? handleSaveNotifications :
                activeTab === 'permissions' ? handleSavePermissions :
                () => {}
              }
              disabled={saving}
              variant="primary"
              icon={saving ? Loader2 : Save}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${colors.border.default}`,
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? colors.text.primary : 'transparent'}`,
                  padding: '12px 20px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? colors.text.primary : colors.text.muted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Appearance Tab ── */}
        {activeTab === 'appearance' && (
          <AppearanceTab />
        )}

        {/* ── General Tab ── */}
        {activeTab === 'general' && (
          <GeneralTab 
            officeInfo={officeInfo} 
            setOfficeInfo={setOfficeInfo}
            loading={officeLoading}
          />
        )}

        {/* ── Notifications Tab ── */}
        {activeTab === 'notifications' && (
          <NotificationsTab 
            settings={notifSettings}
            setSettings={setNotifSettings}
          />
        )}

        {/* ── Users Tab ── */}
        {activeTab === 'users' && (
          <UsersTab 
            users={users}
            loading={usersLoading}
          />
        )}

        {/* ── Permissions Tab ── */}
        {activeTab === 'permissions' && (
          <PermissionsTab
            permissions={permissions}
            setPermissions={setPermissions}
          />
        )}

      </div>
    </Page>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APPEARANCE TAB
   ═══════════════════════════════════════════════════════════════ */
function AppearanceTab() {
  const { themeId, accentId, setThemeId, setAccentId, theme } = useTheme();
  const { colors } = theme;

  return (
    <div>
      {/* Theme Selector */}
      <Section title="اختيار الثيم" icon={Palette} defaultOpen={true}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {Object.values(THEMES).map(t => {
            const isSelected = themeId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setThemeId(t.id)}
                style={{
                  border: `2px solid ${isSelected ? colors.text.primary : 'transparent'}`,
                  borderRadius: 12,
                  padding: 16,
                  cursor: 'pointer',
                  background: t.colors.bg.page,
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 0 0 1px ${colors.text.primary}` : 'none',
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    width: 20, height: 20, borderRadius: '50%',
                    background: colors.text.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={12} color={t.colors.bg.page} strokeWidth={3} />
                  </div>
                )}
                <div style={{
                  height: 80,
                  background: t.colors.bg.card,
                  borderRadius: 8,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${t.colors.border.default}`,
                }}>
                  <div style={{
                    width: '60%', height: 8,
                    background: t.colors.accent.blue.main,
                    borderRadius: 4,
                  }} />
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 500,
                  color: t.colors.text.primary,
                  marginBottom: 4,
                }}>
                  {t.name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: t.colors.text.muted,
                }}>
                  {t.description}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Accent Color */}
      <Section title="لون التمييز الرئيسي" icon={Palette} defaultOpen={true}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {ACCENT_OPTIONS.map(opt => {
            const isSelected = accentId === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setAccentId(opt.id)}
                title={opt.name}
                style={{
                  width: 40, height: 40,
                  borderRadius: '50%',
                  background: opt.color,
                  cursor: 'pointer',
                  border: `3px solid ${isSelected ? colors.text.primary : 'transparent'}`,
                  boxShadow: isSelected ? `0 0 0 2px ${colors.bg.page}` : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected && (
                  <Check size={16} color="#fff" strokeWidth={3} />
                )}
              </div>
            );
          })}
        </div>
        <p style={{ marginTop: 12, fontSize: 13, color: colors.text.muted }}>
          اللون المحدد سيُستخدم في الأزرار الرئيسية والعناصر التفاعلية والشارات.
        </p>
      </Section>

      {/* Live Preview */}
      <Section title="معاينة مباشرة" icon={Palette} defaultOpen={true}>
        <ThemePreview />
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GENERAL TAB
   ═══════════════════════════════════════════════════════════════ */
function GeneralTab({ officeInfo, setOfficeInfo, loading }) {
  const { theme } = useTheme();
  const { colors } = theme;

  if (loading) {
    return (
      <Card variant="default">
        <div style={{ textAlign: 'center', padding: 40, color: colors.text.muted }}>
          جاري التحميل...
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <h3 style={{ margin: '0 0 20px', fontSize: 16, color: colors.text.primary }}>
        معلومات المكتب
      </h3>
      <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
        <Input
          label="اسم المكتب"
          placeholder="مكتب الأمل للمحاماة"
          value={officeInfo.name}
          onChange={e => setOfficeInfo(p => ({ ...p, name: e.target.value }))}
        />
        <Input
          label="العنوان"
          placeholder="الفيوم، مصر"
          value={officeInfo.address}
          onChange={e => setOfficeInfo(p => ({ ...p, address: e.target.value }))}
        />
        <Input
          label="رقم الهاتف"
          placeholder="+20 10X XXX XXXX"
          value={officeInfo.phone}
          onChange={e => setOfficeInfo(p => ({ ...p, phone: e.target.value }))}
        />
        <Input
          label="البريد الإلكتروني"
          type="email"
          placeholder="office@example.com"
          value={officeInfo.email}
          onChange={e => setOfficeInfo(p => ({ ...p, email: e.target.value }))}
        />
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
   ═══════════════════════════════════════════════════════════════ */
function NotificationsTab({ settings, setSettings }) {
  const { theme } = useTheme();
  const { colors } = theme;

  const items = [
    { key: 'sessionReminder',    title: 'إشعارات الجلسات',     desc: 'تنبيه قبل موعد الجلسة' },
    { key: 'taskAssigned',       title: 'إشعارات المهام',       desc: 'تنبيه عند إسناد مهمة جديدة' },
    { key: 'caseStatusChange',   title: 'إشعارات القضايا',      desc: 'تنبيه عند تغيير حالة القضية' },
    { key: 'newMessage',         title: 'إشعارات الدردشة',      desc: 'تنبيه عند وصول رسالة جديدة' },
  ];

  return (
    <Card variant="default">
      <h3 style={{ margin: '0 0 20px', fontSize: 16, color: colors.text.primary }}>
        إعدادات الإشعارات
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 500 }}>
        {items.map((item, i) => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: i < items.length - 1 ? `1px solid ${colors.border.default}` : 'none',
          }}>
            <div>
              <div style={{ fontSize: 14, color: colors.text.primary, fontWeight: 500 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                {item.desc}
              </div>
            </div>
            <ToggleSwitch 
              checked={settings[item.key]} 
              onChange={v => setSettings(p => ({ ...p, [item.key]: v }))}
            />
          </div>
        ))}
      </div>

      {/* Reminder hours */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${colors.border.default}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, color: colors.text.primary, fontWeight: 500 }}>
              وقت التذكير قبل الجلسة
            </div>
            <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
              عدد الساعات قبل موعد الجلسة للتنبيه
            </div>
          </div>
          <select
            value={settings.reminderHours}
            onChange={e => setSettings(p => ({ ...p, reminderHours: Number(e.target.value) }))}
            style={{
              padding: '8px 12px',
              background: colors.bg.input,
              border: `1px solid ${colors.border.default}`,
              borderRadius: 8,
              color: colors.text.primary,
              fontFamily: 'inherit',
              fontSize: 14,
            }}
          >
            <option value={1}>ساعة واحدة</option>
            <option value={6}>6 ساعات</option>
            <option value={12}>12 ساعة</option>
            <option value={24}>24 ساعة</option>
            <option value={48}>48 ساعة</option>
          </select>
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   USERS TAB
   ═══════════════════════════════════════════════════════════════ */
function UsersTab({ users, loading }) {
  const { theme } = useTheme();
  const { colors } = theme;

  if (loading) {
    return (
      <Card variant="default">
        <div style={{ textAlign: 'center', padding: 40, color: colors.text.muted }}>
          جاري تحميل المستخدمين...
        </div>
      </Card>
    );
  }

  const getRoleStyle = (role) => {
    switch (role) {
      case 'admin':
        return { bg: `${colors.accent.red.main}15`, color: colors.accent.red.light };
      case 'lawyer':
        return { bg: `${colors.accent.blue.main}15`, color: colors.accent.blue.light };
      default:
        return { bg: `${colors.accent.green.main}15`, color: colors.accent.green.light };
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'مدير المكتب';
      case 'lawyer': return 'محامٍ';
      case 'secretary': return 'سكرتير';
      default: return role;
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 
      ? parts[0][0] + parts[parts.length - 1][0] 
      : name.slice(0, 2);
  };

  return (
    <Card variant="default">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: colors.text.primary }}>
          إدارة المستخدمين
        </h3>
        <Button variant="primary" size="sm" icon={Plus}>
          إضافة مستخدم
        </Button>
      </div>

      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.text.muted }}>
          لا يوجد مستخدمين في هذا المكتب
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u, i) => {
            const roleStyle = getRoleStyle(u.role);
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: colors.bg.hover,
                borderRadius: 8,
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: colors.accent.blue.main,
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 500,
                  }}>
                    {getInitials(u.name || u.displayName || u.email)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: colors.text.primary, fontWeight: 500 }}>
                      {u.name || u.displayName || u.email}
                    </div>
                    <div style={{ fontSize: 12, color: colors.text.muted }}>
                      {getRoleLabel(u.role)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12, fontWeight: 500,
                    background: roleStyle.bg,
                    color: roleStyle.color,
                  }}>
                    {u.role}
                  </span>
                  <button style={{
                    background: 'none', border: 'none',
                    color: colors.text.muted,
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }}
                  className="user-row-action"
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PERMISSIONS TAB — مصفوفة الصلاحيات (تُحفظ في مستند المكتب)
   ═══════════════════════════════════════════════════════════════ */
function PermissionsTab({ permissions, setPermissions }) {
  const { theme } = useTheme();
  const { colors, radius } = theme;

  const toggleRole = (resKey, actKey, role) => {
    setPermissions(prev => {
      const current = prev[resKey]?.[actKey] || [];
      const next = current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role];
      return { ...prev, [resKey]: { ...prev[resKey], [actKey]: next } };
    });
  };

  return (
    <div>
      {/* تنبيه */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', marginBottom: 16,
        background: `${colors.accent.blue.main}12`,
        border: `1px solid ${colors.accent.blue.main}30`,
        borderRadius: radius.md,
        fontSize: 13, color: colors.text.secondary,
      }}>
        <Shield size={16} color={colors.accent.blue.main} />
        <span>
          <b style={{ color: colors.text.primary }}>مدير المكتب</b> يملك كل الصلاحيات تلقائياً ولا يحتاج ضبطاً.
          الإعدادات تُطبَّق على أدوار فريق العمل (محامٍ / مساعد / سكرتير / محاسب).
        </span>
      </div>

      {/* المصفوفة */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PERMISSION_RESOURCES.map(res => (
          <div
            key={res.key}
            style={{
              background: colors.bg.card,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.lg,
              overflow: 'hidden',
            }}
          >
            {/* اسم المورد */}
            <div style={{
              padding: '12px 16px',
              background: colors.bg.hover,
              borderBottom: `1px solid ${colors.border.default}`,
              fontWeight: 600, fontSize: 14,
              color: colors.text.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {res.label}
              <span style={{ fontSize: 11, color: colors.text.muted, fontWeight: 400 }}>
                اضغط على الدور لتفعيله / إلغائه
              </span>
            </div>

            {/* الأفعال */}
            <div style={{ padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {res.actions.map(act => {
                const allowed = permissions[res.key]?.[act.key] || [];
                return (
                  <div key={act.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      minWidth: 70, fontSize: 13, fontWeight: 500,
                      color: colors.text.secondary,
                    }}>
                      {act.label}
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {STAFF_ROLES.map(role => {
                        const active = allowed.includes(role.value);
                        return (
                          <button
                            key={role.value}
                            onClick={() => toggleRole(res.key, act.key, role.value)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 999,
                              fontSize: 12, fontWeight: 600,
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              border: active
                                ? `1px solid ${colors.accent.blue.main}`
                                : `1px solid ${colors.border.default}`,
                              background: active
                                ? colors.accent.blue.main
                                : 'transparent',
                              color: active
                                ? '#fff'
                                : colors.text.muted,
                            }}
                          >
                            {role.label}
                          </button>
                        );
                      })}
                      {/* شارة admin الثابتة */}
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        fontSize: 12, fontWeight: 600,
                        background: `${colors.accent.gold?.main || '#c9a227'}18`,
                        color: colors.accent.gold?.main || '#c9a227',
                        border: `1px dashed ${colors.accent.gold?.main || '#c9a227'}50`,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <Shield size={11} /> مدير المكتب ✓
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOGGLE SWITCH
   ═══════════════════════════════════════════════════════════════ */
function ToggleSwitch({ checked, onChange }) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <div
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: 44, height: 24,
        background: checked ? colors.accent.green.main : colors.border.default,
        borderRadius: 12,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20,
        background: '#fff',
        borderRadius: '50%',
        position: 'absolute',
        top: 2,
        right: checked ? 2 : 'auto',
        left: checked ? 'auto' : 2,
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   THEME PREVIEW
   ═══════════════════════════════════════════════════════════════ */
function ThemePreview() {
  const { theme } = useTheme();
  const { colors, currentAccent } = theme;

  return (
    <div style={{
      borderRadius: 10,
      padding: 20,
      background: colors.bg.page,
      border: `1px solid ${colors.border.default}`,
    }}>
      {/* Preview: Card + Content */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          width: 120, height: 80,
          background: colors.bg.card,
          borderRadius: 8,
          border: `1px solid ${colors.border.default}`,
        }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            height: 16, width: '60%',
            background: colors.text.primary,
            borderRadius: 4, marginBottom: 8,
          }} />
          <div style={{
            height: 12, width: '80%',
            background: colors.text.muted,
            borderRadius: 4, marginBottom: 8,
          }} />
          <div style={{
            height: 12, width: '40%',
            background: colors.text.muted,
            borderRadius: 4,
          }} />
        </div>
      </div>

      {/* Preview: Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{
          padding: '6px 16px',
          background: currentAccent.main,
          color: '#fff',
          borderRadius: 6,
          fontSize: 12, fontWeight: 500,
        }}>
          زر رئيسي
        </div>
        <div style={{
          padding: '6px 16px',
          background: 'transparent',
          border: `1px solid ${colors.border.default}`,
          color: colors.text.secondary,
          borderRadius: 6,
          fontSize: 12,
        }}>
          زر ثانوي
        </div>
        <div style={{
          padding: '4px 12px',
          background: `${colors.accent.green.main}15`,
          color: colors.accent.green.light,
          borderRadius: 999,
          fontSize: 11, fontWeight: 500,
          border: `1px solid ${colors.accent.green.main}30`,
        }}>
          شارة نجاح
        </div>
        <div style={{
          padding: '4px 12px',
          background: `${colors.accent.red.main}15`,
          color: colors.accent.red.light,
          borderRadius: 999,
          fontSize: 11, fontWeight: 500,
          border: `1px solid ${colors.accent.red.main}30`,
        }}>
          شارة خطر
        </div>
      </div>
    </div>
  );
}