import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          minHeight: "100vh", background: "#0f172a", padding: "20px", direction: "rtl"
        }}>
          <div style={{
            padding: "40px", maxWidth: "500px", width: "100%", textAlign: "center",
            background: "#1e293b", border: "1px solid #334155", borderRadius: "16px"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>🐛</div>
            <h2 style={{ color: "#f1f5f9", marginBottom: "12px", fontSize: "22px" }}>
              حدث خطأ غير متوقع
            </h2>
            <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "15px" }}>
              نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو تحديث الصفحة.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={this.handleReset} style={{
                padding: "12px 24px", background: "#3b82f6", color: "#fff",
                border: "none", borderRadius: "8px", cursor: "pointer",
                fontSize: "14px", fontWeight: "600"
              }}>
                🔄 إعادة المحاولة
              </button>
              <button onClick={this.handleReload} style={{
                padding: "12px 24px", background: "transparent", color: "#94a3b8",
                border: "1px solid #334155", borderRadius: "8px", cursor: "pointer",
                fontSize: "14px", fontWeight: "600"
              }}>
                🔄 تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;