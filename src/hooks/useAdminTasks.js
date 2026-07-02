import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';  // ← NEW

export function useAdminTasks(caseId = null) {
  const { userData } = useAuth();  // ← NEW
  const officeId = userData?.officeId;  // ← NEW

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ✅ بناء الـ query حسب المتاح
    let q;

    if (caseId) {
      // جلب مهام قضية معينة
      q = query(
        collection(db, 'adminTasks'),
        where('caseId', '==', caseId)
      );
    } else if (officeId) {
      // جلب كل مهام المكتب
      q = query(
        collection(db, 'adminTasks'),
        where('officeId', '==', officeId)
      );
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by priority and due date
        data.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
        });
        setTasks(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching admin tasks:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [caseId, officeId]);  // ← added officeId

  const addTask = useCallback(async (taskData) => {
    try {
      const docRef = await addDoc(collection(db, 'adminTasks'), {
        ...taskData,
        caseId: caseId || taskData.caseId || 'general',
        officeId,  // ← NEW
        status: taskData.status || 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: docRef.id, ...taskData };
    } catch (err) {
      console.error('Error adding task:', err);
      throw err;
    }
  }, [caseId, officeId]);  // ← added officeId

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const docRef = doc(db, 'adminTasks', taskId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await deleteDoc(doc(db, 'adminTasks', taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  }, []);

  const toggleTaskStatus = useCallback(async (taskId, newStatus) => {
    try {
      const docRef = doc(db, 'adminTasks', taskId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        completedAt: newStatus === 'completed' ? serverTimestamp() : null,
      });
    } catch (err) {
      console.error('Error toggling task status:', err);
      throw err;
    }
  }, []);

  // NEW: Toggle follow up status
  const toggleFollowUp = useCallback(async (taskId, currentStatus) => {
    try {
      const docRef = doc(db, 'adminTasks', taskId);
      await updateDoc(docRef, {
        needsFollowUp: !currentStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error toggling follow up:', err);
      throw err;
    }
  }, []);

  return { 
    tasks, 
    loading, 
    error, 
    addTask, 
    updateTask, 
    deleteTask, 
    toggleTaskStatus,
    toggleFollowUp,
  };
}