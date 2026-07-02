import { useEffect, useRef, useState, useCallback } from "react";

/**
 * 💬 UI Component لعرض الرسائل
 * كل الـ data والـ logic بيجي من بره كـ props
 */
export default function Messages({
  messages,
  groupedMessages,
  text,
  setText,
  replyTo,
  setReplyTo,
  sending,
  onSend,
  onDelete,
  currentUser,
  typingUsers = [],
  canSend = true,
}) {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // التمرير التلقائي للأسفل
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // إرسال رسالة
  const handleSend = async () => {
    if (!text.trim() || !canSend || sending) return;
    await onSend();
  };

  // حالة "يكتب الآن"
  const handleTyping = useCallback(() => {
    if (!currentUser?.uid) return;
    // الـ typing logic بيكون في الـ parent (Chat.jsx)
    // هنا بس بنستدعي callback لو موجود
  }, [currentUser]);

  // حذف رسالة
  const handleDelete = async (messageId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    await onDelete(messageId);
    setSelectedMessage(null);
  };

  // الرد على رسالة
  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleKeyDown = (e) => { 
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(); 
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleDateString('ar-EG', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  if (!messages) return <div style={styles.center}>⏳ جاري التحميل...</div>;

  return (
    <div style={styles.container}>
      {/* منطقة الرسائل */}
      <div 
        ref={messagesContainerRef}
        style={styles.chatBox}
      >
        {Object.entries(groupedMessages || {}).map(([date, dateMessages]) => (
          <div key={date}>
            <div style={styles.dateDivider}>
              <span style={styles.dateText}>
                {date !== 'unknown' ? formatDate(dateMessages[0]?.createdAt) : 'تاريخ غير معروف'}
              </span>
            </div>
            {dateMessages.map((m) => {
              const isMe = m.senderId === currentUser?.uid;
              const isSelected = selectedMessage === m.id;

              return (
                <div 
                  key={m.id} 
                  style={{
                    ...styles.messageWrapper,
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  {m.replyTo && (
                    <div style={styles.replyPreview}>
                      <span style={styles.replyName}>{m.replyTo.senderName}</span>
                      <span style={styles.replyText}>{m.replyTo.text}</span>
                    </div>
                  )}

                  <div 
                    style={{
                      ...styles.bubble,
                      background: isMe ? '#dcf8c6' : '#fff',
                      border: isMe ? '1px solid #c5e1a5' : '1px solid #e0e0e0',
                    }}
                    onClick={() => setSelectedMessage(isSelected ? null : m.id)}
                  >
                    <div style={styles.senderName}>
                      {isMe ? "أنت" : m.senderName}
                    </div>
                    <div style={styles.text}>{m.text}</div>

                    {m.fileUrl && m.type === 'image' && (
                      <img 
                        src={m.fileUrl} 
                        alt="مرفق" 
                        style={styles.imageAttachment}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(m.fileUrl, '_blank');
                        }}
                      />
                    )}
                    {m.fileUrl && m.type === 'file' && (
                      <a 
                        href={m.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={styles.fileAttachment}
                        onClick={(e) => e.stopPropagation()}
                      >
                        📎 {m.fileName || m.text}
                      </a>
                    )}

                    <div style={styles.time}>
                      {formatTime(m.createdAt)}
                      {isMe && (
                        <span style={{ marginRight: 5, color: m.seenBy?.length > 1 ? '#34b7f1' : '#aaa' }}>
                          {m.seenBy?.length > 1 ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div style={styles.actions}>
                      <button onClick={() => handleReply(m)} style={styles.actionBtn}>↩️ رد</button>
                      {isMe && (
                        <button onClick={() => handleDelete(m.id)} style={styles.actionBtn}>🗑️ حذف</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div style={styles.typingIndicator}>
            <div style={styles.typingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span style={styles.typingText}>
              {typingUsers.join(", ")} يكتب...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply Bar */}
      {replyTo && (
        <div style={styles.replyBar}>
          <div style={styles.replyInfo}>
            <span style={styles.replyLabel}>↩️ رد على:</span>
            <span style={styles.replyContent}>{replyTo.text}</span>
          </div>
          <button onClick={() => setReplyTo(null)} style={styles.closeReply}>✖</button>
        </div>
      )}

      {/* Input */}
      {canSend ? (
        <div style={styles.inputBox}>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            style={styles.input}
            placeholder={sending ? "جاري الإرسال..." : "اكتب رسالة..."}
            disabled={sending}
          />
          <button 
            onClick={handleSend} 
            style={{
              ...styles.sendBtn,
              opacity: sending || !text.trim() ? 0.6 : 1,
              cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
            }}
            disabled={sending || !text.trim()}
          >
            {sending ? "⏳" : "إرسال"}
          </button>
        </div>
      ) : (
        <div style={styles.readOnly}>🔒 لا تملك صلاحية الإرسال</div>
      )}
    </div>
  );
}

const styles = {
  container: { 
    display: "flex", 
    flexDirection: "column", 
    height: "100%", 
    background: "#f0f2f5",
    overflow: "hidden",
  },
  chatBox: { 
    flex: 1, 
    overflowY: "auto", 
    overflowX: "hidden",
    padding: 20, 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 8,
    scrollBehavior: "smooth",
  },
  dateDivider: {
    textAlign: 'center',
    margin: '15px 0',
    position: 'relative',
  },
  dateText: {
    background: '#e1f3fb',
    color: '#1a1a1a',
    padding: '5px 15px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '75%',
    position: 'relative',
  },
  bubble: { 
    padding: "10px 15px", 
    borderRadius: 18, 
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  senderName: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#007bff', 
    marginBottom: 4 
  },
  text: { 
    fontSize: 15, 
    color: "#333",
    lineHeight: 1.4,
  },
  time: { 
    fontSize: 10, 
    color: '#888', 
    marginTop: 5, 
    textAlign: 'right', 
    display: "flex", 
    justifyContent: "flex-end", 
    alignItems: "center" 
  },
  actions: {
    display: 'flex',
    gap: 5,
    marginTop: 5,
    padding: '0 10px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 4,
    transition: 'all 0.2s',
  },
  replyPreview: {
    background: '#f0f0f0',
    padding: '8px 12px',
    borderRadius: '12px 12px 0 0',
    borderRight: '3px solid #007bff',
    marginBottom: 2,
  },
  replyName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#007bff',
    display: 'block',
  },
  replyText: {
    fontSize: 12,
    color: '#666',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  replyBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 15px',
    background: '#fff',
    borderTop: '1px solid #e0e0e0',
    gap: 10,
  },
  replyInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  replyLabel: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
  },
  replyContent: {
    fontSize: 12,
    color: '#666',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  closeReply: {
    background: 'none',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: 16,
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 15px',
    alignSelf: 'flex-start',
  },
  typingDots: {
    display: 'flex',
    gap: 3,
  },
  typingText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  inputBox: { 
    display: "flex", 
    padding: 15, 
    background: "#fff", 
    borderTop: "1px solid #e0e0e0", 
    gap: 10,
    flexShrink: 0,
  },
  input: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 25, 
    border: "1px solid #ddd", 
    outline: 'none',
    fontSize: 14,
  },
  sendBtn: { 
    padding: "10px 20px", 
    borderRadius: 25, 
    border: "none", 
    background: "#e94560", 
    color: "#fff", 
    cursor: "pointer",
    fontWeight: 'bold',
    fontSize: 14,
    transition: 'all 0.2s',
  },
  readOnly: { 
    padding: 15, 
    textAlign: "center", 
    color: "#777", 
    background: "#f4f4f4", 
    fontSize: 13, 
    borderTop: "1px solid #ddd",
    flexShrink: 0,
  },
  center: { 
    textAlign: 'center', 
    padding: 40, 
    color: '#999' 
  },
  imageAttachment: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
    marginTop: '8px',
    cursor: 'pointer',
    objectFit: 'cover',
  },
  fileAttachment: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: '#f0f0f0',
    borderRadius: '8px',
    marginTop: '8px',
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '500',
  },
};