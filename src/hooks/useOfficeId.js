/**
 * useOfficeId.js â€” Ø§Ù„Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„ÙˆØ­ÙŠØ¯Ø© Ù„Ø¬Ù„Ø¨ officeId
 *
 * Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…:
 *   const { officeId, ready } = useOfficeId();
 *   if (!ready) return <Spinner />;
 *   getCases(officeId); // âœ… ÙƒÙ„ Ø®Ø¯Ù…Ø© Ù„Ø§Ø²Ù… ØªØ³ØªÙ‚Ø¨Ù„Ù‡ ÙƒØ¨Ø§Ø±Ø§Ù…ÙŠØªØ± Ø¥Ø¬Ø¨Ø§Ø±ÙŠ
 */
import { useAuth } from "../context/AuthContext";

export function useOfficeId() {
  const { officeId, userData, loading } = useAuth();

  if (loading) {
    return { officeId: null, ready: false, error: null };
  }

  // super_admin Ù…Ø¹ÙÙ‰ (Ø¨ÙŠØ´ÙˆÙ ÙƒÙ„ Ø­Ø§Ø¬Ø© Ø¹Ø¨Ø± Rules)
  if (userData?.role === "super_admin") {
    return { officeId: null, ready: true, isSuperAdmin: true, error: null };
  }

  if (!officeId) {
    return {
      officeId: null,
      ready: false,
      error: "Ø­Ø³Ø§Ø¨Ùƒ ØºÙŠØ± Ù…Ø±ØªØ¨Ø· Ø¨Ù…ÙƒØªØ¨ â€” ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„Ù…ÙƒØªØ¨ Ù„Ø¥Ø¶Ø§ÙØªÙƒ",
    };
  }

  return { officeId, ready: true, isSuperAdmin: false, error: null };
}

export default useOfficeId;
