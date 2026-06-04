export const parseDate = (date) => {
  if (!date) return null;

  // Firestore Timestamp
  if (typeof date === "object" && date.toDate) {
    return date.toDate();
  }

  // Date object
  if (date instanceof Date) {
    return date;
  }

  // String
  if (typeof date === "string") {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};