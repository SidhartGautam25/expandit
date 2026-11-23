import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActiveSessionSnapshot } from "../types/session";

const ACTIVE_SESSION_KEY = "@land_capture_active_session_v1";

/**
 * Saves the current active session snapshot asynchronously to storage.
 */
export async function saveSessionSnapshot(snapshot: ActiveSessionSnapshot): Promise<void> {
  try {
    const serialized = JSON.stringify(snapshot);
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, serialized);
  } catch (error) {
    console.error("Failed to save active game session:", error);
  }
}

/**
 * Reads and returns the saved active session snapshot, or null if none exists or if finished.
 */
export async function loadSessionSnapshot(): Promise<ActiveSessionSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw || raw === "undefined" || raw === "null") return null;
    const snapshot: ActiveSessionSnapshot = JSON.parse(raw);
    // If the saved snapshot is already finished (winner is set), ignore it
    if (snapshot.winner !== null) {
      await clearSessionSnapshot();
      return null;
    }
    return snapshot;
  } catch (error) {
    console.error("Failed to load active game session:", error);
    return null;
  }
}

/**
 * Removes any stored active game session from storage.
 */
export async function clearSessionSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear active game session:", error);
  }
}
