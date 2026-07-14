# AUDIT DU CODE ET PLAN DE MIGRATION — CALLI RECOMP TRACKER

Ce document constitue un audit complet de la base de code générée par **Lovable** pour l'application **Calli Recomp Tracker** (PWA mobile-first de suivi sportif et de recomposition corporelle). Il analyse l'architecture, identifie les risques techniques et propose une feuille de route détaillée pour la transition d'un stockage local (`localStorage`) vers une architecture cloud sécurisée et performante avec **Supabase** (Base de données, Authentification, RLS et Stockage).

---

## 1. Résumé exécutif

L'application **Calli Recomp Tracker** est actuellement une Web App / PWA très réactive, centrée sur l'utilisateur mobile. Elle intègre de manière élégante et fluide un programme sportif complexe de 12 semaines (alliant callisthénie, skills, running et nutrition) grâce à une interface premium en mode sombre.

**Forces majeures :**
* **UI/UX impeccable** : L'interface est soignée (glassmorphism léger, palette de couleurs thématique par type d'entraînement), très ergonomique sur mobile et exécute le lecteur de séance et les minuteurs de repos de manière extrêmement robuste.
* **Logique sportive déjà bien implémentée** : Les modèles de données et de suggestions de progression (`+1/+2 reps`, `+5s hold` fondés sur le RPE ≤ 8 et la réussite des séries) sont déjà opérationnels en local.

**Faiblesses critiques (à corriger en priorité) :**
* **Dépendance exclusive au `localStorage`** : Aucune donnée utilisateur (profil, historique des séances, repas, mesures corporelles, photos) n'est sauvegardée sur un serveur distant. Si l'utilisateur vide son cache ou change de téléphone, il perd l'intégralité de son suivi.
* **Risque de saturation immédiate lié aux photos** : Les photos de progression prises toutes les 2 semaines sont encodées en Base64 et stockées directement dans le `localStorage`. Le volume d'une seule photo compressée dépasse rapidement la capacité maximale (souvent plafonnée à 5 Mo par domaine sur mobile), menant à des crashs de l'application.
* **Absence d'authentification et de sécurité (RLS)** : Bien que Supabase soit importé, aucune gestion de session utilisateur, aucun écran de connexion ni de règles de sécurité (Row Level Security) ne sont implémentés.

---

## 2. État actuel de l'application

L'application est 100% fonctionnelle dans un environnement autonome (offline-first mais local-only). Elle simule un comportement complet grâce à un fichier de "seed" local qui alimente le programme de sport et les cibles de nutrition.

* **Mode de fonctionnement** : Local-first, pas de persistance cloud.
* **État de Supabase** : Le client Supabase est initialisé à l'aide de variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), mais les types de base de données (`Database`) sont vides et le client n'est pas sollicité par les vues applicatives.

---

## 3. Architecture du code

L'application repose sur une stack moderne, structurée comme suit :

* **Frontend** : React 18, TypeScript, Tailwind CSS pour le style, et composants d'interface de la bibliothèque **shadcn/ui** (gérés via Radix UI et Lucide React).
* **Routage** : **TanStack Router** (configuré via un arbre de routes généré dans `src/routeTree.gen.ts` et déclaré dans `src/routes/`).
* **Gestion du State** : Un store customisé léger et performant basé sur des écouteurs d'événements React natifs dans `src/lib/store.ts`. Il assure la persistance en local via `localStorage`.
* **Requêtage** : **TanStack Query** (React Query) est initialisé dans le routeur principal (`__root.tsx`) mais n'est pas encore employé pour les opérations CRUD car tout transite par le store synchrone.

---

## 4. Pages existantes (Tableau de routage)

| Route (URL) | Fichier source | Description / Fonctionnalités clés |
| :--- | :--- | :--- |
| `/` | `src/routes/index.tsx` | **Dashboard / Accueil** : Résumé quotidien, progression de la semaine, km de course, raccourcis rapides, cibles eau & protéines, et affichage des règles d'or. |
| `/seance` | `src/routes/seance.tsx` | **Lecteur de séance** : Minuteur d'échauffement, gestion des séries (sets), saisie interactive des reps/secondes/poids/RPE, minuteur de repos dynamique, case "je me suis filmé", et écran de résumé final de performance. |
| `/programme` | `src/routes/programme.tsx` | **Programme de la semaine** : Grille complète des 12 semaines, vue détaillée par jour et par bloc d'exercice avec alternatives de rechange pour les équipements manquants. |
| `/progression` | `src/routes/progression.tsx` | **Progression 3 mois** : Suggestions de surcharge progressive fondées sur les RPE des entraînements précédents, graphes de performance pour les tests de max (S4, S8, S12). |
| `/nutrition` | `src/routes/nutrition.tsx` | **Nutrition** : Suivi des macronutriments (Glucides, Lipides, Protéines, Calories), journal d'eau quotidien interactif, intégration des repas types prédéfinis. |
| `/mesures` | `src/routes/mesures.tsx` | **Mesures & Photos** : Saisie du poids, tour de taille, sommeil, énergie, fatigue, téléversement de photos (Face, Profil, Dos) compressées en Base64, et frise chronologique d'évolution. |
| `/parametres` | `src/routes/parametres.tsx` | **Paramètres** : Édition des informations corporelles, modification du niveau, de l'équipement possédé et bascule entre le format 5 jours et 6 jours par semaine. |

---

## 5. Matrice de stockage actuelle

Le tableau ci-dessous recense comment l'application manipule ses données :

| Type de donnée | Stockage actuel | Impact de perte / Limitation | Cible de migration |
| :--- | :--- | :--- | :--- |
| **Profil utilisateur** (poids, taille, niveau, équipement, fréquence...) | `localStorage` | Faible. Réinitialise l'application à l'onboarding si effacé. | Table `profiles` dans Supabase, liée à `auth.users.id`. |
| **Historique des séances** (séances faites, exercices validés, notes) | `localStorage` | **Critique**. Perte de tout l'historique sportif et des logs d'entraînement. | Tables `workout_sessions` et `exercise_logs` dans Supabase. |
| **Suivi cardio** (distance running, durée, allure) | `localStorage` | **Critique**. Perte des performances de running de l'utilisateur. | Table `cardio_logs` dans Supabase. |
| **Suivi nutritionnel & eau** (repas du jour, hydratation) | `localStorage` | Moyen. Perte du journal de bord quotidien. | Tables `meal_logs` et `hydration_logs` dans Supabase. |
| **Mesures corporelles** (poids, tour de taille, fatigue, énergie) | `localStorage` | **Critique**. Perte des graphiques d'évolution physique. | Table `body_metrics` dans Supabase. |
| **Photos de progression** (images de face, profil, dos) | `localStorage` (b64 JPEG) | **Catastrophique**. Provoque rapidement un crash de stockage local (`QuotaExceededError`). | Fichiers physiques stockés dans un bucket privé **Supabase Storage** ; chemins d'accès conservés dans `body_metrics`. |
| **Tests de max / Progression** (test de force, records max) | `localStorage` | **Critique**. Perte des performances clés de skills. | Table `progress_tests` dans Supabase. |
| **Données statiques du programme** (exercices du PDF, repas de démo) | Fichiers JSON locaux | Aucun impact. Données immuables partagées par tous les utilisateurs. | Conservé en statique dans l'application (ou partagé dans une table en lecture seule). |

---

## 6. Risques majeurs identifiés

### Risque 1 : Crash du `localStorage` par QuotaExceededError (Sévérité : CRITIQUE)
* **Description** : Les navigateurs mobiles brident le stockage local à 5 Mo. Une seule image Base64, même compressée à 70% en 800px de large, pèse entre 100 Ko et 300 Ko. Dès le chargement de 10 à 15 photos, le quota est dépassé. L'application ne peut plus rien écrire et plante.
* **Solution** : Interdire absolument l'encodage et l'écriture des photos dans le store local. Migrer immédiatement les photos vers un bucket dédié.

### Risque 2 : Perte de données utilisateur lors de la purge du cache (Sévérité : ÉLEVÉE)
* **Description** : Les navigateurs mobiles (surtout sous iOS / Safari) suppriment automatiquement les données locales (`localStorage` et `IndexedDB`) des PWA ou sites web non consultés pendant plus de 7 jours consécutifs, ou lorsque l'appareil manque d'espace de stockage.
* **Solution** : Une base de données Postgres cloud (Supabase) assurant la persistance sécurisée.

### Risque 3 : Risque de sécurité et de fuite des données (Sévérité : MOYENNE)
* **Description** : L'authentification n'étant pas active, n'importe qui accédant au terminal d'un utilisateur peut consulter l'ensemble de ses logs. Lors de l'implémentation de Supabase, si les politiques RLS ne sont pas activées par défaut, un utilisateur pourrait accidentellement requêter les lignes de base d'un autre utilisateur.
* **Solution** : Activer le RLS de manière systématique sur l'ensemble des tables personnelles et valider via la condition `auth.uid() = user_id`.

---

## 7. Audit Supabase / Authentification / RLS

Pour réussir la transition cloud, l'architecture cible de sécurité et de persistance doit s'appuyer sur les composants suivants :

### A. Flux d'authentification utilisateur
1. **Écran d'entrée (Onboarding/Login)** : Présentation d'une interface de connexion Premium.
2. **Mécanisme d'authentification** : Connexion par **Email + Mot de passe** (avec validation de format standard) et option d'envoi de **Magic Link** pour un accès rapide sans mot de passe sur smartphone.
3. **Persistance de session** : Gérée via Supabase Auth (jeton JWT rafraîchi automatiquement par le client Supabase).

### B. Schéma de Base de Données Relatif à l'Utilisateur
Pour accueillir les données, les tables SQL suivantes doivent être instanciées (liées par clé étrangère à `auth.users`) :

```sql
-- 1. Table Profiles (prolonge la table d'authentification interne)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  weight NUMERIC NOT NULL DEFAULT 75.0,
  height NUMERIC NOT NULL DEFAULT 178.0,
  goal TEXT DEFAULT 'Recomposition corporelle',
  days_per_week INT NOT NULL DEFAULT 6 CHECK (days_per_week IN (5, 6)),
  level TEXT NOT NULL DEFAULT 'intermédiaire' CHECK (level IN ('débutant', 'intermédiaire', 'avancé')),
  equipment TEXT[] DEFAULT ARRAY['Barre traction', 'Anneaux', 'Haltères']::TEXT[],
  onboarded BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table Sessions d'Entraînement (Workout Sessions)
CREATE TABLE public.workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day_key TEXT NOT NULL,
  day_title TEXT NOT NULL,
  duration INT NOT NULL, -- en minutes
  rpe INT CHECK (rpe BETWEEN 1 AND 10),
  filmed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  total_volume NUMERIC,
  success_count INT
);

-- 3. Table des Logs d'Exercices (liés aux sessions)
CREATE TABLE public.exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.workout_sessions ON DELETE CASCADE NOT NULL,
  ex_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('reps', 'time', 'distance')),
  target_min INT,
  target_max INT,
  sets JSONB NOT NULL, -- contient un tableau d'objets [{reps, time, weight, rpe, done}]
  notes TEXT
);

-- 4. Table des Logs Cardio (Running et alternatives)
CREATE TABLE public.cardio_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('course', 'rameur', 'natation', 'vélo')),
  distance NUMERIC,
  duration INT NOT NULL, -- en minutes
  pace TEXT,
  zone TEXT CHECK (zone IN ('zone2', 'intervalles', 'autre'))
);

-- 5. Table des Mesures Corporelles (Body Metrics)
CREATE TABLE public.body_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight NUMERIC,
  waist NUMERIC,
  sleep NUMERIC,
  energy INT CHECK (energy BETWEEN 1 AND 5),
  fatigue INT CHECK (fatigue BETWEEN 1 AND 5),
  photo_note TEXT,
  photo_face_path TEXT,    -- pointe vers Supabase Storage
  photo_profile_path TEXT, -- pointe vers Supabase Storage
  photo_back_path TEXT     -- pointe vers Supabase Storage
);

-- 6. Table des Repas (Meal Logs)
CREATE TABLE public.meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  kcal INT NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL
);

-- 7. Table de l'Hydratation
CREATE TABLE public.hydration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  liters NUMERIC NOT NULL DEFAULT 0,
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 8. Table des Tests de force / Progression
CREATE TABLE public.progress_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_id TEXT NOT NULL,
  value NUMERIC NOT NULL
);
```

### C. Règles de sécurité d'accès aux données (Row-Level Security - RLS)
Le RLS garantit un cloisonnement absolu des comptes. Les règles d'écriture/lecture pour chaque table (par exemple, `profiles`) se déclarent ainsi :

```sql
-- Activer le RLS sur chaque table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tests ENABLE ROW LEVEL SECURITY;

-- Politique d'accès pour Profiles (Exemple)
CREATE POLICY "Les utilisateurs peuvent gérer leur propre profil"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Pour les autres tables (exemple avec workout_sessions)
CREATE POLICY "Les utilisateurs peuvent gérer leurs propres sessions"
ON public.workout_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 8. Audit du système de Photos

### Analyse du code existant (`src/routes/mesures.tsx` / `src/lib/store.ts`) :
Le processus actuel effectue les étapes suivantes :
1. Prise d'image ou sélection via `<input type="file" capture="environment">`.
2. Appel à `fileToCompressedBase64()` : réduction de l'image (max 800px de côté) et compression JPEG à 70% de qualité.
3. Rendu sous forme de chaîne Base64 (`data:image/jpeg;base64,...`) stockée dans l'état `metrics` global persistant en `localStorage`.

### Architecture cible avec Supabase Storage :
1. **Création du Bucket** : Instanciation d'un bucket privé nommé `progress-photos` dans la console de stockage Supabase.
2. **Politiques de sécurité du Bucket (Storage RLS)** :
   * Autoriser le téléversement (`INSERT`), la lecture (`SELECT`) et la suppression (`DELETE`) uniquement aux utilisateurs authentifiés, et restreindre l'accès au préfixe correspondant à leur ID d'utilisateur (`/authenticated/progress-photos/auth.uid()/*`).
3. **Flux d'envoi/lecture d'image révisé** :
   * **Étape 1 (Local/Mobile)** : Compression locale de l'image (toujours recommandée pour économiser de la bande passante mobile).
   * **Étape 2 (Téléversement)** : Envoi du fichier image compressé via le SDK client :
     ```typescript
     const { data, error } = await supabase.storage
       .from('progress-photos')
       .upload(`${userId}/${Date.now()}-${slot}.jpg`, fileBody);
     ```
   * **Étape 3 (Sauvegarde base)** : Enregistrement du chemin retourné (`data.path`) dans la table `body_metrics` (champs `photo_face_path`, etc.).
   * **Étape 4 (Affichage sécurisé)** : Pour afficher l'image, génération d'une URL signée temporaire (durée de validité courte, ex. 15 minutes) afin d'interdire tout accès public :
     ```typescript
     const { data, error } = await supabase.storage
       .from('progress-photos')
       .createSignedUrl(photoPath, 900); // 15 mins
     ```

---

## 9. Audit de la progression sportive et des Skills

L'analyse de la logique algorithmique de progression contenue dans `src/lib/store.ts` (fonction `suggestProgressionForExercise`) et de la base documentaire `docs/skills_sportifs.md` révèle d'excellentes bases, mais aussi des opportunités de fiabilisation :

### Fonctionnement de l'algorithme actuel :
* Si une séance d'entraînement est **incomplète** (le nombre de séries validées par l'utilisateur est inférieur au nombre de séries planifiées), l'app suggère de maintenir le niveau actuel (`= idem`).
* Si la séance est **complète** :
  * On extrait le minimum de répétitions (ou secondes) accompli parmi toutes les séries d'un exercice donné.
  * Si ce minimum atteint ou dépasse l'objectif maximal (`targetMax`) **ET** que la fatigue ressentie (RPE) sur l'ensemble des séries est inférieure ou égale à 8 (`RPE <= 8`) :
    * Pour un exercice chronométré (`kind === 'time'`), l'application suggère une progression de **`+5s`**.
    * Pour un exercice de répétitions (`kind === 'reps'`), elle suggère une progression de **`+2 reps`** (si RPE maximal ≤ 7) ou **`+1 rep`** (si RPE maximal === 8).
  * Dans tous les autres cas (si l'objectif n'est pas atteint, ou si un seul RPE est égal ou supérieur à 9), l'application recommande de consolider le palier actuel (`= idem`).

### Points forts :
* L'implémentation est parfaitement conforme à l'esprit d'auto-régulation sportive (Surcharge Progressive Intelligente). Elle évite les blessures en bloquant la progression si l'utilisateur a forcé exagérément (RPE ≥ 9).

### Manques techniques & Cohérence avec `skills_sportifs.md` :
1. **Divergence de la règle pour le L-sit et holds avancés** : Pour le L-sit (passage de 5s à 12s, puis 20s et 25s selon `docs/skills_sportifs.md`), l'augmentation fixe par palier de `+5s` peut s'avérer trop abrupte ou inadéquate pour les niveaux avancés. Une personnalisation des fourchettes selon le skill cible serait plus appropriée.
2. **Écrans de test S4, S8 et S12** : Le store calcule correctement la semaine courante et propose une bannière invitant au test lors des semaines multiples de 4. Cependant, les exercices de test ne sont pas verrouillés ou distingués dans l'interface, laissant l'utilisateur saisir des valeurs arbitraires à tout moment sans un véritable "mode test guidé".
3. **Cas de régression non géré** : Si l'utilisateur subit une baisse de performance notable sur plusieurs semaines (par exemple, à cause de la fatigue ou d'un arrêt temporaire), l'application suggère au mieux de "maintenir", mais n'intègre pas d'algorithme de déchargement/délester (Deload) automatique pour réduire légèrement l'intensité.

---

## 10. Audit UX / Mobile-First

L'application a été conçue pour être utilisée en situation réelle (mains moites, essoufflement, environnement de musculation en extérieur).

### Analyse de l'ergonomie :
* **Points positifs** : Les boutons du lecteur de séance sont de taille généreuse, facilement cliquables. Le minuteur de repos en plein écran avec bouton pause/reprise et option de réinitialisation est excellent. La navigation basse (`BottomNav`) libère l'espace de lecture sur mobile.
* **Axes d'amélioration** :
  * **Retour sonore ou tactile en fin de repos** : Actuellement, une vibration est tentée (`navigator.vibrate`), mais elle est souvent bloquée par les navigateurs mobiles (notamment Safari iOS qui n'implémente pas l'API de vibration standard). L'ajout d'une notification sonore discrète (bip) ou visuelle (flash de l'écran) fiabiliserait l'alerte de fin de repos.
  * **Verrouillage de l'écran (Wake Lock)** : Pendant le suivi d'une séance ou d'un repos, l'écran du smartphone a tendance à se mettre en veille, coupant le rythme. L'utilisation de l'API *Screen Wake Lock* (si supportée) résoudrait ce problème ergonomique majeur.

---

## 11. Priorités de correction (Feuille de route technique)

Voici l'ordonnancement recommandé pour sécuriser et migrer l'application sans interruption de service pour l'utilisateur :

| Priorité | Tâche technique | Description | Sévérité résolue |
| :---: | :--- | :--- | :---: |
| **1** | **Création du schéma de base de données** | Appliquer les scripts SQL des tables et des règles RLS sur Supabase. | Bloquant technique |
| **2** | **Mise en place de l'Authentification** | Créer l'interface de connexion/inscription premium et verrouiller les routes privées de l'application. | Risque de fuite |
| **3** | **Migration des photos vers Supabase Storage** | Modifier la logique d'import de photos pour les compresser, les téléverser dans le bucket privé `progress-photos`, et récupérer des URLs signées pour affichage. | **Critique** (Crash stockage) |
| **4** | **Synchronisation des données utilisateur** | Remplacer l'écriture synchrone dans le `localStorage` par des mutations asynchrones via TanStack Query vers Supabase (avec cache local pour le mode hors-ligne). | **Élevée** (Perte de données) |
| **5** | **Optimisation de la progression et des tests** | Raffiner les suggestions de progression, ajouter un mode de test guidé pour les semaines de bilan (S4, S8, S12). | Fonctionnel / Sportif |
| **6** | **Ajout du signal de fin de repos & Wake Lock** | fiabiliser l'utilisation en extérieur en évitant la mise en veille et en améliorant l'alerte de fin de chrono. | Ergonomie sportive |

---

## 12. Fichiers concernés par les futures modifications

Lors de l'implémentation de la feuille de route, les fichiers suivants devront être édités ou créés :

1. **`supabase/migrations/` (Nouveau)** : Scripts de migration SQL (création des tables, politiques RLS, triggers pour la synchronisation des profils).
2. **`src/integrations/supabase/types.ts`** : Doit être régénéré ou mis à jour pour contenir le typage strict TypeScript des nouvelles tables Postgres.
3. **`src/lib/store.ts`** : Réécriture des hooks d'état pour abandonner le stockage local et initier des appels d'écriture/lecture de base de données à l'aide de Supabase.
4. **`src/routes/mesures.tsx`** : Intégration du SDK d'envoi et récupération sécurisée de fichiers images de Supabase Storage.
5. **`src/routes/seance.tsx`** : Enregistrement de la séance terminée directement dans la table cloud, couplé à un filet de sécurité de stockage hors-ligne si l'utilisateur s'entraîne dans une zone sans réseau.
6. **`src/routes/index.tsx` & `src/routes/nutrition.tsx` & `src/routes/progression.tsx`** : Chargement des données dynamiques depuis les tables de l'utilisateur connecté en lieu et place du store local.

---

## 13. Checklist de tests après migration

Pour valider chaque étape de la future transition, la grille de tests suivante devra être validée :

- [ ] **Test de connexion** : Vérifier qu'un utilisateur non connecté est redirigé vers l'écran d'authentification.
- [ ] **Test d'inscription** : S'assurer qu'un compte créé génère automatiquement une ligne de profil correspondante dans la table `profiles`.
- [ ] **Test de cloisonnement RLS** : Connecter deux comptes différents sur deux navigateurs et vérifier qu'aucun ne peut lire ou modifier les entraînements, repas ou poids de l'autre.
- [ ] **Test d'upload d'image** : Envoyer une photo de progression, vérifier dans la console Supabase qu'elle est bien stockée dans le dossier `/authenticated/progress-photos/{user_id}/` et non accessible sans authentification.
- [ ] **Test de robustesse hors-ligne** : Lancer un lecteur de séance, couper la connexion Internet, terminer la séance et vérifier que l'application sauvegarde temporairement la performance pour la synchroniser au retour du réseau.
- [ ] **Test d'algorithme de progression** : Valider une séance avec des RPE ≤ 8 et vérifier que les suggestions de la page Progrès se mettent à jour fidèlement par rapport au programme.
