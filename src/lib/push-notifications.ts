// ─────────────────────────────────────────────────────────────────────────────
// Notifications push (web-push) — V11.0
// Subscribe / unsubscribe via PushManager + Supabase.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";

/** Ligne de la table push_subscriptions (non présente dans les types générés). */
interface PushSubscriptionRow {
  endpoint: string;
  keys: Record<string, string>;
  user_id: string;
}

/**
 * Accès typé minimal à la table `push_subscriptions` (absente des types Supabase
 * auto-générés). On expose juste les méthodes utilisées par ce module.
 */
type PushTable = {
  upsert: (
    row: PushSubscriptionRow,
    opts?: { onConflict?: string },
  ) => Promise<{ error: { message?: string } | null }>;
  insert: (row: PushSubscriptionRow) => Promise<{ error: { message?: string } | null }>;
  delete: () => {
    eq: (col: string, val: string) => Promise<{ error: { message?: string } | null }>;
  };
};

const pushTable = () => {
  const db = supabase as unknown as { from: (table: string) => PushTable };
  return db.from("push_subscriptions");
};

export function getVapidPublicKey(): string {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
}

export async function isPushSupported(): Promise<boolean> {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!(await isPushSupported())) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const vapidKey = getVapidPublicKey();
    if (!vapidKey) return { ok: false, error: "Clé VAPID publique manquante" };
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    const subJson = sub.toJSON();
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) return { ok: false, error: "Non connecté" };
    const { error } = await pushTable().upsert(
      {
        endpoint: sub.endpoint,
        keys: subJson.keys as Record<string, string>,
        user_id: userId,
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      // Si l'erreur est "duplicate key", on supprime l'ancien et on réessaie
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        await pushTable().delete().eq("endpoint", sub.endpoint);
        const { error: retryErr } = await pushTable().insert({
          user_id: userId,
          endpoint: sub.endpoint,
          keys: subJson.keys as Record<string, string>,
        });
        if (retryErr) throw retryErr;
      } else {
        throw error;
      }
    }
    return { ok: true };
  } catch (err: unknown) {
    console.error("Erreur subscribe push:", err);
    const message = err instanceof Error ? err.message : "Erreur d'abonnement";
    return { ok: false, error: message };
  }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const sub = await getExistingSubscription();
    if (!sub) return { ok: true };
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    const { error } = await pushTable().delete().eq("endpoint", endpoint);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    console.error("Erreur unsubscribe push:", err);
    const message = err instanceof Error ? err.message : "Erreur de désabonnement";
    return { ok: false, error: message };
  }
}
