import { useState, useEffect, useCallback } from 'react';

import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

import { useAuth } from '../context/AuthContext';

import { db } from "../firebaseDb";

// ✅ المقارن الموحّد: الأحدث أولاً ← الأولوية ← موعد الاستحقاق
const toMillis = (x) => {
  if (!x) return 0;
  if (x?.toDate) return x.toDate().getTime();
  const d = new Date(x);
  return isNaN(d) ? 0 : d.getTime();
};

function sortTasks(data) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  data.sort((a, b) => {
    // 1) الأحدث أولاً
    const c = toMillis(b.createdAt) - toMillis(a.createdAt);
    if (c !== 0) return c;
    // 2) الأولوية
    const p = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    if (p !== 0) return p;
    // 3) الأقرب استحقاقًا
    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
  });
  return data;
}

export function useAdminTasks(caseId = null) {
  const { userData } = useAuth();
  const officeId = userData?.officeId;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch tasks with getDocs (not onSnapshot)
  useEffect(() => {
    if (!caseId && !officeId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        let q;
        if (caseId) {
          q = query(
            collection(db, 'adminTasks'),
            where('caseId', '==', caseId)
          );
        } else {
          q = query(
            collection(db, 'adminTasks'),
            where('officeId', '==', officeId)
          );
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // ✅ الأحدث أولاً
        sortTasks(data);

        if (isMounted) {
          setTasks(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching admin tasks:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [caseId, officeId]);

  const addTask = useCallback(async (taskData) => {
    try {
      const docRef = await addDoc(collection(db, 'adminTasks'), {
        ...taskData,
        caseId: caseId || taskData.caseId || 'general',
        officeId,
        status: taskData.status || 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // ✅ Optimistic update — الجديد في قمة القائمة مباشرة
      const newTask = {
        id: docRef.id,
        ...taskData,
        caseId: caseId || taskData.caseId || 'general',
        officeId,
        status: taskData.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTasks(prev => sortTasks([newTask, ...prev]));

      return { id: docRef.id, ...taskData };
    } catch (err) {
      console.error('Error adding task:', err);
      throw err;
    }
  }, [caseId, officeId]);

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      await updateDoc(doc(db, 'adminTasks', taskId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Optimistic update
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
      ));
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await deleteDoc(doc(db, 'adminTasks', taskId));

      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  }, []);

  const toggleTaskStatus = useCallback(async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, 'adminTasks', taskId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        completedAt: newStatus === 'completed' ? serverTimestamp() : null,
      });

      // Optimistic update
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? new Date() : null, updatedAt: new Date() }
          : t
      ));
    } catch (err) {
      console.error('Error toggling task status:', err);
      throw err;
    }
  }, []);

  // Refresh function
  const refresh = useCallback(async () => {
    if (!caseId && !officeId) return;

    setLoading(true);
    try {
      let q;
      if (caseId) {
        q = query(collection(db, 'adminTasks'), where('caseId', '==', caseId));
      } else {
        q = query(collection(db, 'adminTasks'), where('officeId', '==', officeId));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ الأحدث أولاً
      sortTasks(data);

      setTasks(data);
    } catch (err) {
      console.error('Error refreshing tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [caseId, officeId]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    refresh,
  };
}