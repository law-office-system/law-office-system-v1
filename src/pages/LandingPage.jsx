import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={page}>
      {/* Navbar تم تبسيطه لزيادة معدل التحويل */}
      <header style={nav}>
        <div style={logo}>⚖️ Law Office</div>
        <div style={authButtons}>
          <button style={btnGhost} onClick={() => navigate("/login")}>دخول</button>
          <button style={btnPrimary} onClick={() => navigate("/register")}>تسجيل</button>
        </div>
      </header>

      <section style={hero}>
        <h1 style={title}>نظام إدارة مكاتب المحاماة بطريقة احترافية</h1>
        <p style={subtitle}>إدارة القضايا، العملاء، الجلسات، وميزانية المكتب في مكان واحد.</p>
        <div style={heroActions}>
          <button style={btnPrimaryLarge} onClick={() => navigate("/register")}>ابدأ الآن</button>
        </div>
      </section>

      <section id="features" style={section}>
        <h2 style={sectionTitle}>✨ مميزات النظام</h2>
        <div style={grid}>
          {[
            { t: "⚖️ إدارة القضايا", d: "تتبع كل قضية بدقة" },
            { t: "👥 العملاء", d: "بيانات منظمة للعملاء" },
            { t: "💬 الرسائل", d: "تواصل داخلي فعال" },
            { t: "💰 ميزانية المكتب", d: "متابعة الأتعاب والمصاريف" },
            { t: "📅 الجلسات", d: "تنظيم المواعيد القانونية" },
            { t: "🔔 تنبيهات", d: "إشعارات بالتحديثات" }
          ].map((item, i) => (
            <div key={i} style={card}>
              <h3>{item.t}</h3>
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={footer}>
        © {new Date().getFullYear()} Law Office System - جميع الحقوق محفوظة
      </footer>
    </div>
  );
}

/* ================= استايلات متجاوبة ================= */

const page = { fontFamily: "'Segoe UI', sans-serif", direction: "rtl", background: "#0f172a", color: "#fff", minHeight: "100vh" };
const nav = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 5%", background: "#0b1220" };
const logo = { fontWeight: "bold", fontSize: "20px" };
const authButtons = { display: "flex", gap: "10px" };
const hero = { textAlign: "center", padding: "80px 20px" };
const title = { fontSize: "clamp(28px, 5vw, 48px)", marginBottom: "20px" };
const subtitle = { color: "#94a3b8", fontSize: "18px", marginBottom: "30px" };
const heroActions = { display: "flex", gap: "10px", justifyContent: "center" };
const section = { padding: "60px 5%" };
const sectionTitle = { textAlign: "center", marginBottom: "40px" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" };
const card = { background: "#1e293b", padding: "25px", borderRadius: "12px", textAlign: "center", border: "1px solid #334155" };
const footer = { textAlign: "center", padding: "40px", color: "#64748b", borderTop: "1px solid #1e293b" };
const btnPrimary = { background: "#2563eb", border: "none", padding: "8px 16px", color: "#fff", borderRadius: "6px", cursor: "pointer" };
const btnGhost = { background: "transparent", border: "1px solid #334155", padding: "8px 16px", color: "#fff", borderRadius: "6px", cursor: "pointer" };
const btnPrimaryLarge = { background: "#2563eb", border: "none", padding: "15px 40px", color: "#fff", borderRadius: "8px", fontSize: "18px", cursor: "pointer" };