import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 🎯 تحديث حالة الموبايل
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🚨 لو مسجل دخول → روح للـ Dashboard فوراً
  useEffect(() => {
    if (!loading && user && userData?.officeId) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, userData, loading, navigate]);

  // 🚨 لو مسجل بس مفيش مكتب → روح للـ Profile
  useEffect(() => {
    if (!loading && user && !userData?.officeId) {
      navigate("/profile", { replace: true });
    }
  }, [user, userData, loading, navigate]);

  // 🎯 Loading state
  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner} />
      </div>
    );
  }

  // 🚨 لو مسجل دخول → مفروض الـ useEffect واخده
  if (user) {
    return (
      <div style={loadingContainer}>
        <div style={spinner} />
      </div>
    );
  }

  // ✅ صفحة الهبوط للزوار (غير المسجلين)
  return (
    <div style={page}>
      {/* ===== Navbar ===== */}
      <header style={nav(isMobile)}>
        <div style={logo(isMobile)}>⚖️ Law Office</div>
        <div style={authButtons(isMobile)}>
          <button style={btnGhost(isMobile)} onClick={() => navigate("/login")}>
            دخول
          </button>
          <button style={btnPrimary(isMobile)} onClick={() => navigate("/register")}>
            تسجيل
          </button>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section style={hero(isMobile)}>
        <h1 style={title(isMobile)}>
          نظام إدارة مكاتب المحاماة بطريقة احترافية
        </h1>
        <p style={subtitle(isMobile)}>
          إدارة القضايا، العملاء، الجلسات، وميزانية المكتب في مكان واحد.
        </p>
      </section>

      {/* ===== Features Section ===== */}
      <section id="features" style={section(isMobile)}>
        <h2 style={sectionTitle(isMobile)}>✨ مميزات النظام</h2>
        <div style={grid(isMobile)}>
          {[
            { icon: "⚖️", t: "إدارة القضايا", d: "تتبع كل قضية بدقة مع إمكانية إضافة الجلسات والمستندات" },
            { icon: "👥", t: "العملاء", d: "بيانات منظمة للعملاء وسجل كامل للتواصل" },
            { icon: "💬", t: "الرسائل", d: "تواصل داخلي فعال بين أعضاء المكتب" },
            { icon: "💰", t: "ميزانية المكتب", d: "متابعة الأتعاب والمصاريف والمدفوعات" },
            { icon: "📅", t: "الجلسات", d: "تنظيم المواعيد القانونية والتنبيهات" },
            { icon: "🔔", t: "التنبيهات", d: "إشعارات فورية بكل التحديثات والمواعيد" },
          ].map((item, i) => (
            <div key={i} style={card(isMobile)}>
              <div style={cardIcon(isMobile)}>{item.icon}</div>
              <h3 style={cardTitle(isMobile)}>{item.t}</h3>
              <p style={cardDesc(isMobile)}>{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section style={ctaSection(isMobile)}>
        <h2 style={ctaTitle(isMobile)}>جاهز لتنظيم مكتبك؟</h2>
        <p style={ctaSubtitle(isMobile)}>
          انضم لآلاف المكاتب اللي بتستخدم نظامنا
        </p>
        <button 
          style={btnCta(isMobile)} 
          onClick={() => navigate("/register")}
        >
          ابدأ مجاناً
        </button>
      </section>

      {/* ===== Footer ===== */}
      <footer style={footer(isMobile)}>
        <div style={footerContent(isMobile)}>
          <div style={footerLogo}>⚖️ Law Office</div>
          <div style={footerLinks(isMobile)}>
            <span style={footerLink} onClick={() => navigate("/login")}>
              تسجيل الدخول
            </span>
            <span style={footerLink} onClick={() => navigate("/register")}>
              إنشاء حساب
            </span>
          </div>
        </div>
        <div style={footerCopy}>
          © {new Date().getFullYear()} Law Office System - جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}

/* ================= استايلات ================= */

const page = { 
  fontFamily: "'Segoe UI', 'Tahoma', sans-serif", 
  direction: "rtl", 
  background: "#0f172a", 
  color: "#fff", 
  minHeight: "100vh",
  overflowX: "hidden",
};

const loadingContainer = { 
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center", 
  height: "100vh",
  background: "#0f172a",
  position: "fixed",
  inset: 0,
  zIndex: 9999,
};

const spinner = {
  width: "40px",
  height: "40px",
  border: "3px solid rgba(212, 175, 55, 0.2)",
  borderTop: "3px solid #d4af37",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

/* ===== Navbar ===== */
const nav = (isMobile) => ({ 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  padding: isMobile ? "12px 4%" : "16px 5%", 
  background: "rgba(11, 18, 32, 0.95)",
  backdropFilter: "blur(10px)",
  position: "sticky",
  top: 0,
  zIndex: 100,
  borderBottom: "1px solid rgba(212, 175, 55, 0.1)",
});

const logo = (isMobile) => ({ 
  fontWeight: "bold", 
  fontSize: isMobile ? "18px" : "22px",
  color: "#d4af37",
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

const authButtons = (isMobile) => ({ 
  display: "flex", 
  gap: isMobile ? "8px" : "12px",
  alignItems: "center",
});

/* ===== Hero ===== */
const hero = (isMobile) => ({ 
  textAlign: "center", 
  padding: isMobile ? "60px 5% 40px" : "100px 5% 60px",
  maxWidth: "900px",
  margin: "0 auto",
});

const title = (isMobile) => ({ 
  fontSize: isMobile ? "28px" : "clamp(36px, 4vw, 52px)", 
  marginBottom: isMobile ? "16px" : "24px",
  lineHeight: 1.2,
  fontWeight: 800,
  background: "linear-gradient(135deg, #fff 0%, #d4af37 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

const subtitle = (isMobile) => ({ 
  color: "#94a3b8", 
  fontSize: isMobile ? "15px" : "18px", 
  marginBottom: isMobile ? "0" : "0",
  lineHeight: 1.7,
  maxWidth: "600px",
  margin: "0 auto",
});

/* ===== Features ===== */
const section = (isMobile) => ({ 
  padding: isMobile ? "40px 4%" : "80px 5%",
  maxWidth: "1200px",
  margin: "0 auto",
});

const sectionTitle = (isMobile) => ({ 
  textAlign: "center", 
  marginBottom: isMobile ? "24px" : "48px",
  fontSize: isMobile ? "22px" : "30px",
  fontWeight: 700,
});

const grid = (isMobile) => ({ 
  display: "grid", 
  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", 
  gap: isMobile ? "16px" : "24px",
});

const card = (isMobile) => ({ 
  background: "rgba(30, 41, 59, 0.8)", 
  padding: isMobile ? "24px 20px" : "32px", 
  borderRadius: "16px", 
  textAlign: "center", 
  border: "1px solid rgba(212, 175, 55, 0.08)",
  transition: "all 0.3s ease",
});

const cardIcon = (isMobile) => ({
  fontSize: isMobile ? "32px" : "44px",
  marginBottom: isMobile ? "12px" : "16px",
});

const cardTitle = (isMobile) => ({
  marginBottom: isMobile ? "8px" : "12px",
  fontSize: isMobile ? "17px" : "19px",
  fontWeight: 700,
  color: "#fff",
});

const cardDesc = (isMobile) => ({ 
  color: "#94a3b8", 
  fontSize: isMobile ? "13px" : "15px",
  lineHeight: 1.7,
});

/* ===== CTA ===== */
const ctaSection = (isMobile) => ({
  textAlign: "center",
  padding: isMobile ? "40px 5%" : "80px 5%",
  background: "linear-gradient(135deg, rgba(212, 175, 55, 0.05), rgba(37, 99, 235, 0.05))",
  borderTop: "1px solid rgba(212, 175, 55, 0.1)",
  borderBottom: "1px solid rgba(212, 175, 55, 0.1)",
});

const ctaTitle = (isMobile) => ({
  fontSize: isMobile ? "22px" : "32px",
  fontWeight: 700,
  marginBottom: isMobile ? "10px" : "16px",
});

const ctaSubtitle = (isMobile) => ({
  color: "#94a3b8",
  fontSize: isMobile ? "15px" : "17px",
  marginBottom: isMobile ? "20px" : "32px",
});

/* ===== Footer ===== */
const footer = (isMobile) => ({ 
  padding: isMobile ? "24px 5%" : "40px 5%", 
  background: "#0b1220",
  borderTop: "1px solid rgba(212, 175, 55, 0.1)",
});

const footerContent = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexDirection: isMobile ? "column" : "row",
  gap: isMobile ? "16px" : "0",
  marginBottom: isMobile ? "16px" : "24px",
});

const footerLogo = {
  fontWeight: "bold",
  fontSize: "20px",
  color: "#d4af37",
};

const footerLinks = (isMobile) => ({
  display: "flex",
  gap: isMobile ? "16px" : "24px",
  flexDirection: isMobile ? "column" : "row",
  alignItems: "center",
});

const footerLink = {
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: "14px",
  transition: "color 0.2s",
};

const footerCopy = {
  textAlign: "center",
  color: "#64748b",
  fontSize: "13px",
  paddingTop: "20px",
  borderTop: "1px solid rgba(255,255,255,0.05)",
};

/* ===== Buttons ===== */
const btnPrimary = (isMobile) => ({ 
  background: "#2563eb", 
  border: "none", 
  padding: isMobile ? "8px 14px" : "10px 20px", 
  color: "#fff", 
  borderRadius: "8px", 
  cursor: "pointer",
  fontWeight: 600,
  fontSize: isMobile ? "13px" : "14px",
  whiteSpace: "nowrap",
});

const btnGhost = (isMobile) => ({ 
  background: "transparent", 
  border: "1px solid #334155", 
  padding: isMobile ? "8px 14px" : "10px 20px", 
  color: "#fff", 
  borderRadius: "8px", 
  cursor: "pointer",
  fontWeight: 600,
  fontSize: isMobile ? "13px" : "14px",
  whiteSpace: "nowrap",
});

const btnCta = (isMobile) => ({
  background: "linear-gradient(135deg, #d4af37, #b8941f)",
  border: "none",
  padding: isMobile ? "14px 32px" : "18px 56px",
  color: "#0f172a",
  borderRadius: "12px",
  fontSize: isMobile ? "16px" : "20px",
  cursor: "pointer",
  fontWeight: 800,
});