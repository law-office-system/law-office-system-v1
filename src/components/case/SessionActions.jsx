import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

const statusOptions = [
  { value: 'scheduled', label: 'مجدولة', icon: Calendar },
  { value: 'in-progress', label: 'جارية', icon: Clock },
  { value: 'completed', label: 'منعقدة', icon: CheckCircle },
  { value: 'postponed', label: 'مؤجلة', icon: Clock },
  { value: 'cancelled', label: 'ملغاة', icon: XCircle },
];

export default function SessionActions({ session, onEdit, onDelete, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusSelect = (status) => {
    onStatusChange?.(status);
    setShowStatusMenu(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
          <button
            onClick={() => { onEdit?.(); setOpen(false); }}
            className="w-full px-4 py-2 text-right text-gray-300 hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <Edit2 size={14} />
            تعديل
          </button>

          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="w-full px-4 py-2 text-right text-gray-300 hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <CheckCircle size={14} />
            تغيير الحالة
          </button>

          {showStatusMenu && (
            <div className="bg-gray-900 mx-2 rounded-lg my-1 py-1">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusSelect(option.value)}
                    className={`w-full px-4 py-2 text-right text-sm flex items-center gap-2 transition-colors ${
                      session.status === option.value
                        ? 'text-blue-400 bg-blue-900/30'
                        : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <Icon size={14} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-700 my-1" />

          <button
            onClick={() => { onDelete?.(); setOpen(false); }}
            className="w-full px-4 py-2 text-right text-red-400 hover:bg-red-900/30 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} />
            حذف
          </button>
        </div>
      )}
    </div>
  );
}
