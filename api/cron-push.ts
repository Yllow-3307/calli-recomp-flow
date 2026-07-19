// ─────────────────────────────────────────────────────────────────────────────
// Vercel Cron : rappel push quotidien si pas de séance enregistrée aujourd'hui.
// Déclenché 1×/jour (configurable dans vercel.json ou projet Vercel → Cron Jobs).
// Route : GET /api/cron-push
// ─────────────────────────────────────────────────────────────────────────────
import type { NitroAppPlugin } from "nitro/types";

export default defineEventHandler(async (event) => {
  // Vérification du token secret pour éviter les appels non autorisés
  const auth = getHeader(event, "authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return { ok: false, error: "missing env" };
    }

    // Client avec clé service (bypass RLS pour lire les subs)
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer tous les abonnements
    const { data: subs, error: subsErr } = await sb
      .from("push_subscriptions")
      .select("*, auth.users!inner(email)");

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return { ok: true, sent: 0, message: "aucun abonné" };
    }

    const today = new Date().toISOString().slice(0, 10);
    let sent = 0;

    for (const sub of subs) {
      try {
        // 2. Vérifier si l'utilisateur a déjà une séance aujourd'hui
        const { data: sessions } = await sb
          .from("workout_sessions")
          .select("id")
          .eq("user_id", sub.user_id)
          .gte("date", today)
          .lt("date", today + "T23:59:59")
          .limit(1);

        if (sessions && sessions.length > 0) continue; // déjà entraîné

        // 3. Vérifier si l'utilisateur est onboardé
        const { data: profile } = await sb
          .from("profiles")
          .select("onboarded, username")
          .eq("id", sub.user_id)
          .single();

        if (!profile?.onboarded) continue;

        // 4. Envoyer la notification push
        const webpush = await import("web-push");
        webpush.setVapidDetails(
          "mailto:louis@calli-recomp.app",
          process.env.VITE_VAPID_PUBLIC_KEY || "",
          process.env.VAPID_PRIVATE_KEY || "",
        );

        const payload = JSON.stringify({
          title: "Calli Recomp Tracker",
          body: profile.username
            ? `${profile.username}, ta séance du jour t'attend 💪`
            : "Ta séance du jour t'attend 💪",
          icon: "/icon-192.png",
          badge: "/favicon-32.png",
          tag: "workout-reminder",
          data: { url: "/seance" },
        });

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
          },
          payload,
        );
        sent++;
      } catch (err: any) {
        // Si le endpoint est invalide (désabonné), supprimer la subscription
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
        }
        console.error("Erreur push pour", sub.user_id, err?.message);
      }
    }

    return { ok: true, sent, total: subs.length };
  } catch (err: any) {
    console.error("Erreur cron push:", err);
    return { ok: false, error: err.message };
  }
});
