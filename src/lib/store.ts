import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Database, type Json } from "@/integrations/supabase/types";
import type { Capacities, GeneratedPlan } from "./plan";
import { toast } from "sonner";

/** Toast cohérent quand une écriture Supabase échoue (hors-ligne = rassurant, sinon = erreur). */
function syncFailureToast(what: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    toast.info(`💾 ${what} : gardé sur l'appareil — synchro auto au retour du réseau 📶`);
  } else {
    toast.error(`${what} : enregistré localement. La synchronisation réseau a échoué.`);
  }
}
import { SKILLS_GUIDE, type SkillGuide } from "./program";

export interface FavoriteMeal {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Profile {
  weight: number;
  height: number;
  goal: string;
  equipment: string[];
  daysPerWeek: number; // 3 à 6 jours (dérivé de trainingDays)
  level: "débutant" | "intermédiaire" | "avancé";
  onboarded: boolean;
  startDate?: string; // ISO date when program started
  age?: number; // pour le calcul calorique (Mifflin-St Jeor)
  sex?: "homme" | "femme";
  capacities?: Capacities; // capacités (déclarées ou déduites des perfs réelles)
  plan?: GeneratedPlan; // plan personnalisé mis en cache (régénérable)
  trainingDays?: number[]; // 0 = Lundi … 6 = Dimanche (jours avec séance)
  exerciseSwaps?: Record<string, string>; // "dayKey::exId" → nom de remplacement
  favoriteMeals?: FavoriteMeal[]; // repas mis en favoris (ré-ajout en 1 tap)
  notionConfig?: Record<string, unknown>; // config synchro Notion (miroir multi-appareils)
  username?: string; // nom d'affichage du compte (V7)
  homeLayout?: unknown[]; // disposition personnalisée de l'accueil (V8, voir home-layout.ts)
  navMenus?: string[]; // 3 entrées choisies de la barre de menu mobile (V9)
  musicPlaylists?: unknown; // liens de playlists (V10: Record, V13+: array[{id,label,url}])
}

export interface SetLog {
  reps?: number;
  time?: number;
  weight?: number;
  rpe?: number;
  notes?: string;
  done: boolean;
}

export interface ExerciseLog {
  exId: string;
  name: string;
  targetMin?: number;
  targetMax?: number;
  kind: "reps" | "time" | "distance";
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  dayKey: string;
  dayTitle?: string;
  duration: number;
  rpe?: number;
  filmed?: boolean;
  notes?: string;
  exercises: ExerciseLog[];
  totalVolume?: number;
  successCount?: number;
  /** Tags émotion (V11) encodés dans notes en JSON: {"t":["💪","🔥"],"n":"..."} */
  _tags?: string[];
}

export interface CardioLog {
  id: string;
  date: string;
  type: "course" | "rameur" | "natation" | "vélo";
  distance?: number;
  duration: number;
  pace?: string;
  zone: "zone2" | "intervalles" | "autre";
}

export interface MealLog {
  id: string;
  date: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyMetric {
  id: string;
  date: string;
  weight?: number;
  waist?: number;
  sleep?: number;
  energy?: number;
  fatigue?: number;
  photoNote?: string;
  photos?: { face?: string; profile?: string; back?: string };
}

export interface ProgressTest {
  id: string;
  date: string;
  testId: string;
  value: number;
}

interface AppState {
  profile: Profile;
  workouts: WorkoutLog[];
  cardio: CardioLog[];
  meals: MealLog[];
  metrics: BodyMetric[];
  tests: ProgressTest[];
  water: Record<string, number>;
  skillNotes: Record<string, string>;
  skillStatuses: Record<string, "non commencé" | "en cours" | "proche" | "validé" | "auto">;
}

const DEFAULT_STATE: AppState = {
  profile: {
    weight: 75,
    height: 178,
    goal: "Recomposition corporelle",
    equipment: ["Barre traction", "Anneaux", "Haltères"],
    daysPerWeek: 6,
    level: "intermédiaire",
    onboarded: false,
    startDate: new Date().toISOString(),
  },
  workouts: [],
  cardio: [],
  meals: [],
  metrics: [],
  tests: [],
  water: {},
  skillNotes: {},
  skillStatuses: {},
};

const KEY = "calli-recomp-v2";

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function load(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...parsed.profile },
      skillNotes: parsed.skillNotes || {},
      skillStatuses: parsed.skillStatuses || {},
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(s: AppState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("Storage full", e);
  }
}

let listeners: Array<() => void> = [];
let state: AppState | null = null;

function getState() {
  if (state === null) state = load();
  return state;
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(getState());
  save(state);
  listeners.forEach((l) => l());
}

export function useAppState() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.push(l);
    tick((n) => n + 1);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return getState();
}

export function useAppActions() {
  const syncProfileFromSupabase = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Erreur de récupération du profil Supabase :", error);
        return;
      }

      if (data) {
        setState((s) => ({
          ...s,
          profile: {
            weight: data.weight,
            height: data.height,
            goal: data.goal || "Recomposition corporelle",
            daysPerWeek: typeof data.days_per_week === "number" ? data.days_per_week : 6,
            level: data.level || "intermédiaire",
            equipment: data.equipment || ["Barre traction", "Anneaux", "Haltères"],
            onboarded: data.onboarded,
            startDate: data.start_date || s.profile.startDate || new Date().toISOString(),
            age: data.age ?? s.profile.age,
            sex: data.sex ?? s.profile.sex,
            capacities: (data.capacities as Capacities | null) ?? s.profile.capacities,
            plan: (data.plan as unknown as GeneratedPlan | null) ?? s.profile.plan,
            trainingDays: Array.isArray(data.training_days)
              ? (data.training_days as number[])
              : s.profile.trainingDays,
            exerciseSwaps:
              (data.exercise_swaps as Record<string, string> | null) ?? s.profile.exerciseSwaps,
            favoriteMeals: Array.isArray(data.favorite_meals)
              ? (data.favorite_meals as unknown as FavoriteMeal[])
              : s.profile.favoriteMeals,
            notionConfig:
              (data.notion_config as Record<string, unknown> | null) ?? s.profile.notionConfig,
            username: data.username ?? s.profile.username,
            homeLayout: Array.isArray(data.home_layout)
              ? (data.home_layout as unknown[])
              : s.profile.homeLayout,
            navMenus: Array.isArray(data.nav_menus)
              ? (data.nav_menus as string[])
              : s.profile.navMenus,
            musicPlaylists:
              data.music_playlists ?? s.profile.musicPlaylists,
          },
        }));
      }
    } catch (err) {
      console.error("Erreur inattendue de synchronisation du profil :", err);
    }
  }, []);

  const syncAllDataWithSupabase = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      // 1. Sync Profile
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      let currentProfile = getState().profile;
      if (profileData) {
        currentProfile = {
          weight: profileData.weight,
          height: profileData.height,
          goal: profileData.goal || "Recomposition corporelle",
          daysPerWeek:
            typeof profileData.days_per_week === "number" ? profileData.days_per_week : 6,
          level: profileData.level || "intermédiaire",
          equipment: profileData.equipment || ["Barre traction", "Anneaux", "Haltères"],
          onboarded: profileData.onboarded,
          startDate: profileData.start_date || currentProfile.startDate || new Date().toISOString(),
          age: profileData.age ?? currentProfile.age,
          sex: profileData.sex ?? currentProfile.sex,
          capacities: (profileData.capacities as Capacities | null) ?? currentProfile.capacities,
          plan: (profileData.plan as unknown as GeneratedPlan | null) ?? currentProfile.plan,
          trainingDays: Array.isArray(profileData.training_days)
            ? (profileData.training_days as number[])
            : currentProfile.trainingDays,
          exerciseSwaps:
            (profileData.exercise_swaps as Record<string, string> | null) ??
            currentProfile.exerciseSwaps,
          favoriteMeals: Array.isArray(profileData.favorite_meals)
            ? (profileData.favorite_meals as unknown as FavoriteMeal[])
            : currentProfile.favoriteMeals,
          notionConfig:
            (profileData.notion_config as Record<string, unknown> | null) ??
            currentProfile.notionConfig,
          username: profileData.username ?? currentProfile.username,
          homeLayout: Array.isArray(profileData.home_layout)
            ? (profileData.home_layout as unknown[])
            : currentProfile.homeLayout,
          navMenus: Array.isArray(profileData.nav_menus)
            ? (profileData.nav_menus as string[])
            : currentProfile.navMenus,
          musicPlaylists:
            profileData.music_playlists ??
            currentProfile.musicPlaylists,
        };
      } else {
        const mappedProfile = {
          id: userId,
          weight: currentProfile.weight,
          height: currentProfile.height,
          goal: currentProfile.goal,
          days_per_week: currentProfile.daysPerWeek,
          level: currentProfile.level,
          equipment: currentProfile.equipment,
          onboarded: currentProfile.onboarded,
          age: currentProfile.age ?? null,
          sex: currentProfile.sex ?? null,
          capacities: (currentProfile.capacities ?? {}) as unknown as Json,
          plan: currentProfile.plan ? (currentProfile.plan as unknown as Json) : null,
          training_days: (currentProfile.trainingDays ?? []) as unknown as Json,
          exercise_swaps: (currentProfile.exerciseSwaps ?? {}) as unknown as Json,
          favorite_meals: (currentProfile.favoriteMeals ?? []) as unknown as Json,
          notion_config: (currentProfile.notionConfig ?? {}) as unknown as Json,
          username: currentProfile.username ?? null,
          home_layout: (currentProfile.homeLayout ?? []) as unknown as Json,
          nav_menus: (currentProfile.navMenus ?? []) as unknown as Json,
          music_playlists: (currentProfile.musicPlaylists ?? {}) as unknown as Json,
          updated_at: new Date().toISOString(),
        };
        await supabase.from("profiles").upsert(mappedProfile);
      }

      const localState = getState();

      // 2. Sync Meals
      const { data: remoteMeals, error: mealsErr } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId);
      if (mealsErr) throw mealsErr;

      const mergedMeals: MealLog[] = [
        ...(remoteMeals || []).map((rm) => ({
          id: rm.id,
          date: rm.date,
          name: rm.name,
          kcal: rm.kcal,
          protein: Number(rm.protein),
          carbs: Number(rm.carbs),
          fat: Number(rm.fat),
        })),
      ];

      const mealsToInsert: MealLog[] = [];
      for (const lm of localState.meals) {
        let exists = false;
        if (isUUID(lm.id)) {
          exists = mergedMeals.some((rm) => rm.id === lm.id);
        } else {
          const lmDay = lm.date.slice(0, 10);
          const match = mergedMeals.find(
            (rm) =>
              rm.name === lm.name &&
              rm.date.slice(0, 10) === lmDay &&
              Math.abs(rm.kcal - lm.kcal) < 1,
          );
          if (match) {
            lm.id = match.id;
            exists = true;
          }
        }

        if (!exists) {
          const newId = isUUID(lm.id) ? lm.id : generateUUID();
          lm.id = newId;
          mealsToInsert.push(lm);
          mergedMeals.push(lm);
        }
      }

      if (mealsToInsert.length > 0) {
        const { error: insErr } = await supabase.from("meal_logs").insert(
          mealsToInsert.map((m) => ({
            id: m.id,
            user_id: userId,
            date: m.date,
            name: m.name,
            kcal: Math.round(m.kcal),
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
          })),
        );
        if (insErr) console.error("Error inserting meals during sync:", insErr);
      }

      // 3. Sync Cardio
      const { data: remoteCardio, error: cardioErr } = await supabase
        .from("cardio_logs")
        .select("*")
        .eq("user_id", userId);
      if (cardioErr) throw cardioErr;

      const mergedCardio: CardioLog[] = [
        ...(remoteCardio || []).map((rc) => ({
          id: rc.id,
          date: rc.date,
          type: rc.type as "course" | "rameur" | "natation" | "vélo",
          distance: rc.distance !== null ? Number(rc.distance) : undefined,
          duration: rc.duration,
          pace: rc.pace ?? undefined,
          zone: (rc.zone as "zone2" | "intervalles" | "autre") ?? "autre",
        })),
      ];

      const cardioToInsert: CardioLog[] = [];
      for (const lc of localState.cardio) {
        let exists = false;
        if (isUUID(lc.id)) {
          exists = mergedCardio.some((rc) => rc.id === lc.id);
        } else {
          const lcDay = lc.date.slice(0, 10);
          const match = mergedCardio.find(
            (rc) => rc.type === lc.type && rc.date.slice(0, 10) === lcDay,
          );
          if (match) {
            lc.id = match.id;
            exists = true;
          }
        }

        if (!exists) {
          const newId = isUUID(lc.id) ? lc.id : generateUUID();
          lc.id = newId;
          cardioToInsert.push(lc);
          mergedCardio.push(lc);
        }
      }

      if (cardioToInsert.length > 0) {
        const { error: insErr } = await supabase.from("cardio_logs").insert(
          cardioToInsert.map((c) => ({
            id: c.id,
            user_id: userId,
            date: c.date,
            type: c.type,
            distance: c.distance ?? null,
            duration: Math.round(c.duration),
            pace: c.pace ?? null,
            zone: c.zone ?? null,
          })),
        );
        if (insErr) console.error("Error inserting cardio during sync:", insErr);
      }

      // 4. Sync Body Metrics and Migrate Base64 Photos if any
      const { data: remoteMetrics, error: metricsErr } = await supabase
        .from("body_metrics")
        .select("*")
        .eq("user_id", userId);
      if (metricsErr) throw metricsErr;

      const mergedMetrics: BodyMetric[] = [
        ...(remoteMetrics || []).map((rm) => ({
          id: rm.id,
          date: rm.date,
          weight: rm.weight !== null ? Number(rm.weight) : undefined,
          waist: rm.waist !== null ? Number(rm.waist) : undefined,
          sleep: rm.sleep !== null ? Number(rm.sleep) : undefined,
          energy: rm.energy !== null ? rm.energy : undefined,
          fatigue: rm.fatigue !== null ? rm.fatigue : undefined,
          photoNote: rm.photo_note ?? undefined,
          photos: {
            face: rm.photo_face_path ?? undefined,
            profile: rm.photo_profile_path ?? undefined,
            back: rm.photo_back_path ?? undefined,
          },
        })),
      ];

      // Migrate Base64 photos locally in localStorage & state to Supabase storage
      const { base64ToFile } = await import("./photo-utils");

      const uploadBase64Photo = async (
        b64: string,
        slot: "face" | "profile" | "back",
        metricId: string,
      ): Promise<string | undefined> => {
        const fileObj = base64ToFile(b64, `migrated-${metricId}-${slot}.jpg`);
        if (!fileObj) return undefined;
        try {
          const { data, error: uploadErr } = await supabase.storage
            .from("progress-photos")
            .upload(`${userId}/migrated-${metricId}-${slot}.jpg`, fileObj, {
              upsert: true,
            });
          if (uploadErr) {
            console.error("Failed to upload migrated photo during sync:", uploadErr);
            return undefined;
          }
          return data?.path;
        } catch (e) {
          console.error("Unexpected error uploading migrated photo during sync:", e);
          return undefined;
        }
      };

      const metricsToInsert: BodyMetric[] = [];
      for (const lm of localState.metrics) {
        // Run migration of any inline Base64 photos to Storage before matching/inserting
        if (lm.photos) {
          const slots: Array<"face" | "profile" | "back"> = ["face", "profile", "back"];
          for (const slot of slots) {
            const photoVal = lm.photos[slot];
            if (photoVal && photoVal.startsWith("data:")) {
              const path = await uploadBase64Photo(photoVal, slot, lm.id);
              if (path) {
                lm.photos[slot] = path;
              }
            }
          }
        }

        let exists = false;
        if (isUUID(lm.id)) {
          exists = mergedMetrics.some((rm) => rm.id === lm.id);
        } else {
          const lmDay = lm.date.slice(0, 10);
          const match = mergedMetrics.find((rm) => rm.date.slice(0, 10) === lmDay);
          if (match) {
            lm.id = match.id;
            if (lm.photos && match.photos) {
              match.photos = { ...match.photos, ...lm.photos };
            } else if (lm.photos) {
              match.photos = lm.photos;
            }
            exists = true;
          }
        }

        if (!exists) {
          const newId = isUUID(lm.id) ? lm.id : generateUUID();
          lm.id = newId;
          metricsToInsert.push(lm);
          mergedMetrics.push(lm);
        }
      }

      if (metricsToInsert.length > 0) {
        const { error: insErr } = await supabase.from("body_metrics").insert(
          metricsToInsert.map((m) => ({
            id: m.id,
            user_id: userId,
            date: m.date,
            weight: m.weight ?? null,
            waist: m.waist ?? null,
            sleep: m.sleep ?? null,
            energy: m.energy ?? null,
            fatigue: m.fatigue ?? null,
            photo_note: m.photoNote ?? null,
            photo_face_path: m.photos?.face ?? null,
            photo_profile_path: m.photos?.profile ?? null,
            photo_back_path: m.photos?.back ?? null,
          })),
        );
        if (insErr) console.error("Error inserting body metrics during sync:", insErr);
      }

      // 5. Sync Progress Tests
      const { data: remoteTests, error: testsErr } = await supabase
        .from("progress_tests")
        .select("*")
        .eq("user_id", userId);
      if (testsErr) throw testsErr;

      const mergedTests: ProgressTest[] = [
        ...(remoteTests || []).map((rt) => ({
          id: rt.id,
          date: rt.date,
          testId: rt.test_id,
          value: Number(rt.value),
        })),
      ];

      const testsToInsert: ProgressTest[] = [];
      for (const lt of localState.tests) {
        let exists = false;
        if (isUUID(lt.id)) {
          exists = mergedTests.some((rt) => rt.id === lt.id);
        } else {
          const ltDay = lt.date.slice(0, 10);
          const match = mergedTests.find(
            (rt) => rt.testId === lt.testId && rt.date.slice(0, 10) === ltDay,
          );
          if (match) {
            lt.id = match.id;
            exists = true;
          }
        }

        if (!exists) {
          const newId = isUUID(lt.id) ? lt.id : generateUUID();
          lt.id = newId;
          testsToInsert.push(lt);
          mergedTests.push(lt);
        }
      }

      if (testsToInsert.length > 0) {
        const { error: insErr } = await supabase.from("progress_tests").insert(
          testsToInsert.map((t) => ({
            id: t.id,
            user_id: userId,
            date: t.date,
            test_id: t.testId,
            value: t.value,
          })),
        );
        if (insErr) console.error("Error inserting progress tests during sync:", insErr);
      }

      // 6. Sync Hydration
      const { data: remoteWater, error: waterErr } = await supabase
        .from("hydration_logs")
        .select("*")
        .eq("user_id", userId);
      if (waterErr) throw waterErr;

      const mergedWater: Record<string, number> = { ...localState.water };
      const waterToUpsert: Array<{ date: string; liters: number }> = [];

      for (const rw of remoteWater || []) {
        const rwDay = rw.date;
        const localLiters = mergedWater[rwDay] || 0;
        const remoteLiters = Number(rw.liters);
        if (localLiters < remoteLiters) {
          mergedWater[rwDay] = remoteLiters;
        } else if (localLiters > remoteLiters) {
          waterToUpsert.push({ date: rwDay, liters: localLiters });
        }
      }

      for (const [dayKey, liters] of Object.entries(localState.water)) {
        const hasRemote = (remoteWater || []).some((rw) => rw.date === dayKey);
        if (!hasRemote && liters > 0) {
          waterToUpsert.push({ date: dayKey, liters });
        }
      }

      if (waterToUpsert.length > 0) {
        const { error: upsErr } = await supabase.from("hydration_logs").upsert(
          waterToUpsert.map((w) => ({
            user_id: userId,
            date: w.date,
            liters: w.liters,
          })),
          { onConflict: "user_id,date" },
        );
        if (upsErr) console.error("Error upserting hydration during sync:", upsErr);
      }

      // 7. Sync Workouts
      const { data: remoteSessions, error: sessErr } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId);
      if (sessErr) throw sessErr;

      interface RemoteExerciseLogRow {
        id: string;
        session_id: string;
        ex_id: string;
        name: string;
        kind: "reps" | "time" | "distance";
        target_min: number | null;
        target_max: number | null;
        sets: Json;
        notes: string | null;
        created_at: string | null;
      }

      let remoteLogs: RemoteExerciseLogRow[] = [];
      const sessionIds = remoteSessions?.map((s) => s.id) || [];
      if (sessionIds.length > 0) {
        const { data: logs, error: logsErr } = await supabase
          .from("exercise_logs")
          .select("*")
          .in("session_id", sessionIds);
        if (logsErr) throw logsErr;
        remoteLogs = (logs as RemoteExerciseLogRow[]) || [];
      }

      const reconstructedRemoteWorkouts: WorkoutLog[] = (remoteSessions || []).map((s) => {
        const sessionExercises = remoteLogs
          .filter((l) => l.session_id === s.id)
          .map((l) => ({
            exId: l.ex_id,
            name: l.name,
            targetMin: l.target_min !== null ? l.target_min : undefined,
            targetMax: l.target_max !== null ? l.target_max : undefined,
            kind: l.kind,
            sets: (l.sets as unknown as SetLog[]) || [],
            notes: l.notes ?? undefined,
          }));
        return {
          id: s.id,
          date: s.date,
          dayKey: s.day_key,
          dayTitle: s.day_title,
          duration: s.duration,
          rpe: s.rpe !== null ? s.rpe : undefined,
          filmed: s.filmed !== null ? s.filmed : undefined,
          notes: s.notes ?? undefined,
          exercises: sessionExercises,
          totalVolume: s.total_volume !== null ? Number(s.total_volume) : undefined,
          successCount: s.success_count !== null ? s.success_count : undefined,
        };
      });

      const mergedWorkouts: WorkoutLog[] = [...reconstructedRemoteWorkouts];
      const workoutsToInsert: WorkoutLog[] = [];

      for (const lw of localState.workouts) {
        let exists = false;
        if (isUUID(lw.id)) {
          exists = mergedWorkouts.some((rw) => rw.id === lw.id);
        } else {
          const lwDay = lw.date.slice(0, 10);
          const match = mergedWorkouts.find(
            (rw) => rw.dayKey === lw.dayKey && rw.date.slice(0, 10) === lwDay,
          );
          if (match) {
            lw.id = match.id;
            exists = true;
          }
        }

        if (!exists) {
          const newId = isUUID(lw.id) ? lw.id : generateUUID();
          lw.id = newId;
          workoutsToInsert.push(lw);
          mergedWorkouts.push(lw);
        }
      }

      for (const w of workoutsToInsert) {
        const { error: wsErr } = await supabase.from("workout_sessions").insert({
          id: w.id,
          user_id: userId,
          date: w.date,
          day_key: w.dayKey,
          day_title: w.dayTitle || "",
          duration: Math.round(w.duration),
          rpe: w.rpe ?? null,
          filmed: w.filmed ?? null,
          notes: w.notes ?? null,
          total_volume: w.totalVolume ?? null,
          success_count: w.successCount ?? null,
        });

        if (wsErr) {
          console.error("Error inserting workout session during sync:", wsErr);
          continue;
        }

        const { error: elErr } = await supabase.from("exercise_logs").insert(
          w.exercises.map((e) => ({
            session_id: w.id,
            ex_id: e.exId,
            name: e.name,
            kind: e.kind,
            target_min: e.targetMin ?? null,
            target_max: e.targetMax ?? null,
            sets: e.sets as unknown as Json,
            notes: e.notes ?? null,
          })),
        );
        if (elErr) console.error("Error inserting exercise logs during sync:", elErr);
      }

      // 7bis. Sync Skill States (notes & statuts manuels des skills)
      // Tolérant : si la table n'existe pas encore (migration non appliquée),
      // on continue avec les données locales au lieu de faire échouer toute la synchro.
      const { data: remoteSkillStatesData, error: skillErr } = await supabase
        .from("skill_states")
        .select("*")
        .eq("user_id", userId);
      if (skillErr) console.error("Skill states sync ignorée (migration appliquée ?) :", skillErr);
      const remoteSkillStates = remoteSkillStatesData || [];

      type SkillStatus = AppState["skillStatuses"][string];
      const mergedSkillNotes: Record<string, string> = {};
      const mergedSkillStatuses: AppState["skillStatuses"] = {};

      for (const row of remoteSkillStates || []) {
        if (row.note) mergedSkillNotes[row.skill_id] = row.note;
        if (row.status) mergedSkillStatuses[row.skill_id] = row.status;
      }

      // Pousser vers Supabase les entrées locales absentes du distant
      type SkillStateInsert = Database["public"]["Tables"]["skill_states"]["Insert"];
      const skillStatesToUpsert: SkillStateInsert[] = [];
      const remoteSkillIds = new Set((remoteSkillStates || []).map((r) => r.skill_id));
      const localSkillIds = new Set([
        ...Object.keys(localState.skillNotes),
        ...Object.keys(localState.skillStatuses),
      ]);

      for (const skillId of localSkillIds) {
        if (remoteSkillIds.has(skillId)) continue;
        const status = localState.skillStatuses[skillId];
        const note = localState.skillNotes[skillId];
        const manualStatus: SkillStatus | null = status && status !== "auto" ? status : null;
        if (!manualStatus && !note) continue;
        if (manualStatus) mergedSkillStatuses[skillId] = manualStatus;
        if (note) mergedSkillNotes[skillId] = note;
        skillStatesToUpsert.push({
          user_id: userId,
          skill_id: skillId,
          status: manualStatus,
          note: note ?? null,
          updated_at: new Date().toISOString(),
        });
      }

      if (skillStatesToUpsert.length > 0) {
        const { error: upsErr } = await supabase
          .from("skill_states")
          .upsert(skillStatesToUpsert, { onConflict: "user_id,skill_id" });
        if (upsErr) console.error("Error upserting skill states during sync:", upsErr);
      }

      // 8. Update state
      setState((s) => ({
        ...s,
        profile: currentProfile,
        meals: mergedMeals,
        cardio: mergedCardio,
        metrics: mergedMetrics,
        tests: (() => {
          try {
            const deletedSet = new Set(JSON.parse(localStorage.getItem("deleted-test-ids") || "[]") as string[]);
            return mergedTests.filter((t) => !deletedSet.has(t.id));
          } catch { return mergedTests; }
        })(),
        water: mergedWater,
        workouts: mergedWorkouts.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
        skillNotes: mergedSkillNotes,
        skillStatuses: mergedSkillStatuses,
      }));

      // Nettoyer les IDs supprimés qui ne sont plus dans le remote
      try {
        const remoteIds = new Set((remoteTests || []).map((r) => r.id));
        const stored = JSON.parse(localStorage.getItem("deleted-test-ids") || "[]") as string[];
        const stillPending = stored.filter((id) => remoteIds.has(id));
        localStorage.setItem("deleted-test-ids", JSON.stringify(stillPending));
      } catch { /* noop */ }

      toast.success("Données synchronisées avec Supabase !");
    } catch (err) {
      console.error("Erreur générale lors de la synchronisation Supabase :", err);
      toast.error("Erreur de synchronisation. Utilisation des données locales.");
    }
  }, []);

  return {
    syncProfileFromSupabase,
    syncAllDataWithSupabase,
    setProfile: useCallback((p: Partial<Profile>) => {
      let nextProfile: Profile | null = null;
      setState((s) => {
        nextProfile = { ...s.profile, ...p };
        return { ...s, profile: nextProfile };
      });

      setTimeout(() => {
        if (!nextProfile) return;
        const profileToSync: Profile = nextProfile;
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            const mappedProfile = {
              id: session.user.id,
              weight: profileToSync.weight,
              height: profileToSync.height,
              goal: profileToSync.goal,
              days_per_week: profileToSync.daysPerWeek,
              level: profileToSync.level,
              equipment: profileToSync.equipment,
              onboarded: profileToSync.onboarded,
              age: profileToSync.age ?? null,
              sex: profileToSync.sex ?? null,
              capacities: (profileToSync.capacities ?? {}) as unknown as Json,
              plan: profileToSync.plan ? (profileToSync.plan as unknown as Json) : null,
              training_days: (profileToSync.trainingDays ?? []) as unknown as Json,
              exercise_swaps: (profileToSync.exerciseSwaps ?? {}) as unknown as Json,
              favorite_meals: (profileToSync.favoriteMeals ?? []) as unknown as Json,
              notion_config: (profileToSync.notionConfig ?? {}) as unknown as Json,
              username: profileToSync.username ?? null,
              home_layout: (profileToSync.homeLayout ?? []) as unknown as Json,
              nav_menus: (profileToSync.navMenus ?? []) as unknown as Json,
              music_playlists: (profileToSync.musicPlaylists ?? {}) as unknown as Json,
              updated_at: new Date().toISOString(),
            };
            supabase
              .from("profiles")
              .upsert(mappedProfile)
              .then(({ error }) => {
                if (error) {
                  console.error("Erreur de synchronisation du profil avec Supabase :", error);
                }
              });
          }
        });
      }, 0);
    }, []),
    addWorkout: useCallback((w: WorkoutLog) => {
      const workoutId = isUUID(w.id) ? w.id : generateUUID();
      const updatedWorkout = {
        ...w,
        id: workoutId,
      };

      setState((s) => ({ ...s, workouts: [updatedWorkout, ...s.workouts] }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { error: sessErr } = await supabase.from("workout_sessions").insert({
            id: updatedWorkout.id,
            user_id: session.user.id,
            date: updatedWorkout.date,
            day_key: updatedWorkout.dayKey,
            day_title: updatedWorkout.dayTitle || "",
            duration: Math.round(updatedWorkout.duration),
            rpe: updatedWorkout.rpe ?? null,
            filmed: updatedWorkout.filmed ?? null,
            notes: updatedWorkout.notes ?? null,
            total_volume: updatedWorkout.totalVolume ?? null,
            success_count: updatedWorkout.successCount ?? null,
          });

          if (sessErr) throw sessErr;

          const { error: logsErr } = await supabase.from("exercise_logs").insert(
            updatedWorkout.exercises.map((e) => ({
              session_id: updatedWorkout.id,
              ex_id: e.exId,
              name: e.name,
              kind: e.kind,
              target_min: e.targetMin ?? null,
              target_max: e.targetMax ?? null,
              sets: e.sets as unknown as Json,
              notes: e.notes ?? null,
            })),
          );

          if (logsErr) throw logsErr;
        } catch (err) {
          console.error("Erreur d'enregistrement de la séance dans Supabase :", err);
          syncFailureToast("Séance");
        }
      }, 0);
    }, []),
    removeWorkout: useCallback((id: string) => {
      // Local d'abord (sinon la synchro le ferait « ressusciter » depuis l'appareil)
      setState((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== id) }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;
          if (isUUID(id)) {
            // Séries associées (si la RLS refuse, la suppression de la séance peut les cascader)
            const { error: logsErr } = await supabase
              .from("exercise_logs")
              .delete()
              .eq("session_id", id);
            if (logsErr) console.warn("Suppression exercise_logs (RLS ?) :", logsErr.message);
            const { error } = await supabase
              .from("workout_sessions")
              .delete()
              .eq("id", id)
              .eq("user_id", session.user.id);
            if (error) throw error;
          }
        } catch (err) {
          console.error("Erreur de suppression de la séance dans Supabase :", err);
          toast.error("Erreur de synchronisation réseau pour la suppression de la séance.");
        }
      }, 0);
    }, []),
    addCardio: useCallback((c: CardioLog) => {
      const cardioId = isUUID(c.id) ? c.id : generateUUID();
      const updatedCardio = { ...c, id: cardioId };

      setState((s) => ({ ...s, cardio: [updatedCardio, ...s.cardio] }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { error } = await supabase.from("cardio_logs").insert({
            id: updatedCardio.id,
            user_id: session.user.id,
            date: updatedCardio.date,
            type: updatedCardio.type,
            distance: updatedCardio.distance ?? null,
            duration: Math.round(updatedCardio.duration),
            pace: updatedCardio.pace ?? null,
            zone: updatedCardio.zone ?? null,
          });

          if (error) throw error;
        } catch (err) {
          console.error("Erreur d'enregistrement du cardio dans Supabase :", err);
          syncFailureToast("Cardio");
        }
      }, 0);
    }, []),
    addMeal: useCallback((m: MealLog) => {
      const mealId = isUUID(m.id) ? m.id : generateUUID();
      const updatedMeal = { ...m, id: mealId };

      setState((s) => ({ ...s, meals: [updatedMeal, ...s.meals] }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { error } = await supabase.from("meal_logs").insert({
            id: updatedMeal.id,
            user_id: session.user.id,
            date: updatedMeal.date,
            name: updatedMeal.name,
            kcal: Math.round(updatedMeal.kcal),
            protein: updatedMeal.protein,
            carbs: updatedMeal.carbs,
            fat: updatedMeal.fat,
          });

          if (error) throw error;
        } catch (err) {
          console.error("Erreur d'enregistrement du repas dans Supabase :", err);
          syncFailureToast("Repas");
        }
      }, 0);
    }, []),
    removeMeal: useCallback((id: string) => {
      setState((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== id) }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          if (isUUID(id)) {
            const { error } = await supabase
              .from("meal_logs")
              .delete()
              .eq("id", id)
              .eq("user_id", session.user.id);

            if (error) throw error;
          }
        } catch (err) {
          console.error("Erreur de suppression du repas dans Supabase :", err);
          toast.error("Erreur de synchronisation réseau pour la suppression du repas.");
        }
      }, 0);
    }, []),
    addMetric: useCallback((m: BodyMetric) => {
      const metricId = isUUID(m.id) ? m.id : generateUUID();
      const updatedMetric = { ...m, id: metricId };

      setState((s) => ({ ...s, metrics: [updatedMetric, ...s.metrics] }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { error } = await supabase.from("body_metrics").insert({
            id: updatedMetric.id,
            user_id: session.user.id,
            date: updatedMetric.date,
            weight: updatedMetric.weight ?? null,
            waist: updatedMetric.waist ?? null,
            sleep: updatedMetric.sleep ?? null,
            energy: updatedMetric.energy ?? null,
            fatigue: updatedMetric.fatigue ?? null,
            photo_note: updatedMetric.photoNote ?? null,
            photo_face_path: updatedMetric.photos?.face ?? null,
            photo_profile_path: updatedMetric.photos?.profile ?? null,
            photo_back_path: updatedMetric.photos?.back ?? null,
          });

          if (error) throw error;
        } catch (err) {
          console.error("Erreur d'enregistrement des mesures dans Supabase :", err);
          syncFailureToast("Mesures");
        }
      }, 0);
    }, []),
    removeMetric: useCallback((id: string) => {
      const metricToRemove = getState().metrics.find((x) => x.id === id);
      setState((s) => ({ ...s, metrics: s.metrics.filter((x) => x.id !== id) }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          // Delete physically stored photos if they exist
          if (metricToRemove?.photos) {
            const pathsToDelete: string[] = [];
            const slots: Array<"face" | "profile" | "back"> = ["face", "profile", "back"];
            slots.forEach((s) => {
              const path = metricToRemove.photos?.[s];
              if (path && !path.startsWith("data:") && !path.startsWith("http")) {
                pathsToDelete.push(path);
              }
            });
            if (pathsToDelete.length > 0) {
              await supabase.storage.from("progress-photos").remove(pathsToDelete);
            }
          }

          if (isUUID(id)) {
            const { error } = await supabase
              .from("body_metrics")
              .delete()
              .eq("id", id)
              .eq("user_id", session.user.id);

            if (error) throw error;
          }
        } catch (err) {
          console.error("Erreur de suppression des mesures dans Supabase :", err);
          toast.error("Erreur de synchronisation réseau pour la suppression des mesures.");
        }
      }, 0);
    }, []),
    addTest: useCallback((t: ProgressTest) => {
      const testId = isUUID(t.id) ? t.id : generateUUID();
      const updatedTest = { ...t, id: testId };

      setState((s) => ({ ...s, tests: [updatedTest, ...s.tests] }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { error } = await supabase.from("progress_tests").insert({
            id: updatedTest.id,
            user_id: session.user.id,
            date: updatedTest.date,
            test_id: updatedTest.testId,
            value: updatedTest.value,
          });

          if (error) throw error;
        } catch (err) {
          console.error("Erreur d'enregistrement du test de progression dans Supabase :", err);
          syncFailureToast("Test de progression");
        }
      }, 0);
    }, []),
    removeTest: useCallback((id: string) => {
      // Sauvegarder l'ID dans un Set localStorage pour éviter la résurrection par la synchro
      try {
        const deleted = new Set(JSON.parse(localStorage.getItem("deleted-test-ids") || "[]"));
        deleted.add(id);
        localStorage.setItem("deleted-test-ids", JSON.stringify([...deleted]));
      } catch { /* noop */ }

      setState((s) => ({ ...s, tests: s.tests.filter((x) => x.id !== id) }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          if (isUUID(id)) {
            const { error } = await supabase
              .from("progress_tests")
              .delete()
              .eq("id", id)
              .eq("user_id", session.user.id);

            if (error) throw error;
            // Suppression réussie → retirer du Set
            try {
              const deleted = new Set(JSON.parse(localStorage.getItem("deleted-test-ids") || "[]"));
              deleted.delete(id);
              localStorage.setItem("deleted-test-ids", JSON.stringify([...deleted]));
            } catch { /* noop */ }
          }
        } catch (err) {
          console.error("Erreur de suppression du test dans Supabase :", err);
          toast.error("Erreur de synchronisation réseau pour la suppression du test.");
        }
      }, 0);
    }, []),
    addWater: useCallback((liters: number) => {
      const dateKey = new Date().toISOString().slice(0, 10);
      let updatedLiters = 0;
      setState((s) => {
        updatedLiters = (s.water[dateKey] || 0) + liters;
        return { ...s, water: { ...s.water, [dateKey]: updatedLiters } };
      });

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { error } = await supabase.from("hydration_logs").upsert(
            {
              user_id: session.user.id,
              date: dateKey,
              liters: updatedLiters,
            },
            { onConflict: "user_id,date" },
          );

          if (error) throw error;
        } catch (err) {
          console.error("Erreur d'enregistrement de l'eau dans Supabase :", err);
          syncFailureToast("Hydratation");
        }
      }, 0);
    }, []),
    resetWater: useCallback(() => {
      const dateKey = new Date().toISOString().slice(0, 10);
      setState((s) => ({ ...s, water: { ...s.water, [dateKey]: 0 } }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { error } = await supabase.from("hydration_logs").upsert(
            {
              user_id: session.user.id,
              date: dateKey,
              liters: 0,
            },
            { onConflict: "user_id,date" },
          );

          if (error) throw error;
        } catch (err) {
          console.error("Erreur d'enregistrement de l'eau dans Supabase :", err);
          syncFailureToast("Hydratation");
        }
      }, 0);
    }, []),
    setSkillNote: useCallback((skillId: string, note: string) => {
      setState((s) => ({
        ...s,
        skillNotes: { ...s.skillNotes, [skillId]: note },
      }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const status = getState().skillStatuses[skillId];
          const manualStatus = status && status !== "auto" ? status : null;
          if (!manualStatus && !note) {
            // Rien à stocker : supprimer la ligne distante si elle existe
            await supabase
              .from("skill_states")
              .delete()
              .eq("user_id", session.user.id)
              .eq("skill_id", skillId);
            return;
          }
          const { error } = await supabase.from("skill_states").upsert(
            {
              user_id: session.user.id,
              skill_id: skillId,
              status: manualStatus,
              note: note || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,skill_id" },
          );
          if (error) throw error;
        } catch (err) {
          console.error("Erreur d'enregistrement de la note de skill dans Supabase :", err);
          syncFailureToast("Note");
        }
      }, 0);
    }, []),
    setSkillStatus: useCallback(
      (skillId: string, status: "non commencé" | "en cours" | "proche" | "validé" | "auto") => {
        setState((s) => ({
          ...s,
          skillStatuses: { ...s.skillStatuses, [skillId]: status },
        }));

        setTimeout(async () => {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (!session?.user) return;

            const note = getState().skillNotes[skillId];
            const manualStatus = status !== "auto" ? status : null;
            if (!manualStatus && !note) {
              // Statut "auto" (calculé) sans note : supprimer la ligne distante si elle existe
              await supabase
                .from("skill_states")
                .delete()
                .eq("user_id", session.user.id)
                .eq("skill_id", skillId);
              return;
            }
            const { error } = await supabase.from("skill_states").upsert(
              {
                user_id: session.user.id,
                skill_id: skillId,
                status: manualStatus,
                note: note || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,skill_id" },
            );
            if (error) throw error;
          } catch (err) {
            console.error("Erreur d'enregistrement du statut de skill dans Supabase :", err);
            syncFailureToast("Statut");
          }
        }, 0);
      },
      [],
    ),
  };
}

export interface SkillPracticeInfo {
  lastPracticeDate?: string;
  daysAgo?: number;
  lastPerfSummary?: string;
}

export function getSkillPracticeInfo(
  skillId: string,
  workouts: WorkoutLog[],
): SkillPracticeInfo | null {
  const guide = SKILLS_GUIDE.find((g) => g.id === skillId);
  if (!guide) return null;

  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (const w of sortedWorkouts) {
    const matchingEx = w.exercises.find((e) =>
      guide.matchingExercises.some((m) => e.name.toLowerCase().includes(m.toLowerCase())),
    );

    if (matchingEx) {
      const doneSets = matchingEx.sets.filter((s) => s.done);
      if (doneSets.length === 0) continue;

      const setsCount = doneSets.length;
      const isTime = matchingEx.kind === "time";
      const values = doneSets
        .map((s) => (isTime ? s.time : s.reps))
        .filter((v): v is number => v !== undefined);

      let perfStr = "";
      if (values.length > 0) {
        const allSame = values.every((v) => v === values[0]);
        if (allSame) {
          perfStr = `${setsCount}×${values[0]}${isTime ? "s" : ""}`;
        } else {
          perfStr = values.map((v) => `${v}${isTime ? "s" : ""}`).join("/");
        }
      } else {
        perfStr = `${setsCount} séries`;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const practiceDay = new Date(w.date);
      practiceDay.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - practiceDay.getTime();
      const daysAgo = Math.round(diffTime / (1000 * 60 * 60 * 24));

      return {
        lastPracticeDate: w.date,
        daysAgo,
        lastPerfSummary: `${matchingEx.name} (${perfStr})`,
      };
    }
  }

  return null;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function computeStreak(workouts: WorkoutLog[]): number {
  if (!workouts.length) return 0;
  const dates = new Set(workouts.map((w) => w.date.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function thisWeekWorkouts(workouts: WorkoutLog[]): WorkoutLog[] {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return workouts.filter((w) => new Date(w.date) >= start);
}

export function kmThisWeek(cardio: CardioLog[]): number {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return cardio
    .filter((c) => c.type === "course" && new Date(c.date) >= start)
    .reduce((a, c) => a + (c.distance || 0), 0);
}

export function proteinToday(meals: MealLog[]) {
  const t = todayKey();
  return meals.filter((m) => m.date.slice(0, 10) === t).reduce((a, m) => a + m.protein, 0);
}

export function kcalToday(meals: MealLog[]) {
  const t = todayKey();
  return meals.filter((m) => m.date.slice(0, 10) === t).reduce((a, m) => a + m.kcal, 0);
}

// ---------- Progression logic ----------

export interface ProgressionSuggestion {
  exId: string;
  name: string;
  hint: string;
  delta: string;
  reason: "up" | "hold" | "down";
}

interface SessionEval {
  name: string;
  complete: boolean;
  hitTop: boolean;
  maxRpe: number;
}

/**
 * Suggestion de progression V2 : regarde les 2 dernières occurrences de l'exercice.
 *  - séance incomplète        → idem (finir d'abord)
 *  - haut de fourchette RPE≤8 → +1/+2 reps (+5s) ; ×2 si validé 2 fois de suite
 *  - haut de fourchette RPE9+ → consolider
 *  - sous la fourchette 2 fois de suite → reculer d'un cran pour repartir propre
 */
export function suggestProgressionForExercise(
  exId: string,
  targetMax: number | undefined,
  kind: "reps" | "time" | "distance",
  workouts: WorkoutLog[],
): ProgressionSuggestion | null {
  const logs = workouts.filter((w) => w.exercises.some((e) => e.exId === exId)).slice(0, 2);
  if (!logs.length) return null;

  const evalSession = (w: WorkoutLog): SessionEval | null => {
    const ex = w.exercises.find((e) => e.exId === exId)!;
    const setsDone = ex.sets.filter((s) => s.done);
    if (setsDone.length < ex.sets.length)
      return { name: ex.name, complete: false, hitTop: false, maxRpe: 7 };
    const values = setsDone
      .map((s) => (kind === "time" ? s.time : s.reps))
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (!values.length) return null;
    const min = Math.min(...values);
    const rpes = setsDone.map((s) => s.rpe).filter((r): r is number => typeof r === "number");
    return {
      name: ex.name,
      complete: true,
      hitTop: targetMax !== undefined && min >= targetMax,
      maxRpe: rpes.length ? Math.max(...rpes) : 7,
    };
  };

  const cur = evalSession(logs[0]);
  if (!cur) return null;
  if (!cur.complete)
    return { exId, name: cur.name, hint: "Séance incomplète", delta: "= idem", reason: "hold" };

  const prev = logs[1] ? evalSession(logs[1]) : null;

  if (cur.hitTop && cur.maxRpe <= 8) {
    const twice = !!prev?.hitTop;
    if (kind === "time")
      return {
        exId,
        name: cur.name,
        hint: twice ? "Validé 2 fois de suite 💪" : "Objectif atteint · RPE ≤ 8",
        delta: twice || cur.maxRpe <= 7 ? "+8s" : "+5s",
        reason: "up",
      };
    const bump = twice || cur.maxRpe <= 7 ? 2 : 1;
    return {
      exId,
      name: cur.name,
      hint: twice ? "Validé 2 fois de suite 💪" : "Objectif atteint · RPE ≤ 8",
      delta: `+${bump} reps`,
      reason: "up",
    };
  }
  if (cur.hitTop && cur.maxRpe >= 9)
    return {
      exId,
      name: cur.name,
      hint: "Haut de fourchette mais RPE ≥ 9 : consolider propre",
      delta: "= idem",
      reason: "hold",
    };
  if (prev && !prev.hitTop)
    return {
      exId,
      name: cur.name,
      hint: "2 séances sous la fourchette → recule d'un cran pour repartir propre",
      delta: kind === "time" ? "-5s" : "-1 rep",
      reason: "down",
    };
  return {
    exId,
    name: cur.name,
    hint: cur.maxRpe >= 9 ? "RPE ≥ 9 : consolider" : "Fourchette non atteinte",
    delta: "= idem",
    reason: "hold",
  };
}

/** "8·8·7 reps · RPE 9 · 12 juil." — dernière perf affichée pendant la séance. */
export function lastPerformanceHint(
  exId: string,
  kind: "reps" | "time" | "distance",
  workouts: WorkoutLog[],
): string | null {
  const log = workouts.find((w) => w.exercises.some((e) => e.exId === exId));
  if (!log) return null;
  const ex = log.exercises.find((e) => e.exId === exId)!;
  const done = ex.sets.filter((s) => s.done);
  const vals = done
    .map((s) => (kind === "time" ? s.time : s.reps))
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (!vals.length) return null;
  const rpes = done.map((s) => s.rpe).filter((r): r is number => typeof r === "number");
  const date = new Date(log.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return `${vals.join("·")}${kind === "time" ? " s" : ""}${rpes.length ? ` · RPE ${Math.max(...rpes)}` : ""} · ${date}`;
}

// ---------- Records personnels ----------

export interface PersonalBest {
  exId: string;
  name: string;
  value: number;
  weight?: number;
  kind: "reps" | "time" | "distance";
  date: string;
}

/** Meilleure série enregistrée par exercice (toutes séances confondues). */
export function personalBests(workouts: WorkoutLog[]): Record<string, PersonalBest> {
  const out: Record<string, PersonalBest> = {};
  for (const w of workouts)
    for (const e of w.exercises) {
      if (e.kind === "distance") continue;
      for (const s of e.sets) {
        if (!s.done) continue;
        const v = e.kind === "time" ? s.time : s.reps;
        if (typeof v !== "number" || v <= 0) continue;
        const cur = out[e.exId];
        if (!cur || v > cur.value)
          out[e.exId] = {
            exId: e.exId,
            name: e.name,
            value: v,
            weight: s.weight,
            kind: e.kind,
            date: w.date,
          };
      }
    }
  return out;
}

/** Records battus par ce workout (vs l'état AVANT son ajout). */
export function findNewRecords(
  prevBests: Record<string, PersonalBest>,
  log: WorkoutLog,
): PersonalBest[] {
  const recs: PersonalBest[] = [];
  for (const e of log.exercises) {
    if (e.kind === "distance") continue;
    const prev = prevBests[e.exId];
    if (!prev) continue; // première fois sur l'exo = mise en place, pas un "record battu"
    let bestInLog: number | undefined;
    let bestWeight: number | undefined;
    for (const s of e.sets) {
      if (!s.done) continue;
      const v = e.kind === "time" ? s.time : s.reps;
      if (typeof v === "number" && v > (bestInLog ?? 0)) {
        bestInLog = v;
        bestWeight = s.weight;
      }
    }
    if (bestInLog !== undefined && bestInLog > prev.value)
      recs.push({
        exId: e.exId,
        name: e.name,
        value: bestInLog,
        weight: bestWeight,
        kind: e.kind,
        date: log.date,
      });
  }
  return recs;
}

// ---------- Bilan de la semaine ----------

export interface WeeklyStats {
  /** clé yyyy-mm-dd du lundi de la fenêtre (pour mémoriser le masquage) */
  windowKey: string;
  label: string; // "Ta semaine" (dim.) / "La semaine dernière" (lun.)
  sessions: number;
  km: number;
  waterAvg: number | null; // L/jour sur la fenêtre
  proteinAvg: number | null; // g/jour
  weightDelta: number | null; // kg début→fin de fenêtre
}

/**
 * Stats de la fenêtre de bilan : dimanche → semaine en cours (lun→aujourd'hui) ;
 * lundi → semaine complète écoulée (lun→dim). null les autres jours.
 */
export function weeklyStats(
  state: Pick<AppState, "workouts" | "cardio" | "meals" | "metrics" | "water">,
): WeeklyStats | null {
  const today = new Date();
  const dow = today.getDay(); // 0 = dimanche
  if (dow !== 0 && dow !== 1) return null;

  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((dow + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const start = new Date(monday);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  let label = "Ta semaine jusqu'ici";
  if (dow === 1) {
    start.setDate(start.getDate() - 7);
    end.setTime(monday.getTime() - 1);
    label = "La semaine dernière";
  }

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t <= end.getTime();
  };
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 864e5)) || 1;

  const sessions = state.workouts.filter((w) => inRange(w.date)).length;
  const km = state.cardio
    .filter((c) => c.type === "course" && inRange(c.date))
    .reduce((a, c) => a + (c.distance || 0), 0);

  // Eau / protéines : moyenne par jour sur les jours avec au moins une entrée
  const waterKeys = Object.keys(state.water).filter((k) => {
    const t = new Date(k + "T12:00:00").getTime();
    return t >= start.getTime() && t <= end.getTime() && state.water[k] > 0;
  });
  const waterAvg = waterKeys.length
    ? waterKeys.reduce((a, k) => a + state.water[k], 0) / Math.max(days, waterKeys.length)
    : null;

  const mealsInRange = state.meals.filter((m) => inRange(m.date));
  const proteinDays = new Set(mealsInRange.map((m) => m.date.slice(0, 10)));
  const proteinAvg = proteinDays.size
    ? mealsInRange.reduce((a, m) => a + m.protein, 0) / Math.max(days, proteinDays.size)
    : null;

  const weightsInRange = state.metrics
    .filter((m) => typeof m.weight === "number" && inRange(m.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weightDelta =
    weightsInRange.length >= 2
      ? Math.round(
          (weightsInRange[weightsInRange.length - 1].weight! - weightsInRange[0].weight!) * 10,
        ) / 10
      : null;

  return {
    windowKey: start.toISOString().slice(0, 10),
    label,
    sessions,
    km: Math.round(km * 10) / 10,
    waterAvg: waterAvg !== null ? Math.round(waterAvg * 10) / 10 : null,
    proteinAvg: proteinAvg !== null ? Math.round(proteinAvg) : null,
    weightDelta,
  };
}

// Current program week (1-12)
/**
 * Cycles infinis de 12 semaines : l'app ne plafonne plus à S12.
 * S13 → Cycle 2 · Semaine 1, S25 → Cycle 3 · Semaine 1… (tests toutes les 4 semaines).
 */
export function programCycle(profile: Profile): {
  totalWeek: number;
  cycle: number;
  cycleWeek: number;
} {
  if (!profile.startDate) return { totalWeek: 1, cycle: 1, cycleWeek: 1 };
  const start = new Date(profile.startDate).getTime();
  const totalWeek = Math.max(1, Math.floor((Date.now() - start) / (7 * 864e5)) + 1);
  const cycle = Math.floor((totalWeek - 1) / 12) + 1;
  const cycleWeek = ((totalWeek - 1) % 12) + 1;
  return { totalWeek, cycle, cycleWeek };
}

/** Semaine dans le cycle courant (1-12). */
export function currentProgramWeek(profile: Profile): number {
  return programCycle(profile).cycleWeek;
}

export function isTestWeek(profile: Profile): boolean {
  const w = currentProgramWeek(profile);
  return w % 4 === 0;
}

// Downscale image file → base64 JPEG (max 800px, ~70% quality) for localStorage.
export async function fileToCompressedBase64(
  file: File,
  maxDim = 800,
  quality = 0.7,
): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
