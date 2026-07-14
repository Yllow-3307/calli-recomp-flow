# Guide pour créer ton app de suivi du programme Callisthénie Recomp

Ce guide est fait pour créer une app avec **Lovable** ou **Claude** à partir du PDF `programme_fusionne_recomp_cali.pdf`.

## 1) Recommandation rapide

### Option A — Lovable, recommandé pour aller vite
Choisis Lovable si tu veux une **web app / PWA utilisable sur téléphone** rapidement, sans trop coder.

Stack conseillée :
- React + TypeScript
- Tailwind + shadcn/ui
- Supabase pour compte utilisateur + base de données
- PWA pour l’utiliser depuis l’écran d’accueil du téléphone

### Option B — Claude / Claude Code, recommandé si tu veux tout contrôler
Choisis Claude si tu veux un vrai projet codé, maintenable, versionné sur GitHub.

Stack conseillée :
- MVP web : React + Vite + TypeScript + Tailwind + Supabase
- Mobile plus tard : Expo / React Native
- Tests : Playwright

---

## 2) Ce que l’app doit faire

Nom proposé : **Calli Recomp Tracker**

But : suivre et exécuter tout le programme du PDF : callisthénie, skills, running, cardio alternatif, nutrition recomp, progression 3 mois, photos/mesures, repos.

### Fonctionnalités MVP indispensables

1. **Onboarding utilisateur**
   - Poids, taille, objectif, niveau
   - Choix programme : 6 jours/semaine ou option 5 jours
   - Équipement disponible : barre de traction, chaises/banc, rameur, piscine, vélo, élastique
   - Jours préférés d’entraînement
   - Max actuels : pompes, tractions, handstand, course 5 km, etc.

2. **Dashboard quotidien**
   - Séance du jour
   - Bouton “Démarrer la séance”
   - Progression de la semaine
   - Rappel règles d’or : abdos contractés, filmer, Zone 2 conversationnelle, protéines/eau, dimanche repos
   - Résumé : séances faites, km courus, protéines, eau, poids

3. **Lecteur de séance**
   - Échauffement obligatoire 5–10 min
   - Liste d’exercices avec séries/reps/temps
   - Timer repos 60–90s ou 90–120s selon séance
   - Saisie par série : reps, secondes, charge/lest optionnel, RPE, notes
   - Validation exercice par exercice
   - Finisher cardio optionnel
   - Case “je me suis filmé”

4. **Programme hebdomadaire depuis le PDF**
   - Lundi : Running Zone 2 6–7 km + core léger
   - Mardi : Push avancé HSPU prep + Push PPL
   - Mercredi : running fractionné 6 km
   - Jeudi : Pull muscle-up prep + Pull PPL
   - Vendredi : Running Zone 2 récup 6 km + jambes légères
   - Samedi : Legs + skills HSPU + Tuck flag
   - Dimanche : repos complet

5. **Cardio et alternatives**
   - Course : distance, temps, allure, Zone 2 ou fractionné
   - Alternatives : rameur, piscine, vélo route/VTT
   - Séances fractionnées avec intervalles

6. **Progression 3 mois**
   - Objectifs par exercice : pompes, tractions, handstand, HSPU, muscle-up, tuck flag, dragon flag, L-sit, course
   - Toutes les semaines : +1–2 reps ou +temps hold si séance réussie
   - Toutes les 4 semaines : test max reps / temps
   - Photos + mesures toutes les 2 semaines

7. **Nutrition recomp simplifiée**
   - Calcul protéines : 1,8 à 2,2 g/kg/jour
   - Calories : maintien ou léger déficit -200/-400 kcal
   - Eau : 3–4 L/jour
   - Log repas simple : petit-déj, déjeuner, collation, dîner
   - Macros : protéines, glucides, lipides, calories

8. **Suivi des mesures**
   - Poids
   - Tour de taille
   - Photos avant/après toutes les 2 semaines
   - Notes énergie/fatigue/sommeil

---

## 3) Pages à créer

1. `/` — Dashboard
2. `/today` — Séance du jour
3. `/workout/:id` — Lecteur de séance
4. `/program` — Vue semaine + programme 12 semaines
5. `/progress` — Graphiques progression
6. `/nutrition` — Macros + repas + eau
7. `/metrics` — Poids, mesures, photos
8. `/settings` — Profil, équipement, option 5/6 jours

---

## 4) Modèle de base de données Supabase conseillé

Tables principales :

### `profiles`
- id uuid primary key
- email text
- name text
- weight_kg numeric
- height_cm numeric
- goal text
- weekly_mode text — `5_days` ou `6_days`
- equipment jsonb
- created_at timestamptz

### `workout_templates`
- id uuid primary key
- day_of_week int
- title text
- category text — running, push, pull, legs_skills, rest
- duration_min int
- description text
- warmup jsonb
- optional_cardio jsonb

### `exercise_templates`
- id uuid primary key
- workout_template_id uuid
- name text
- muscle_group text
- type text — reps, hold, distance, interval
- sets int
- reps_min int
- reps_max int
- seconds_min int
- seconds_max int
- distance_km numeric
- rest_seconds int
- instructions text
- progression text
- alternatives jsonb
- sort_order int

### `scheduled_workouts`
- id uuid primary key
- user_id uuid
- workout_template_id uuid
- scheduled_date date
- status text — planned, completed, skipped
- week_number int

### `workout_sessions`
- id uuid primary key
- user_id uuid
- scheduled_workout_id uuid
- started_at timestamptz
- completed_at timestamptz
- duration_min int
- perceived_difficulty int
- filmed boolean
- notes text

### `exercise_logs`
- id uuid primary key
- session_id uuid
- exercise_template_id uuid
- set_number int
- reps int
- seconds int
- weight_kg numeric
- distance_km numeric
- rpe int
- completed boolean
- notes text

### `cardio_logs`
- id uuid primary key
- user_id uuid
- session_id uuid
- type text — run, rower, swim, bike
- mode text — zone2, recovery, intervals, hiit
- distance_km numeric
- duration_min int
- pace text
- avg_hr int
- notes text

### `body_metrics`
- id uuid primary key
- user_id uuid
- date date
- weight_kg numeric
- waist_cm numeric
- sleep_hours numeric
- energy int
- fatigue int
- notes text

### `meal_logs`
- id uuid primary key
- user_id uuid
- date date
- meal_type text
- name text
- calories int
- protein_g numeric
- carbs_g numeric
- fat_g numeric

### `progress_tests`
- id uuid primary key
- user_id uuid
- date date
- exercise text
- result_value numeric
- unit text — reps, seconds, km
- notes text

---

## 5) Prompt principal à coller dans Lovable

Copie-colle ce prompt dans Lovable après avoir créé un nouveau projet.

```text
Crée une application web mobile-first en français appelée “Calli Recomp Tracker”.

Objectif : permettre à un utilisateur de suivre et exécuter un programme sportif de recomposition corporelle basé sur callisthénie + skills + running + nutrition. L’app doit être claire, motivante, utilisable sur téléphone pendant l’entraînement.

Stack souhaitée : React + TypeScript + Tailwind + shadcn/ui. Utilise Supabase pour l’authentification et la base de données. Prépare l’app comme une PWA si possible.

Programme hebdomadaire à intégrer :
- Lundi : Running Zone 2 6–7 km + core léger. Alternative : rameur 30–40 min steady ou piscine 30 min crawl.
- Mardi : PUSH avancé, HSPU prep + Push PPL.
- Mercredi : Running fractionné 6 km : échauffement 1 km puis 5×2 min rapide / 90s récup. Alternative : rameur HIIT 30s max / 60s récup × 8–10 ou piscine intervalles.
- Jeudi : PULL, muscle-up prep + Pull PPL.
- Vendredi : Running Zone 2 récup 6 km + pont fessier + mollets. Alternative : vélo 30–40 min ou piscine 25 min.
- Samedi : LEGS + Skills : handstand, HSPU mur, tuck flag, dragon flag, jambes.
- Dimanche : repos complet, marche légère optionnelle et mobilité.

Fonctionnalités à créer :
1. Onboarding avec poids, taille, objectif, équipement disponible, choix 5 ou 6 jours/semaine, niveau actuel.
2. Dashboard du jour avec séance prévue, progression semaine, streak, km courus, protéines/eau, rappel règles d’or.
3. Lecteur de séance : échauffement, exercices, séries, reps ou temps, timer de repos, notes, RPE, bouton terminer, case “je me suis filmé”.
4. Suivi cardio : course, rameur, natation, vélo, distance, durée, allure, zone 2/intervalles.
5. Progression 3 mois : pompes, tractions, handstand, HSPU, muscle-up, tuck flag, dragon flag, L-sit, course. Règle : +1–2 reps ou +temps chaque semaine si réussi, test toutes les 4 semaines.
6. Nutrition recomp : calcul protéines 1,8–2,2 g/kg, eau 3–4 L, log repas avec calories/protéines/glucides/lipides.
7. Mesures : poids, tour de taille, photos toutes les 2 semaines, sommeil, énergie, fatigue.
8. Option 5 jours : permettre de supprimer un jour running ou Push/Pull.
9. Design : sombre premium, cartes claires, gros boutons, très lisible pendant le sport.

Pages :
- Dashboard
- Séance du jour
- Lecteur de séance
- Programme semaine/12 semaines
- Progression
- Nutrition
- Mesures/photos
- Paramètres

Base de données Supabase : crée les tables nécessaires pour profiles, workout_templates, exercise_templates, scheduled_workouts, workout_sessions, exercise_logs, cardio_logs, body_metrics, meal_logs, progress_tests.

Important : l’app doit contenir des données de démonstration prêtes à l’emploi pour la semaine type. L’utilisateur doit pouvoir démarrer une séance immédiatement sans tout configurer.
```

---

## 6) Prompts d’itération pour Lovable

### Prompt 2 — améliorer le lecteur de séance
```text
Améliore le lecteur de séance : chaque exercice doit avoir des cartes par série avec saisie reps/secondes, RPE de 1 à 10, notes, bouton série terminée, timer de repos automatique selon l’exercice. Ajoute une barre de progression de séance et un résumé final avec volume total, temps total et exercices réussis.
```

### Prompt 3 — progression automatique
```text
Ajoute une logique de progression automatique : si l’utilisateur termine toutes les séries dans la fourchette haute avec RPE ≤ 8, propose +1 ou +2 reps la semaine suivante, ou +5 secondes pour les holds. Si RPE ≥ 9 ou séance incomplète, garder le même niveau. Toutes les 4 semaines, afficher un écran de test max reps/temps pour pompes, tractions, handstand, dragon flag, L-sit et course.
```

### Prompt 4 — nutrition
```text
Améliore la page nutrition : calcule automatiquement la cible protéines entre 1,8 et 2,2 g/kg selon le poids utilisateur. Affiche eau cible 3–4 L. Ajoute un journal repas par jour avec calories, protéines, glucides, lipides, et une barre de progression protéines/eau. Ajoute les exemples repas du programme : œufs + avoine + fruits, poulet + riz + légumes, shake + banane, poisson + patates douces + salade.
```

### Prompt 5 — photos/mesures
```text
Ajoute un suivi photos et mesures : rappel toutes les 2 semaines, upload photo face/profil/dos, poids, tour de taille, énergie, fatigue, sommeil. Affiche une timeline et des graphiques simples. Les photos doivent être privées et liées à l’utilisateur connecté.
```

---

## 7) Prompt à donner à Claude / Claude Code

```text
Tu es mon développeur senior full-stack. Je veux construire une app appelée “Calli Recomp Tracker”, en français, à partir du fichier programme_fusionne_recomp_cali.pdf que je joins.

Objectif : une PWA mobile-first qui permet de suivre et exécuter tout le programme : callisthénie, skills, running, cardio alternatif, nutrition recomp, progression 3 mois, photos/mesures, repos.

Stack : React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase. Code propre, composants réutilisables, responsive mobile, UX utilisable pendant une séance.

Lis le PDF et transforme-le en données structurées. Crée :
1. Le modèle de données Supabase.
2. Les pages : Dashboard, Today, Workout Player, Program, Progress, Nutrition, Metrics, Settings.
3. Les templates des séances du programme.
4. Un lecteur de séance avec séries, reps/hold, timer, RPE, notes, validation.
5. Un suivi running/cardio.
6. Une progression automatique sur 12 semaines.
7. Un suivi nutrition simple avec protéines 1,8–2,2 g/kg, eau 3–4 L, macros.
8. Un suivi photos/mesures toutes les 2 semaines.

Contraintes :
- UI en français.
- Pas de contenu externe obligatoire.
- Préparer des données de démo.
- Supabase auth + tables avec RLS.
- Explique-moi chaque étape et donne les commandes à lancer.

Commence par me proposer l’architecture des fichiers, le schéma SQL Supabase, puis code le MVP étape par étape.
```

---

## 8) Quoi ajouter à Claude : savoir / fichiers / outils

### Dans Claude Projects
Crée un projet Claude nommé **Calli Recomp Tracker** et ajoute en Knowledge :
1. Le PDF `programme_fusionne_recomp_cali.pdf`
2. Ce guide
3. Un fichier JSON structuré du programme si disponible
4. Tes préférences personnelles : poids, taille, objectif, matériel, nombre de jours/semaine

Instructions du projet Claude :
```text
Réponds en français. Tu m’aides à construire une app de suivi sportif basée sur le programme PDF. Ne change pas la logique du programme sans me prévenir. Priorité : application mobile-first simple, fiable, progressive, avec suivi des séances, cardio, nutrition, photos/mesures. Propose toujours des étapes concrètes et du code prêt à copier.
```

### Si tu utilises Claude Code localement
Outils utiles :
- Accès au dossier du projet
- Git/GitHub
- Node.js 20+
- Supabase CLI si possible
- Playwright pour tester l’interface

Commandes typiques :
```bash
npm create vite@latest calli-recomp-tracker -- --template react-ts
cd calli-recomp-tracker
npm install
npm install @supabase/supabase-js react-router-dom lucide-react recharts date-fns
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev
```

### MCP utiles avec Claude Desktop / Claude Code
Optionnel, mais très pratique :
- **filesystem** : pour lire/écrire dans ton projet
- **github** : pour commits, issues, pull requests
- **supabase** : pour gérer tables/migrations
- **playwright** : pour tester l’app dans un navigateur
- **context7** : pour récupérer la doc récente des librairies

Tu n’es pas obligé d’avoir tout ça. Pour démarrer, le plus important est : PDF + prompt + Supabase + Lovable ou Claude Code.

---

## 9) Données du programme à intégrer

### Semaine type
- Lundi : Running Zone 2 6–7 km + Hollow body hold + Planche
- Mardi : Push HSPU + pike push-up, HSPU négatif, pompes archer, dips, pompes, handstand, core
- Mercredi : Running fractionné 6 km + Bulgarian split squats
- Jeudi : Pull muscle-up + tractions strictes, chest-to-bar, tractions explosives, transition MU, rows, chin-ups, relevés jambes, dragon flag
- Vendredi : Running récup 6 km + pont fessier + mollets
- Samedi : Legs + skills : handstand, HSPU mur, tuck flag, planche latérale, dragon flag, squats, fentes, Bulgarian, pistol progression, hip thrust, mollets, mountain climbers, L-sit
- Dimanche : repos complet

### Règles d’or à afficher dans l’app
1. Abdos contractés H24.
2. Filme-toi profil + face à chaque séance.
3. Dimanche sacré = repos complet.
4. Protéines 1,8–2,2 g/kg/jour + 3–4 L eau.
5. Régularité > intensité.
6. Zone 2 = conversationnelle.
7. Barre de traction recommandée.
8. Progression progressive : reps, variations plus dures, tempo lent, pauses isométriques.
9. Qualité > quantité.
10. Photos + mesures toutes les 2 semaines.

---

## 10) Plan de création conseillé

### Jour 1 — MVP app utilisable
- Créer projet Lovable ou React
- Auth Supabase
- Dashboard
- Programme semaine
- Lecteur de séance basique

### Jour 2 — Suivi réel
- Logs séries/exercices
- Cardio logs
- Historique séances
- Progression semaine

### Jour 3 — Nutrition + mesures
- Calcul macros
- Log repas/eau
- Poids/tour de taille/photos

### Jour 4 — Progression 12 semaines
- Tests toutes les 4 semaines
- Suggestions automatiques
- Graphiques

### Jour 5 — Polish
- PWA
- Notifications/rappels
- Mode sombre premium
- Export CSV/PDF
