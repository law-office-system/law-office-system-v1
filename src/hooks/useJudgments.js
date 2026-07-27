import { useState, useEffect, useCallback } from 'react';
import { 
  db,
  collection, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
} from '../firebase';
import { useAuth } from '../context/AuthContext';

export function useJudgments(caseId = null) {
  const { userData } = useAuth();
  const officeId = userData?.officeId;

  const [judgments, setJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch judgments with getDocs (not onSnapshot)
  useEffect(() => {
    if (!caseId && !officeId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchJudgments = async () => {
      setLoading(true);
      try {
        let q;
        if (caseId) {
          q = query(
            collection(db, 'judgments'),
            where('caseId', '==', caseId)
          );
        } else {
          q = query(
            collection(db, 'judgments'),
            where('officeId', '==', officeId)
          );
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by date descending
        data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (isMounted) {
          setJudgments(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching judgments:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchJudgments();

    return () => {
      isMounted = false;
    };
  }, [caseId, officeId]);

  const addJudgment = useCallback(async (judgmentData) => {
    try {
      const docRef = await addDoc(collection(db, 'judgments'), {
        ...judgmentData,
        caseId: caseId || judgmentData.caseId || 'general',
        officeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Optimistic update
      const newJudgment = {
        id: docRef.id,
        ...judgmentData,
        caseId: caseId || judgmentData.caseId || 'general',
        officeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setJudgments(prev => [...prev, newJudgment].sort((a, b) => 
        new Date(b.date || 0) - new Date(a.date || 0)
      ));

      return { id: docRef.id, ...judgmentData };
    } catch (err) {
      console.error('Error adding judgment:', err);
      throw err;
    }
  }, [caseId, officeId]);

  const updateJudgment = useCallback(async (judgmentId, updates) => {
    try {
      await updateDoc(doc(db, 'judgments', judgmentId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Optimistic update
      setJudgments(prev => prev.map(j => 
        j.id === judgmentId ? { ...j, ...updates, updatedAt: new Date() } : j
      ));
    } catch (err) {
      console.error('Error updating judgment:', err);
      throw err;
    }
  }, []);

  const deleteJudgment = useCallback(async (judgmentId) => {
    try {
      await deleteDoc(doc(db, 'judgments', judgmentId));

      // Optimistic update
      setJudgments(prev => prev.filter(j => j.id !== judgmentId));
    } catch (err) {
      console.error('Error deleting judgment:', err);
      throw err;
    }
  }, []);

  const toggleFollowUp = useCallback(async (judgmentId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, 'judgments', judgmentId), {
        needsFollowUp: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Optimistic update
      setJudgments(prev => prev.map(j => 
        j.id === judgmentId ? { ...j, needsFollowUp: newStatus, updatedAt: new Date() } : j
      ));
    } catch (err) {
      console.error('Error toggling follow up:', err);
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
        q = query(collection(db, 'judgments'), where('caseId', '==', caseId));
      } else {
        q = query(collection(db, 'judgments'), where('officeId', '==', officeId));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setJudgments(data);
    } catch (err) {
      console.error('Error refreshing judgments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [caseId, officeId]);

  return { 
    judgments, 
    loading, 
    error, 
    addJudgment, 
    updateJudgment, 
    deleteJudgment,
    toggleFollowUp,
    refresh,
  };
}