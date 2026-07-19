import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, TopBar } from "@/components/BottomNav";
import { SKILLS_GUIDE, type SkillGuide } from "@/lib/program";
import {
  useAppState,
  useAppActions,
  getSkillPracticeInfo,
  currentProgramWeek,
  isTestWeek,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  Trophy,
  History,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowLeft,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/skills")({
  head: () => ({ meta: [{ title: "Mes Skills — Calli Recomp" }] }),
  component: SkillsPage,
});

function computeAutoStatus(
  skillId: string,
  latestValue: number | undefined,
): "non commencé" | "en cours" | "proche" | "validé" {
  if (latestValue === undefined || latestValue === null || latestValue === 0) {
    return "non commencé";
  }

  switch (skillId) {
    case "handstand":
      if (latestValue < 25) return "en cours";
      if (latestValue >= 30 || latestValue >= 10) return "validé";
      return "proche";
    case "hspu":
      if (latestValue < 4) return "en cours";
      if (latestValue >= 5) return "validé";
      return "proche";
    case "muscleup":
      if (latestValue < 1) return "en cours";
      if (latestValue >= 5) return "validé";
      return "proche";
    case "tuckflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validé";
      return "proche";
    case "dragonflag":
      if (latestValue < 5) return "en cours";
      if (latestValue >= 10) return "validé";
      return "proche";
    case "lsit":
      if (latestValue < 12) return "en cours";
      if (latestValue < 25) return "proche";
      return "validé";
    default:
      return "en cours";
  }
}

function StatusBadge({ status }: { status: "non commencé" | "en cours" | "proche" | "validé" }) {
  const styles = {
    "non commencé": "bg-muted text-muted-foreground border-muted-foreground/20",
    "en cours": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    proche: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    validé: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  return (
    <span
      className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function SkillsPage() {
  const state = useAppState();
  const actions = useAppActions();
  const week = currentProgramWeek(state.profile);
  const testWeek = isTestWeek(state.profile);

  // Tracks which skill's technical notes or settings are open/editable
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const handleSaveNotes = (skillId: string, value: string) => {
    actions.setSkillNote(skillId, value);
    toast.success("Notes techniques enregistrées !");
    setEditingNotes((prev) => {
      const copy = { ...prev };
      delete copy[skillId];
      return copy;
    });
  };

  return (
    <PageShell>
      <div className="px-5 pt-4 flex items-center gap-2">
        <Link
          to="/progression"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour Progression</span>
        </Link>
      </div>

      <TopBar title="Mes Skills" subtitle={`Suivi précis des compétences · Semaine ${week}`} />

      {testWeek && (
        <div className="px-5 mb-4">
          <div
            className="card-premium p-4 ring-1 ring-primary/40 flex items-start gap-3"
            style={{ backgroundImage: "var(--gradient-card)" }}
          >
            <div className="h-10 w-10 grid place-items-center rounded-full btn-hero shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Semaine de test active S{week} !</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                C'est le moment idéal pour tester tes hold times et max reps sur tes skills et
                mettre à jour ton niveau actuel !
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 space-y-4 lg:space-y-0 masonry-lg">
        {SKILLS_GUIDE.map((skill) => {
          // 1. Fetch historical tests for this skill
          const logs = state.tests
            .filter((t) => t.testId === skill.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const latestTestValue = logs[0]?.value;

          // 2. Compute record
          const bestRecord = logs.length > 0 ? Math.max(...logs.map((l) => l.value)) : null;

          // 3. Compute Auto Status & get Current Status
          const autoStatus = computeAutoStatus(skill.id, latestTestValue);
          const savedStatus = state.skillStatuses[skill.id] || "auto";
          const currentStatus = savedStatus === "auto" ? autoStatus : savedStatus;

          // 4. Fetch Technical Notes
          const customNote = state.skillNotes[skill.id];
          const hasCustomNote = customNote !== undefined && customNote.trim() !== "";
          const activeNoteText = hasCustomNote ? customNote : skill.defaultNotes;

          // 5. Fetch Last Practice Info from workouts
          const practiceInfo = getSkillPracticeInfo(skill.id, state.workouts);

          // 6. Next test week
          // Tests are S4, S8, S12
          let nextTestText = "Prévu Semaine 4";
          if (week > 8) {
            nextTestText = "Prévu Semaine 12";
          } else if (week > 4) {
            nextTestText = "Prévu Semaine 8";
          }

          const isExpanded = expandedSkill === skill.id;

          return (
            <div
              key={skill.id}
              className={`card-premium p-4 border-l-2 relative overflow-hidden transition-all duration-300 ${
                currentStatus === "validé" ? "border-l-emerald-500" : "border-l-primary"
              }`}
            >
              {/* Skill Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-base flex items-center gap-1.5">
                    {skill.name}
                    <StatusBadge status={currentStatus} />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Niveau actuel :{" "}
                    <span className="font-bold text-foreground">
                      {latestTestValue !== undefined
                        ? `${latestTestValue} ${skill.unit}`
                        : "Non testé"}
                    </span>
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-1.5">
                  <button
                    onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors flex items-center gap-1 text-xs font-semibold"
                  >
                    <span>Détails</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick info bar */}
              <div className="grid grid-cols-2 gap-3 mt-3.5 pt-3 border-t border-border/40 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                    Meilleur Record
                  </span>
                  <span className="font-extrabold text-foreground flex items-center gap-1 mt-0.5">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    {bestRecord !== null ? `${bestRecord} ${skill.unit}` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                    Prochain Test
                  </span>
                  <span className="font-extrabold text-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {testWeek ? "Semaine de test !" : nextTestText}
                  </span>
                </div>
              </div>

              {/* Practice logs summary */}
              {practiceInfo ? (
                <div className="mt-3 p-2 bg-muted/20 border border-border/20 rounded-xl text-xs space-y-1">
                  <p className="text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Dernier entraînement :
                    </span>
                    <span className="font-semibold text-foreground">
                      {practiceInfo.daysAgo === 0
                        ? "Aujourd'hui"
                        : practiceInfo.daysAgo === 1
                          ? "Hier"
                          : `il y a ${practiceInfo.daysAgo} jours`}
                    </span>
                  </p>
                  <p className="text-muted-foreground font-medium truncate">
                    Perf :{" "}
                    <span className="text-foreground font-semibold">
                      {practiceInfo.lastPerfSummary}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-2 bg-muted/10 border border-dashed border-border/30 rounded-xl text-xs text-center text-muted-foreground">
                  Aucune séance enregistrée pour ce skill dans l'historique.
                </div>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Milestones / Goals */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> Objectifs de progression
                    </p>
                    <div className="grid grid-cols-3 gap-2 bg-muted/25 p-2.5 rounded-xl border border-border/30">
                      <div className="text-center">
                        <span className="text-[10px] text-muted-foreground block">Mois 1</span>
                        <span
                          className="text-xs font-bold text-foreground mt-0.5 block truncate"
                          title={skill.month1}
                        >
                          {skill.month1}
                        </span>
                      </div>
                      <div className="text-center border-x border-border/30 px-1">
                        <span className="text-[10px] text-muted-foreground block">Mois 2</span>
                        <span
                          className="text-xs font-bold text-foreground mt-0.5 block truncate"
                          title={skill.month2}
                        >
                          {skill.month2}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-muted-foreground block">Mois 3</span>
                        <span
                          className="text-xs font-bold text-foreground mt-0.5 block truncate"
                          title={skill.month3}
                        >
                          {skill.month3}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Configuration override */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Ajustement du statut
                    </label>
                    <select
                      value={savedStatus}
                      onChange={(e) => {
                        actions.setSkillStatus(
                          skill.id,
                          e.target.value as
                            "non commencé" | "en cours" | "proche" | "validé" | "auto",
                        );
                        toast.success("Statut ajusté !");
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-input border border-border text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="auto">Auto-calculé ({autoStatus})</option>
                      <option value="non commencé">Non commencé</option>
                      <option value="en cours">En cours</option>
                      <option value="proche">Proche</option>
                      <option value="validé">Validé</option>
                    </select>
                  </div>

                  {/* Technical notes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-primary" /> Notes techniques & rappels
                      </p>
                      {editingNotes[skill.id] === undefined ? (
                        <button
                          onClick={() =>
                            setEditingNotes((p) => ({ ...p, [skill.id]: activeNoteText }))
                          }
                          className="text-[10px] text-primary hover:underline font-bold"
                        >
                          Modifier
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveNotes(skill.id, editingNotes[skill.id])}
                            className="text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-0.5"
                          >
                            <Check className="h-3 w-3" /> Enregistrer
                          </button>
                          <button
                            onClick={() => {
                              setEditingNotes((p) => {
                                const copy = { ...p };
                                delete copy[skill.id];
                                return copy;
                              });
                            }}
                            className="text-[10px] text-muted-foreground hover:underline font-bold"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>

                    {editingNotes[skill.id] === undefined ? (
                      <p className="text-xs text-muted-foreground leading-relaxed p-3 bg-muted/20 border border-border/20 rounded-xl">
                        {activeNoteText}
                      </p>
                    ) : (
                      <Textarea
                        value={editingNotes[skill.id]}
                        onChange={(e) =>
                          setEditingNotes((p) => ({ ...p, [skill.id]: e.target.value }))
                        }
                        className="text-xs leading-relaxed h-24 bg-input focus:ring-1 focus:ring-primary focus:outline-none rounded-xl"
                        placeholder="Inscris tes propres remarques, rappels de posture, filmage..."
                      />
                    )}
                  </div>

                  {/* Test Entries History */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <History className="h-3 w-3 text-primary" /> Historique des tests (
                      {logs.length})
                    </p>
                    {logs.length > 0 ? (
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-muted/10 p-2 rounded-xl border border-border/20">
                        {logs.map((log, index) => {
                          const prevLog = logs[index + 1];
                          const diff = prevLog !== undefined ? log.value - prevLog.value : null;
                          return (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-[11px] py-1 border-b border-border/10 last:border-none last:pb-0 first:pt-0"
                            >
                              <span className="text-muted-foreground font-medium">
                                {new Date(log.date).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "2-digit",
                                })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-foreground">
                                  {log.value} {skill.unit}
                                </span>
                                {diff !== null && diff !== 0 && (
                                  <span
                                    className={`font-semibold ${
                                      diff > 0 ? "text-success" : "text-destructive"
                                    }`}
                                  >
                                    ({diff > 0 ? "+" : ""}
                                    {diff})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic p-2 bg-muted/10 rounded-xl text-center">
                        Aucun test enregistré. Utilise la page Progression pour ajouter tes
                        résultats.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 mt-6 mb-8 text-center">
        <Link
          to="/progression"
          className="inline-flex rounded-full bg-card border border-border px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors gap-2 items-center mx-auto"
        >
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>Saisir un nouveau test de skill</span>
        </Link>
      </div>
    </PageShell>
  );
}
