# Architecture du Programme Adaptatif — Calli Recomp

## Vue d'ensemble

L'application utilise un **moteur de décision à 5 modules d'entrée** qui génère un programme
personnalisé (séances + nutrition) de manière 100% déterministe — aucune IA payante nécessaire.

```
┌─────────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐
│ 1. Profil   │  │ 2. Niveau│  │ 3. Dispo     │  │ 4. Équipement│  │ 5. Objectif│
│ BMR/TDEE    │  │ Tier 1-3 │  │ Split + Vol  │  │ Filtrage     │  │ kcal/Macros│
└──────┬──────┘  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘
       │              │               │                 │               │
       └──────────────┴───────────────┴─────────────────┴───────────────┘
                                       │
                              ┌────────┴────────┐
                              │ Moteur de décision│
                              │ (8 étapes)       │
                              └────────┬────────┘
                                       │
                              ┌────────┴────────┐
                              │ Programme final │
                              │ (séances + nutr)│
                              └─────────────────┘
```

---

## Module 1 — Profil (calcul physiologique)

### Formule : Mifflin-St Jeor (la plus fiable)

- **Homme** : BMR = 10×poids(kg) + 6.25×taille(cm) − 5×âge + 5
- **Femme** : BMR = 10×poids(kg) + 6.25×taille(cm) − 5×âge − 161

### TDEE = BMR × facteur d'activité

Le facteur est **nuancé** (niveau × volume hebdo) :

| Niveau         | 2-3j | 4j  | 5j  | 6j  |
|----------------|------|-----|-----|-----|
| Débutant       | 1.3  | 1.4 | 1.4 | 1.5 |
| Intermédiaire  | 1.4  | 1.5 | 1.6 | 1.6 |
| Avancé         | 1.5  | 1.6 | 1.7 | 1.7 |

### Garde-fous santé

- **Plancher absolu** : 1500 kcal/j (hommes), 1200 kcal/j (femmes)
- **Plancher relatif** : BMR × 0.7 (protège les morphologies petites/tailles)
- **Plancher final** = max(plancher absolu, plancher relatif)

**Fichier** : `src/lib/plan.ts` → `computeMaintenance()`, `computeBMR()`, `computeNutrition()`

---

## Module 2 — Niveau (débutant / intermédiaire / avancé)

### Palier de difficulté (Tier 1-3)

Le palier est calculé à partir du **niveau déclaré** + **capacités déclarées ou perfs réelles** :

```
Score = niveau (1-3) + capacités (0-10 → 1-3)
Tier = round((niveau + capacités) / 2), clampé 1-3
```

| Tier | Label       | Facteur | Description                          |
|------|-------------|---------|--------------------------------------|
| 1    | Fondations  | ×0.7    | Fourchettes allégées, technique      |
| 2    | Progression | ×1.0    | Fourchettes standards                |
| 3    | Avancé      | ×1.3    | Fourchettes renforcées               |

### Progression & Deload

| Niveau         | Durée bloc | Deload | Progression           |
|----------------|------------|--------|-----------------------|
| Débutant       | 8 semaines | Non    | Linéaire (chaque séance) |
| Intermédiaire  | 10-12 sem  | S6     | Par cycle 2-3 semaines |
| Avancé         | 12+ sem    | S4     | Ondulée / blocs       |

**Deload** : volume -50% (sets), intensité -30% (reps/time), exercices plus légers.

**Fichier** : `src/lib/plan.ts` → `computeTier()`, `isDeloadWeek()`, `getDeloadWeek()`

---

## Module 3 — Disponibilité

### Sélection du split

| Jours/semaine | Split                | Volume     | Niveau adapté         |
|---------------|----------------------|------------|-----------------------|
| 2-3           | Full Body            | Low        | Tous                  |
| 4             | Upper/Lower          | Moderate   | Tous                  |
| 5             | PPL + Skills         | High       | Intermédiaire+        |
| 6             | Split complet        | High       | Intermédiaire+        |

> ⚠️ Débutant avec 5-6 jours → Upper/Lower (volume plus modéré)

### Moment de la séance (matin/soir)

- **Matin** → séance à jeun : nutrition post-séance prioritaire
- **Soir** → repas pré-séance recommandé

Le moment influence le **timing nutritionnel** (pas la structure du split).

### Mapping jours

Les jours du split sont **mappés** vers les jours sélectionnés par l'utilisateur :
```
Split [Lun, Mar, Jeu, Sam] → User [Mar, Mer, Jeu, Ven]
→ Mar=Push, Mer=Pull, Jeu=Legs, Ven=Skills
```

**Fichier** : `src/lib/splits.ts` → `selectSplit()`, `getTrainingPattern()`

---

## Module 4 — Équipement

### Pool d'exercices taggés

Chaque exercice est taggé par :
- **Catégorie** : push, pull, legs, core, cardio, skill
- **Groupes musculaires** : pectoraux, dos, épaules, etc.
- **Équipement** : bodyweight, pullup-bar, rings, bands, dumbbells, trx, rower, pool, bike
- **Difficulté** : 1 (débutant), 2 (intermédiaire), 3 (avancé)

### Filtrage

Un exercice est disponible si l'utilisateur possède **au moins un** des équipements requis.
`bodyweight` est toujours disponible.

**Fichier** : `src/lib/exercise-pool.ts` → `EXERCISE_POOL`, `isExerciseAvailable()`, `filterByEquipment()`

---

## Module 5 — Objectif

| Objectif | Ajustement kcal | Protéines (g/kg) | Cardio | Volume musculaire |
|----------|----------------|-------------------|--------|-------------------|
| Recomp   | -8%            | 1.8-2.2           | Modéré | Modéré            |
| Sèche    | -18%           | 2.0-2.2           | Élevé  | Modéré            |
| Muscle   | +10%           | 1.6-2.0           | Faible | Élevé             |
| Skills   | -5%            | 1.8-2.2           | Faible | Modéré            |

### Calcul des macros

- **Protéines** : fourchette g/kg selon objectif
- **Lipides** : ~0.9 g/kg (sol hormonal)
- **Glucides** : calories restantes / 4

**Fichier** : `src/lib/plan.ts` → `GOALS`, `computeNutrition()`

---

## Moteur de décision (8 étapes)

1. **Calculer BMR → TDEE** (profil + activité du module 3)
2. **Ajuster kcal + macros** selon objectif (avec garde-fous santé)
3. **Déterminer split + fréquence** selon dispo + niveau
4. **Filtrer pool d'exercices** selon équipement
5. **Sélectionner exercices** selon niveau + objectif + split
6. **Calculer volume/intensité/repos** selon niveau + objectif
7. **Déterminer durée du bloc** (8-12+ semaines) + deload programmé
8. **Générer le programme final** (séances + nutrition)

**Fichier** : `src/lib/plan.ts` → `generatePlan()`, `generateDynamicDays()`

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/lib/exercise-pool.ts` | Base de données d'exercices taggés (70+ exercices) |
| `src/lib/splits.ts` | Templates de splits dynamiques (full body, upper/lower, PPL) |
| `src/lib/plan.ts` | Moteur de génération (nutrition, split, exercices, deload) |
| `src/lib/program.ts` | Seed de référence + EXERCISE_SWAPS + SKILLS_GUIDE |
| `src/lib/store.ts` | Store applicatif + synchronisation Supabase |
| `src/routes/onboarding.tsx` | Wizard 4 étapes (objectif → corps → capacités → plan) |
| `src/routes/parametres.tsx` | Réglages profil, équipement, timing, notifications |
| `supabase/migrations/20260721000001_profile_adaptive.sql` | Nouveaux champs profil |

---

## Migration depuis l'ancien système

L'ancien système utilisait un **seed JSON fixe** (`programme_seed.json`) avec 7 jours codés en dur.
Le nouveau système **génère dynamiquement** le programme à partir du pool d'exercices.

### Compatibilité ascendante

- Les anciens plans stockés (version 1) continuent de fonctionner via `planDays()`
- La régénération via `/onboarding` crée un plan version 2 (dynamique)
- Le seed `PROGRAM` reste comme fallback si le plan n'est pas disponible

### Ce qui a changé

| Ancien | Nouveau |
|--------|---------|
| Seed JSON fixe (7 jours) | Génération dynamique (split + pool) |
| Facteur activité 1.5 fixe | Nuancé (niveau × volume) |
| Plancher 1200 kcal fixe | max(1500H/1200F, BMR×0.7) |
| Pas de deload | Deload programmé (S6 intermédiaire, S4 avancé) |
| Pas de timing | Matin/Soir → conseils nutrition |
| Équipement cosmétique | Filtrage automatique des exercices |
| 5-6 jours seulement | 2-6 jours avec mapping dynamique |
