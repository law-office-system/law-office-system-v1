import { db } from "./firebase-node.js";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function migrateRoomMembers() {
  const snap = await getDocs(collection(db, "roomMembers"));

  let updated = 0;

  for (const d of snap.docs) {
    const data = d.data();

    if (data.userId && !data.uid) {
      await updateDoc(doc(db, "roomMembers", d.id), {
        uid: data.userId,
        userId: null,
      });

      updated++;
    }
  }

  console.log(`✅ Migration Done: ${updated} documents updated`);
}

migrateRoomMembers();