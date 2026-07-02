import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';  // ← NEW

export function useJudgments(caseId = null) {
  const { userData } = useAuth();  // ← NEW
  const officeId = userData?.officeId;  // ← NEW

  const [judgments, setJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ✅ بناء الـ query حسب المتاح
    let q;

    if (caseId) {
      // جلب أحكام قضية معينة
      q = query(
        collection(db, 'judgments'),
        where('caseId', '==', caseId)
      );
    } else if (officeId) {
      // جلب كل أحكام المكتب
      q = query(
        collection(db, 'judgments'),
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
        // Sort by date descending
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setJudgments(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching judgments:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [caseId, officeId]);  // ← added officeId

  const addJudgment = useCallback(async (judgmentData) => {
    try {
      const docRef = await addDoc(collection(db, 'judgments'), {
        ...judgmentData,
        caseId: caseId || judgmentData.caseId || 'general',
        officeId,  // ← NEW
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: docRef.id, ...judgmentData };
    } catch (err) {
      console.error('Error adding judgment:', err);
      throw err;
    }
  }, [caseId, officeId]);  // ← added officeId

  const updateJudgment = useCallback(async (judgmentId, updates) => {
    try {
      const docRef = doc(db, 'judgments', judgmentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating judgment:', err);
      throw err;
    }
  }, []);

  const deleteJudgment = useCallback(async (judgmentId) => {
    try {
      await deleteDoc(doc(db, 'judgments', judgmentId));
    } catch (err) {
      console.error('Error deleting judgment:', err);
      throw err;
    }
  }, []);

  return { 
    judgments, 
    loading, 
    error, 
    addJudgment, 
    updateJudgment, 
    deleteJudgment 
  };
}