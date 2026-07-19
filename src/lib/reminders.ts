// ─────────────────────────────────────────────────────────────────────────────
// Rappels locaux — 100% gratuits, aucun serveur.
// Réglages stockés sur l'appareil (localStorage). Notifications natives si le
// navigateur l'autorise (PWA installée recommandée sur iPhone), sinon toast in-app.
// NB : les vraies notifications push (quand l'app est fermée en permanence)
// nécessitent un petit serveur/cron — option documentée pour plus tard.
// ─────────────────────────────────────────────────────────────────────────────
import { toast } from "sonner";

export interface ReminderSettings {
  workout: boolean;
  workoutTime: string; // "HH:MM"
  hydration: boolean;
  /** rappel d'export toutes les 2 semaines, le jour choisi (rythme pesée) */
  exportReminder: boolean;
  /** 0 = dimanche … 6 = samedi */
  exportDay: number;
  /** date d'activation : ancre la quinzaine (ISO) */
  exportAnchor?: string;
}

const KEY = "calli-reminders-v1";
const FIRED_KEY = "calli-reminders-fired";

const DEFAULTS: ReminderSettings = {
  workout: false,
  workoutTime: "18:00",
  hydration: false,
  exportReminder: false,
  exportDay: 0,
};

export function loadReminderSettings(): ReminderSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as object) };
  } catch {
    return DEFAULTS;
  }
}

export function saveReminderSettings(s: ReminderSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

// Une seule notification par type et par jour
type FiredMap = Record<string, { workout?: boolean; hydration?: boolean; export?: boolean }>;

function loadFired(): FiredMap {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}") as FiredMap;
  } catch {
    return {};
  }
}

function markFired(kind: "workout" | "hydration" | "export", dayKey: string) {
  const fired = loadFired();
  fired[dayKey] = { ...fired[dayKey], [kind]: true };
  // Ne garder que la semaine courante pour ne pas gonfler le stockage
  const cutoff = Date.now() - 7 * 864e5;
  for (const k of Object.keys(fired)) if (new Date(k).getTime() < cutoff) delete fired[k];
  localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
}

async function notify(title: string, body: string) {
  if (notificationsSupported() && Notification.permission === "granted") {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, { body, icon: "/icon-192.png" });
        return;
      }
      new Notification(title, { body, icon: "/icon-192.png" });
      return;
    } catch {
      /* repli toast ci-dessous */
    }
  }
  toast.info(`${title} ${body}`, { duration: 8000 });
}

export interface ReminderContext {
  trainedToday: boolean;
  waterNow: number;
  waterTarget: number;
  sessionTitle: string;
}

/**
 * Boucle de rappels (toutes les 60 s + un tick immédiat).
 * Le check "maintenant >= heure choisie" sert aussi de rattrapage : ouvrir
 * l'app après l'heure déclenche quand même le rappel (une seule fois/jour).
 */
export function startReminderLoop(getContext: () => ReminderContext): () => void {
  const tick = () => {
    const s = loadReminderSettings();
    if (!s.workout && !s.hydration && !s.exportReminder) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dayKey = now.toISOString().slice(0, 10);
    const fired = loadFired();
    const ctx = getContext();

    if (s.workout && hhmm >= s.workoutTime && !ctx.trainedToday && !fired[dayKey]?.workout) {
      markFired("workout", dayKey);
      notify("💪 Séance du jour", `« ${ctx.sessionTitle} » t'attend — tu la fais quand ?`);
    }
    if (
      s.hydration &&
      now.getHours() >= 15 &&
      ctx.waterTarget > 0 &&
      ctx.waterNow < ctx.waterTarget * 0.5 &&
      !fired[dayKey]?.hydration
    ) {
      markFired("hydration", dayKey);
      notify(
        "🥤 Point hydratation",
        `Tu en es à ${ctx.waterNow.toFixed(1)} L / ${ctx.waterTarget} L — un grand verre ?`,
      );
    }
    // Rappel d'export : toutes les 2 semaines, le jour choisi, à partir de 9h.
    if (
      s.exportReminder &&
      s.exportAnchor &&
      now.getDay() === s.exportDay &&
      now.getHours() >= 9 &&
      !fired[dayKey]?.export
    ) {
      const anchor = new Date(s.exportAnchor).getTime();
      if (!Number.isNaN(anchor)) {
        const weeks = Math.floor((now.getTime() - anchor) / (7 * 864e5));
        if (weeks >= 0 && weeks % 2 === 0) {
          markFired("export", dayKey);
          notify(
            "📤 Jour d'export",
            "Pèse-toi ⚖️ puis pense à synchroniser / exporter tes données (Paramètres → Notion ou CSV).",
          );
        }
      }
    }
  };

  tick();
  const id = setInterval(tick, 60_000);
  return () => clearInterval(id);
}
