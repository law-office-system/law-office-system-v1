import { useState } from "react";

export default function MessageInput({ onSendMessage, replyTo, setReplyTo, userRole }) {
  const [text, setText] = useState("");

  // 🛡️ الصلاحيات: إذا لم يكن المستخدم عضواً (null) أو كان له صلاحية قراءة فقط (read-only)
  // يمكنك ضبط المنطق هنا بناءً على الـ role الذي يأتي من خدمة الصلاحيات
  const canSend = userRole !== null && userRole !== "viewer"; 

  const handleSend = () => {
    if (!text.trim() || !canSend) return;
    onSendMessage(text);
    setText("");
    setReplyTo(null);
  };

  if (!canSend) {
    return (
      <div style={styles.noAccess}>
        🔒 لا تملك صلاحية الإرسال في هذه الغرفة
      </div>
    );
  }

  return (
    <div style={styles.inputBox}>
      {replyTo && (
        <div style={styles.replyPreview}>
          <span>↩️ رد على: {replyTo.text.slice(0, 20)}...</span>
          <button onClick={() => setReplyTo(null)}>✖</button>
        </div>
      )}

      <div style={styles.inputArea}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="اكتب رسالة..."
          style={styles.input}
        />
        <button onClick={handleSend} style={styles.sendBtn}>
          إرسال
        </button>
      </div>
    </div>
  );
}

const styles = {
  inputBox: { padding: 10, borderTop: "1px solid #eee", background: "#fff" },
  inputArea: { display: "flex", gap: 10 },
  input: { flex: 1, padding: 10, borderRadius: 20, border: "1px solid #ddd", outline: "none" },
  sendBtn: { padding: "8px 16px", borderRadius: 20, border: "none", background: "#4caf50", color: "#fff", cursor: "pointer" },
  replyPreview: { fontSize: 12, background: "#f1f1f1", padding: 5, marginBottom: 5 },
  noAccess: { padding: 15, textAlign: "center", color: "#888", fontSize: 13, background: "#f9f9f9" }
};