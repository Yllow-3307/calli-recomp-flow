# Calli Recomp Tracker — Instructions pour Jules / agents de code

Langue de travail : français.

Cette app est une PWA/mobile-first de suivi sportif créée avec Lovable.

## Objectif de l'app

Calli Recomp Tracker permet de suivre un programme de recomposition corporelle avec :

- callisthénie,
- skills avancés,
- running,
- cardio alternatif,
- nutrition recomp,
- mesures corporelles,
- photos de progression,
- progression sur 12 semaines.

## Stack probable

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Vite ou framework similaire généré par Lovable

Avant toute modification, analyser le code existant au lieu de supposer l'architecture.

## Fichiers de référence

Consulter si présents :

- `docs/programme_seed.json`
- `docs/guide_creation_app_cali.md`
- `docs/skills_sportifs.md`
- `docs/ui_skill.md`
- `docs/AUDIT_LOVABLE.md`

## Règles importantes

- Ne pas modifier la structure sportive du programme sans demande explicite.
- Ne pas remplacer les données du programme par des données génériques.
- Ne pas supprimer de page existante.
- Ne pas casser le lecteur de séance.
- Ne pas casser Supabase, l'authentification, les migrations ou les règles RLS.
- Ne pas ajouter de redesign avant que les données soient fiables.
- Ne pas ajouter de dépendances lourdes sans justification.
- Garder l'app mobile-first, lisible et rapide.
- Toujours préserver les fonctionnalités existantes.

## Pages importantes

L'app doit conserver ou améliorer :

- Dashboard / Aujourd'hui
- Séance du jour
- Programme
- Nutrition
- Progression
- Mesures/photos
- Paramètres
- Historique, à ajouter si absent
- Skills, à ajouter si absent

## Priorité technique

L'ordre recommandé est :

1. Audit du code Lovable.
2. Vérification localStorage vs Supabase.
3. Authentification utilisateur.
4. Données persistantes Supabase.
5. RLS : chaque utilisateur ne voit que ses données.
6. Photos privées via Supabase Storage.
7. Historique des séances.
8. Progression réelle, sans données de démo.
9. Page Skills si absente.
10. Navigation mobile.
11. Design premium.

## Données à sauvegarder côté utilisateur

Les données personnelles doivent être liées à `auth.uid()` :

- profil utilisateur,
- séances terminées,
- logs de séries/exercices,
- cardio,
- nutrition,
- eau,
- mesures corporelles,
- photos,
- tests de progression,
- notes.

## Tables attendues si Supabase est utilisé

- `profiles`
- `workout_templates`
- `exercise_templates`
- `workout_sessions`
- `exercise_logs`
- `cardio_logs`
- `meal_logs`
- `hydration_logs`
- `body_metrics`
- `progress_tests`

Les templates du programme peuvent être partagés. Les données personnelles doivent être privées.

## Skills sportifs à suivre

- Handstand
- HSPU / Handstand Push-Up
- Muscle-up
- Tuck flag / Human flag progression
- Dragon flag
- L-sit

Règles de progression :

- Tests S4, S8, S12.
- +1/+2 reps si haut de fourchette atteint avec RPE ≤ 8.
- +5 secondes pour les holds réussis.
- Pas de progression si RPE ≥ 9 ou séance incomplète.
- Technique parfaite avant volume.

Voir `docs/skills_sportifs.md` pour le détail.

## Design premium

Le design premium est autorisé uniquement après fiabilisation des données.

Style cible :

- dark mode premium,
- fitness moderne,
- glassmorphism léger,
- gradients subtils,
- boutons avec glow discret,
- badges colorés par type de séance,
- navigation mobile claire,
- lecteur de séance très lisible.

Ne pas mettre d'effet 3D lourd sur le lecteur de séance.
Privilégier CSS/Tailwind. Voir `docs/ui_skill.md`.

## Tests attendus après modification

Quand possible, lancer :

- installation dépendances si nécessaire,
- build,
- lint,
- tests existants.

Toujours documenter :

- fichiers modifiés,
- raison des changements,
- risques,
- tests effectués,
- tests manuels à faire.
