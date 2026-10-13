// ============================================================
// 📁 FILE: src/hooks/useLitigationLevels.js
// Description: React hook for litigation levels management
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  getLitigationLevelsByCase,
  getActiveLitigationLevel,
  createNextLitigationLevel,
  updateLitigationLevel,
  markJudgmentIssued,
  markJudgmentAnnounced,
  subscribeToLitigationLevels,
} from "../services/litigationLevels";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseDb";
import { useAuth } from "../context/AuthContext";

export function useLitigationLevels(caseId) {
  const { userData } = useAuth();
  const officeId = userData?.officeId || null;

  const [levels, setLevels] = useState([]);
  const [activeLevel, setActiveLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load levels
  useEffect(() => {
    if (!caseId || !officeId) {
      setLevels([]);
      setActiveLevel(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to real-time updates — ✅ التوقيع الجديد: (caseId, officeId, callback, onError)
    const unsubscribe = subscribeToLitigationLevels(
      caseId,
      officeId,
      async (updatedLevels) => {
        // ═══════════════════════════════════════════════════════════════
        // FIX: If no levels exist (legacy case), create a virtual level
        // from the case data so old cases still work
        // ═══════════════════════════════════════════════════════════════
        if (updatedLevels.length === 0) {
          try {
            const caseRef = doc(db, "cases", caseId);
            const caseSnap = await getDoc(caseRef);

            if (caseSnap.exists()) {
              const caseData = caseSnap.data();
              const legacyLevel = {
                id: `legacy_${caseId}`,
                caseId,
                officeId,
                levelType: "first_instance",
                court: caseData.court || "",
                circuit: caseData.department || "",
                caseNumber: caseData.caseSerial || "",
                caseYear: parseInt(caseData.caseYear) || new Date().getFullYear(),
                status: "ongoing",
                isActive: true,
                isCompleted: false,
                order: 1,
                sessionCount: (caseData.sessions || []).length,
                filingDate: caseData.createdAt || null,
                judgmentDate: null,
                judgmentAnnouncementDate: null,
                completionDate: null,
                judgmentResult: null,
                judgmentSummary: "",
                // Flag to identify legacy virtual levels
                _isLegacy: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              setLevels([legacyLevel]);
              setActiveLevel(legacyLevel);
            } else {
              setLevels([]);
              setActiveLevel(null);
            }
          } catch (err) {
            console.error("Error creating legacy level:", err);
            setLevels([]);
            setActiveLevel(null);
          }
        } else {
          setLevels(updatedLevels);
          const active = updatedLevels.find((l) => l.isActive);
          setActiveLevel(active || null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to litigation levels:", err);
        setError(err?.message || "خطأ في تحميل مستويات التقاضي");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [caseId, officeId]);

  // Create next level (appeal, cassation, etc.)
  const createNextLevel = useCallback(
    async (currentLevelId, newLevelData) => {
      if (!officeId) {
        const err = new Error("مكتب المستخدم غير معروف");
        setError(err.message);
        throw err;
      }
      try {
        setLoading(true);

        // If current level is legacy, we need to create a real one first
        if (currentLevelId.startsWith("legacy_")) {
          // Create the initial real level first — ✅ التوقيع: (caseId, levelData, officeId)
          const { createInitialLitigationLevel } = await import("../services/litigationLevels");
          const caseRef = doc(db, "cases", caseId);
          const caseSnap = await getDoc(caseRef);
          const caseData = caseSnap.exists() ? caseSnap.data() : {};

          const initialLevel = await createInitialLitigationLevel(
            caseId,
            {
              levelType: "first_instance",
              court: caseData.court || "",
              circuit: caseData.department || "",
              caseNumber: caseData.caseSerial || "",
              caseYear: parseInt(caseData.caseYear) || new Date().getFullYear(),
              status: "ongoing",
              filingDate: caseData.createdAt || null,
            },
            officeId
          );

          // Now create the next level from the real initial level — ✅ التوقيع: (caseId, currentLevelId, newLevelData, officeId)
          const result = await createNextLitigationLevel(
            caseId,
            initialLevel.id,
            newLevelData,
            officeId
          );
          return result;
        }

        // ✅ التوقيع: (caseId, currentLevelId, newLevelData, officeId)
        const result = await createNextLitigationLevel(
          caseId,
          currentLevelId,
          newLevelData,
          officeId
        );
        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [caseId, officeId]
  );

  // Update level status
  const updateLevel = useCallback(
    async (levelId, updates) => {
      if (!officeId) {
        const err = new Error("مكتب المستخدم غير معروف");
        setError(err.message);
        throw err;
      }
      try {
        // Skip if legacy level (not in Firebase)
        if (levelId.startsWith("legacy_")) {
          console.warn("Cannot update legacy level directly. Run migration first.");
          return;
        }
        // ✅ التوقيع: (levelId, updates, officeId)
        await updateLitigationLevel(levelId, updates, officeId);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [officeId]
  );

  // Mark judgment
  const markJudgment = useCallback(
    async (levelId, judgmentData) => {
      if (!officeId) {
        const err = new Error("مكتب المستخدم غير معروف");
        setError(err.message);
        throw err;
      }
      try {
        if (levelId.startsWith("legacy_")) {
          console.warn("Cannot mark judgment on legacy level directly. Run migration first.");
          return;
        }
        // ✅ التوقيع: (levelId, officeId, judgmentData)
        await markJudgmentIssued(levelId, officeId, judgmentData);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [officeId]
  );

  // Get next possible levels based on current level
  const getNextPossibleLevels = useCallback((currentLevelType) => {
    const levelOrder = ["first_instance", "appeal", "cassation", "retrial", "execution"];
    const currentIndex = levelOrder.indexOf(currentLevelType);

    if (currentIndex === -1 || currentIndex >= levelOrder.length - 1) {
      return [];
    }

    const nextLevels = [];

    // Appeal is always available after first instance
    if (currentLevelType === "first_instance") {
      nextLevels.push({
        value: "appeal",
        label: "استئناف",
        description: "الطعن على الحكم أمام محكمة الاستئناف",
      });
    }

    // Cassation is available after appeal
    if (currentLevelType === "appeal") {
      nextLevels.push({
        value: "cassation",
        label: "نقض",
        description: "الطعن على الحكم أمام محكمة النقض",
      });
    }

    // Retrial is available after cassation
    if (currentLevelType === "cassation") {
      nextLevels.push({
        value: "retrial",
        label: "التماس إعادة النظر",
        description: "طلب إعادة النظر في الحكم",
      });
    }

    // Execution is available after any judgment
    if (["first_instance", "appeal", "cassation", "retrial"].includes(currentLevelType)) {
      // Only add execution if not already the current level
      nextLevels.push({
        value: "execution",
        label: "تنفيذ",
        description: "بدء إجراءات التنفيذ",
      });
    }

    return nextLevels;
  }, []);

  return {
    levels,
    activeLevel,
    loading,
    error,
    createNextLevel,
    updateLevel,
    markJudgment,
    getNextPossibleLevels,
  };
}

export default useLitigationLevels;