export default function Header({ open, setOpen }) {
  return (
    <header className="header" style={styles.header}>
      {/* زر التبديل (تغيير الأيقونة حسب الحالة) */}
      <button
        className="menu-btn"
        onClick={() => setOpen(!open)}
        style={styles.menuBtn}
      >
        {open ? "✕" : "☰"}
      </button>

      <h1 style={styles.title}>لوحة التحكم</h1>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "10px 20px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
  },
  menuBtn: {
    fontSize: "20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "5px",
    color: "#1e293b"
  },
  title: {
    fontSize: "18px",
    margin: 0,
    color: "#334155"
  }
};