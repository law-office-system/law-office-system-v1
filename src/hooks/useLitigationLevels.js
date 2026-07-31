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

export function useLitigationLevels(caseId) {
  const [levels, setLevels] = useState([]);
  const [activeLevel, setActiveLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load levels
  useEffect(() => {
    if (!caseId) {
      setLevels([]);
      setActiveLevel(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToLitigationLevels(caseId, (updatedLevels) => {
      setLevels(updatedLevels);
      const active = updatedLevels.find((l) => l.isActive);
      setActiveLevel(active || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [caseId]);

  // Create next level (appeal, cassation, etc.)
  const createNextLevel = useCallback(
    async (currentLevelId, newLevelData) => {
      try {
        setLoading(true);
        const result = await createNextLitigationLevel(
          caseId,
          currentLevelId,
          newLevelData
        );
        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [caseId]
  );

  // Update level status
  const updateLevel = useCallback(
    async (levelId, updates) => {
      try {
        await updateLitigationLevel(levelId, updates);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    []
  );

  // Mark judgment
  const markJudgment = useCallback(
    async (levelId, judgmentData) => {
      try {
        await markJudgmentIssued(levelId, judgmentData);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    []
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