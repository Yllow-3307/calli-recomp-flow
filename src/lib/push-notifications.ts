// ─────────────────────────────────────────────────────────────────────────────
// Notifications push (web-push) — V11.0
// Subscribe / unsubscribe via PushManager + Supabase.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";

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
    const { error } = await (supabase as any).from("push_subscriptions").upsert(
      {
        endpoint: sub.endpoint,
        keys: subJson.keys as Record<string, string>,
        user_id: (await supabase.auth.getSession()).data.session?.user?.id,
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      // Si l'erreur est "duplicate key", on supprime l'ancien et on réessaie
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        await (supabase as any).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        const { error: retryErr } = await (supabase as any).from("push_subscriptions").insert({
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
  } catch (err: any) {
    console.error("Erreur subscribe push:", err);
    return { ok: false, error: err.message || "Erreur d'abonnement" };
  }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const sub = await getExistingSubscription();
    if (sub) await sub.unsubscribe();
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    if (userId) {
      const { error } = await (supabase as any)
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    }
    return { ok: true };
  } catch (err: any) {
    console.error("Erreur unsubscribe push:", err);
    return { ok: false, error: err.message || "Erreur de désabonnement" };
  }
}
