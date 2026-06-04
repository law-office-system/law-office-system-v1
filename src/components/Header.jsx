export default function Header({ setSidebarOpen }) {
  return (
    <header className="header">
      <button
        className="menu-btn"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      <h1>Dashboard</h1>
    </header>
  );
}