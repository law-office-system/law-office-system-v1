import {
  EmailAuthProvider,
  linkWithCredential,
  linkWithPhoneNumber,
  sendEmailVerification,
  RecaptchaVerifier,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth } from "../firebaseAuth";
import { db } from "../firebaseDb";

// ══════ إضافة بريد لحساب مسجل بالهاتف ══════
export async function linkEmailToCurrentUser(email, password) {
  const user = auth.currentUser;
  if (!user) throw new Error("no-user");

  const credential = EmailAuthProvider.credential(
    email.trim().toLowerCase(),
    password
  );

  // يربط البريد بنفس حساب Firebase (نفس UID)
  await linkWithCredential(user, credential);

  // تحديث مستند المستخدم في Firestore
  await updateDoc(doc(db, "users", user.uid), {
    email: email.trim().toLowerCase(),
    emailVerified: false,
  });

  // إرسال رابط التحقق للبريد الجديد
  await sendEmailVerification(user);
}

// ══════ إضافة هاتف لحساب مسجل بالبريد ══════
let profileVerifier = null;

export function ensureProfileRecaptcha(containerId) {
  if (profileVerifier) {
    try { profileVerifier.clear(); } catch {}
  }
  profileVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
  return profileVerifier;
}

// المرحلة 1: إرسال رمز SMS
export async function sendPhoneLinkCode(phone) {
  const user = auth.currentUser;
  if (!user) throw new Error("no-user");

  const verifier = ensureProfileRecaptcha("recaptcha-container-profile");
  const confirmation = await linkWithPhoneNumber(user, phone, verifier);
  return confirmation;
}

// المرحلة 2: تأكيد الرمز
export async function confirmPhoneLink(confirmation, code) {
  const result = await confirmation.confirm(code);
  await updateDoc(doc(db, "users", result.user.uid), {
    phoneNumber: result.user.phoneNumber,
  });
  return result.user;
}