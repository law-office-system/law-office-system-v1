import React from 'react';
import { CalendarX, Plus } from 'lucide-react';

export default function SessionEmpty({ onAddClick }) {
  return (
    <div style={{
      background: "#1e293b",
      border: "1px dashed rgba(55, 65, 81, 0.5)",
      borderRadius: 16,
      padding: "40px 24px",
      textAlign: "center",
    }}>
      <CalendarX size={48} color="#374151" strokeWidth={1.5} style={{ margin: "0 auto 16px" }} />
      <h3 style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#9ca3af",
        margin: "0 0 8px 0",
      }}>
        لا توجد جلسات مسجلة
      </h3>
      <p style={{
        color: "#6b7280",
        fontSize: 14,
        margin: "0 0 20px 0",
      }}>
        لم يتم إضافة أي جلسات لهذه القضية بعد
      </p>
      {onAddClick && (
        <button
          onClick={onAddClick}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "#d97706",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "inherit",
            boxShadow: "0 4px 16px rgba(217, 119, 6, 0.3)",
            transition: "all 0.2s ease",
          }}
        >
          <Plus size={16} />
          إضافة جلسة جديدة
        </button>
      )}
    </div>
  );
}