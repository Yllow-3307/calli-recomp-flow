import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

export interface Profile {
  weight: number;
  height: number;
  goal: string;
  equipment: string[];
  daysPerWeek: 5 | 6;
  level: "débutant" | "intermédiaire" | "avancé";
  onboarded: boolean;
  startDate?: string; // ISO date when program started
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
  tests: [
    {
      id: "seed-1",
      date: new Date(Date.now() - 30 * 864e5).toISOString(),
      testId: "pushups",
      value: 22,
    },
    {
      id: "seed-2",
      date: new Date(Date.now() - 30 * 864e5).toISOString(),
      testId: "pullups",
      value: 8,
    },
    {
      id: "seed-3",
      date: new Date(Date.now() - 30 * 864e5).toISOString(),
      testId: "handstand",
      value: 15,
    },
    {
      id: "seed-4",
      date: new Date(Date.now() - 2 * 864e5).toISOString(),
      testId: "pushups",
      value: 28,
    },
    {
      id: "seed-5",
      date: new Date(Date.now() - 2 * 864e5).toISOString(),
      testId: "pullups",
      value: 10,
    },
    {
      id: "seed-6",
      date: new Date(Date.now() - 2 * 864e5).toISOString(),
      testId: "handstand",
      value: 22,
    },
  ],
  water: {},
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
            daysPerWeek: (data.days_per_week === 5 ? 5 : 6) as 5 | 6,
            level: data.level || "intermédiaire",
            equipment: data.equipment || ["Barre traction", "Anneaux", "Haltères"],
            onboarded: data.onboarded,
            startDate: data.start_date || s.profile.startDate || new Date().toISOString(),
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
          daysPerWeek: (profileData.days_per_week === 5 ? 5 : 6) as 5 | 6,
          level: profileData.level || "intermédiaire",
          equipment: profileData.equipment || ["Barre traction", "Anneaux", "Haltères"],
          onboarded: profileData.onboarded,
          startDate: profileData.start_date || currentProfile.startDate || new Date().toISOString(),
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

      // 4. Sync Body Metrics
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

      const metricsToInsert: BodyMetric[] = [];
      for (const lm of localState.metrics) {
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
        ...localState.tests.filter((t) => t.id.startsWith("seed-")),
        ...(remoteTests || []).map((rt) => ({
          id: rt.id,
          date: rt.date,
          testId: rt.test_id,
          value: Number(rt.value),
        })),
      ];

      const testsToInsert: ProgressTest[] = [];
      for (const lt of localState.tests) {
        if (lt.id.startsWith("seed-")) continue;

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
            sets: (l.sets as SetLog[]) || [],
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

      // 8. Update state
      setState((s) => ({
        ...s,
        profile: currentProfile,
        meals: mergedMeals,
        cardio: mergedCardio,
        metrics: mergedMetrics,
        tests: mergedTests,
        water: mergedWater,
        workouts: mergedWorkouts.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      }));

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
          toast.error("Séance enregistrée localement. La synchronisation réseau a échoué.");
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
          toast.error("Cardio enregistré localement. La synchronisation réseau a échoué.");
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
          toast.error("Repas enregistré localement. La synchronisation réseau a échoué.");
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
          toast.error("Mesures enregistrées localement. La synchronisation réseau a échoué.");
        }
      }, 0);
    }, []),
    removeMetric: useCallback((id: string) => {
      setState((s) => ({ ...s, metrics: s.metrics.filter((x) => x.id !== id) }));

      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

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
          toast.error(
            "Test de progression enregistré localement. La synchronisation réseau a échoué.",
          );
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
          toast.error("Hydratation enregistrée localement. La synchronisation réseau a échoué.");
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
          toast.error("Hydratation enregistrée localement. La synchronisation réseau a échoué.");
        }
      }, 0);
    }, []),
  };
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
  reason: "up" | "hold";
}

export function suggestProgressionForExercise(
  exId: string,
  targetMax: number | undefined,
  kind: "reps" | "time" | "distance",
  workouts: WorkoutLog[],
): ProgressionSuggestion | null {
  const lastLog = workouts.find((w) => w.exercises.some((e) => e.exId === exId));
  if (!lastLog) return null;
  const ex = lastLog.exercises.find((e) => e.exId === exId)!;
  const setsDone = ex.sets.filter((s) => s.done);
  if (setsDone.length < ex.sets.length)
    return { exId, name: ex.name, hint: "Séance incomplète", delta: "= idem", reason: "hold" };

  const values = setsDone
    .map((s) => (kind === "time" ? s.time : s.reps))
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (!values.length) return null;
  const min = Math.min(...values);
  const rpes = setsDone.map((s) => s.rpe).filter((r): r is number => typeof r === "number");
  const maxRpe = rpes.length ? Math.max(...rpes) : 7;

  const hitTop = targetMax !== undefined && min >= targetMax;
  if (hitTop && maxRpe <= 8) {
    if (kind === "time")
      return {
        exId,
        name: ex.name,
        hint: "Objectif atteint · RPE ≤ 8",
        delta: "+5s",
        reason: "up",
      };
    const bump = maxRpe <= 7 ? 2 : 1;
    return {
      exId,
      name: ex.name,
      hint: "Objectif atteint · RPE ≤ 8",
      delta: `+${bump} reps`,
      reason: "up",
    };
  }
  return {
    exId,
    name: ex.name,
    hint: maxRpe >= 9 ? "RPE ≥ 9 : consolider" : "Fourchette non atteinte",
    delta: "= idem",
    reason: "hold",
  };
}

// Current program week (1-12)
export function currentProgramWeek(profile: Profile): number {
  if (!profile.startDate) return 1;
  const start = new Date(profile.startDate).getTime();
  const now = Date.now();
  const weeks = Math.floor((now - start) / (7 * 864e5)) + 1;
  return Math.max(1, Math.min(12, weeks));
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
