import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseStorage";

export default function MessageInput({ 
  onSendMessage, 
  replyTo, 
  setReplyTo, 
  userRole,
  onTyping 
}) {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // 🛡️ الصلاحيات
  const canSend = userRole !== null && userRole !== "viewer"; 

  const handleSend = () => {
    if (!text.trim() || !canSend) return;
    onSendMessage({ text, type: "text" });
    setText("");
    setReplyTo(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (onTyping) onTyping();
  };

  // ===== رفع مرفق =====
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileRef = ref(storage, `chat-attachments/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      onSendMessage({
        text: file.name,
        type: file.type.startsWith("image/") ? "image" : "file",
        fileUrl: downloadURL,
        fileName: file.name,
      });

      setIsUploading(false);
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("فشل رفع الملف");
      setIsUploading(false);
    }
  };

  if (!canSend) {
    return (
      <div style={styles.noAccess}>
        <span style={styles.lockIcon}>🔒</span>
        <span>لا تملك صلاحية الإرسال في هذه الغرفة</span>
      </div>
    );
  }

  return (
    <div style={styles.inputBox}>
      {/* Reply Preview */}
      {replyTo && (
        <div style={styles.replyPreview}>
          <div style={styles.replyContent}>
            <span style={styles.replyLabel}>↩️ رد على:</span>
            <span style={styles.replyText}>{replyTo.text.slice(0, 50)}...</span>
          </div>
          <button onClick={() => setReplyTo(null)} style={styles.closeReply}>✖</button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div style={styles.uploadProgress}>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${uploadProgress}%`}} />
          </div>
          <span style={styles.progressText}>جاري الرفع...</span>
        </div>
      )}

      {/* Input Area */}
      <div style={styles.inputArea}>
        {/* Attachment Button */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          style={styles.attachBtn}
          disabled={isUploading}
          type="button"
        >
          📎
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: "none" }}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        {/* Text Input */}
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          style={styles.input}
          disabled={isUploading}
        />

        {/* Send Button */}
        <button 
          onClick={handleSend} 
          style={{
            ...styles.sendBtn,
            ...(text.trim() ? styles.sendBtnActive : {})
          }}
          disabled={!text.trim() || isUploading}
        >
          إرسال
        </button>
      </div>
    </div>
  );
}

const styles = {
  inputBox: { 
    padding: "12px 20px", 
    background: "#1e293b", 
    borderTop: "1px solid #334155",
  },
  replyPreview: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#0f172a",
    borderRadius: "8px",
    marginBottom: "8px",
    borderRight: "3px solid #38bdf8",
  },
  replyContent: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
  },
  replyLabel: {
    fontSize: "12px",
    color: "#38bdf8",
    fontWeight: "bold",
  },
  replyText: {
    fontSize: "12px",
    color: "#94a3b8",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  closeReply: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "14px",
    padding: "4px",
  },
  uploadProgress: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 0",
    marginBottom: "8px",
  },
  progressBar: {
    flex: 1,
    height: "4px",
    background: "#334155",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#e94560",
    transition: "width 0.3s",
  },
  progressText: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  inputArea: { 
    display: "flex", 
    gap: 10,
    alignItems: "center",
  },
  attachBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  input: { 
    flex: 1, 
    padding: "12px 16px", 
    borderRadius: "12px", 
    border: "1px solid #334155", 
    background: "#0f172a",
    color: "#e2e8f0",
    outline: "none",
    fontSize: "15px",
    transition: "border-color 0.2s",
  },
  sendBtn: { 
    padding: "10px 20px", 
    borderRadius: "12px", 
    border: "none", 
    background: "#334155", 
    color: "#94a3b8", 
    cursor: "not-allowed",
    fontWeight: "bold",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  sendBtnActive: {
    background: "#e94560",
    color: "#fff",
    cursor: "pointer",
  },
  noAccess: { 
    padding: "15px", 
    textAlign: "center", 
    color: "#94a3b8", 
    fontSize: "13px", 
    background: "#1e293b",
    borderTop: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  lockIcon: {
    fontSize: "16px",
  },
};