import { getIdToken } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export async function getFirebaseIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth || !auth.currentUser) return null;
  const token = await getIdToken(auth.currentUser, true);
  return token;
}
