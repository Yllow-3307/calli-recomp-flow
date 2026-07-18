# CONFIGURATION ET DEPLOYEMENT SUPABASE — CALLI RECOMP TRACKER

Ce guide documente la mise en place de l'infrastructure Supabase pour l'application **Calli Recomp Tracker**. Il décrit les variables d'environnement indispensables, la structure de la base de données, la méthode d'application des migrations et les procédures de validation pour l'authentification et les règles de sécurité RLS.

---

## 1. Variables d'environnement requises

Pour que le client Supabase puisse s'initialiser et communiquer avec le cloud, vous devez renseigner les variables d'environnement suivantes dans votre fichier de configuration local (ex: `.env` à la racine du projet) ou dans l'interface de déploiement de votre hébergeur (Lovable Cloud / Vercel / Netlify) :

```bash
# URL de l'API de votre projet Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co

# Clé anonyme publique de publication
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Comment appliquer les migrations

Les migrations sont dans `supabase/migrations/`, à appliquer **dans l'ordre chronologique** :

1. `20240714000000_init_schema.sql` — schéma complet (tables, triggers, politiques RLS, templates du programme, bucket Storage `progress-photos`)
2. `20260718000000_skill_states.sql` — table `skill_states` (notes & statuts des skills par utilisateur)

Le premier fichier contient la structure initiale complète :

Vous pouvez appliquer cette migration de deux manières :

### Option A : Depuis le tableau de bord Supabase (Recommandé - Simple)

1. Allez sur votre console de gestion **Supabase** (https://supabase.com/dashboard).
2. Sélectionnez votre projet **Calli Recomp Tracker**.
3. Dans la barre latérale gauche, cliquez sur **SQL Editor** (l'icône de terminal `>_`).
4. Cliquez sur **New Query**.
5. Copiez et collez l'intégralité du contenu du fichier `supabase/migrations/20240714000000_init_schema.sql` dans l'éditeur.
6. Cliquez sur le bouton **Run** (ou faites `Ctrl + Enter`).
7. Toutes les tables sont créées, configurées et alimentées avec les templates du programme sportif.

### Option B : Via l'interface CLI Supabase (Développeurs)

Si vous utilisez Supabase localement :

```bash
# Lier votre projet local au projet distant
supabase link --project-ref <votre-project-id>

# Appliquer les migrations locales vers le cloud distant
supabase db push
```

---

## 3. Schéma de la Base de Données

Les tables Postgres créées dans le schéma `public` sont les suivantes :

### A. Données partagées de l'application (Templates)

Ces tables hébergent le programme type de 12 semaines issu du PDF original. Elles sont lisibles par tous les utilisateurs connectés.

- `workout_templates` : Contient les 7 jours de la semaine sportive type avec les minuteurs d'échauffement et les configurations cardio.
- `exercise_templates` : Contient la liste de tous les exercices, reliés à chaque jour type, avec les cibles de répétitions, de holds (secondes), les temps de repos et les alternatives d'équipement.

### B. Données personnelles de l'utilisateur (Privées)

Ces tables stockent les informations de chaque utilisateur. Elles sont sécurisées via RLS (Row-Level Security) pour cloisonner les accès.

- `profiles` : Profil sportif (poids, taille, niveau, équipement disponible, jours d'entraînement par semaine, etc.).
- `workout_sessions` : Historique des séances de sport démarrées et terminées (durée, volume de force, RPE, notes, etc.).
- `exercise_logs` : Contient le détail série par série de chaque exercice accompli durant une session.
- `cardio_logs` : Enregistrement du running (Zone 2, fractionné) et alternatives d'activité (piscine, rameur, vélo).
- `body_metrics` : Suivi corporel régulier toutes les 2 semaines (poids, tour de taille, sommeil, énergie, fatigue, et pointeurs vers les photos privées).
- `meal_logs` : Journal alimentaire quotidien (calories, protéines, lipides, glucides).
- `hydration_logs` : Suivi d'hydratation hydrique en litres.
- `progress_tests` : Enregistrement des performances maximales lors des semaines d'évaluation de force (S4, S8, S12).

---

## 4. Politique de Sécurité RLS (Row-Level Security)

Chaque table contenant des données privées est verrouillée à l'aide de politiques d'accès de sécurité Postgres.

- **Données partagées** (`workout_templates`, `exercise_templates`) :
  - Tous les utilisateurs authentifiés peuvent lire (`SELECT`) les séances et exercices.
  - Les modifications (`INSERT`, `UPDATE`, `DELETE`) sont impossibles pour l'utilisateur lambda afin de garantir l'intégrité du programme.
- **Données privées** (profils, logs, repas, mesures) :
  - RLS activé sur l'ensemble des tables.
  - Utilisation systématique de `auth.uid() = user_id` (ou `id` pour `profiles`).
  - Un utilisateur ne peut ni requêter, ni insérer, ni altérer la moindre donnée appartenant à autrui.

---

## 5. Stockage des Photos de Progression (Supabase Storage)

Un bucket privé nommé `progress-photos` est préparé pour héberger en toute sécurité les images de progression corporelle des utilisateurs connectés.

### Fonctionnement et cloisonnement (Storage RLS) :

- Les fichiers de photos sont organisés dans le bucket sous la forme de sous-dossiers correspondant à l'ID UUID de l'utilisateur (`{user_id}/{filename}.jpg`).
- Une politique stricte de sécurité restreint toutes les opérations de lecture (`SELECT`), écriture (`INSERT`), modification (`UPDATE`), et suppression (`DELETE`) de fichiers uniquement à leur propriétaire respectif en vérifiant que le premier segment du chemin d'accès correspond exactement à `auth.uid()`.

### Définition SQL des Politiques de Stockage (Bucket privé) :

Pour configurer le stockage privé, les requêtes suivantes sont incluses dans les migrations :

```sql
-- Création du bucket si absent
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Autoriser le dépôt d'images de progression uniquement dans son propre dossier utilisateur
CREATE POLICY "Allow authenticated users to upload progress photos under their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Autoriser la lecture de ses propres images de progression
CREATE POLICY "Allow authenticated users to read their own progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Autoriser la suppression de ses propres images de progression
CREATE POLICY "Allow authenticated users to delete their own progress photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Autoriser la mise à jour de ses propres images de progression
CREATE POLICY "Allow authenticated users to update their own progress photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 6. Automatisation à l'Inscription : Trigger de Profil

Afin de simplifier l'expérience utilisateur, un déclencheur PostgreSQL automatique a été mis en place.
À chaque fois qu'un utilisateur crée un compte (dans la table interne `auth.users`), le trigger `on_auth_user_created` appelle la fonction `public.handle_new_user()` qui se charge d'instancier automatiquement une ligne par défaut dans la table `profiles` avec des constantes de démarrage :

- Poids : 75 kg
- Taille : 178 cm
- Niveau : intermédiaire
- Équipement par défaut : Barre de traction, Anneaux et Haltères.

L'utilisateur peut ensuite ajuster ces valeurs immédiatement dans ses Paramètres de profil sans rencontrer d'erreur d'insertion.

---

## 7. Guide de Test pour l'Authentification, le RLS et le Storage

Pour s'assurer du parfait fonctionnement du partitionnement des données utilisateur lors du développement de l'UI :

### Étape 1 : Tester la création automatique du profil (Trigger)

1. Créez un utilisateur d'essai depuis l'onglet **Authentication** du dashboard Supabase, ou via un formulaire d'inscription frontend.
2. Allez dans le **Table Editor** sur Supabase et ouvrez la table `public.profiles`.
3. Vérifiez qu'une ligne correspondant au nouvel ID utilisateur UUID a été ajoutée automatiquement avec les valeurs par défaut.

### Étape 2 : Valider le cloisonnement de sécurité de la Base de Données (RLS)

Pour vérifier que les politiques RLS fonctionnent, exécutez ces requêtes SQL de test dans l'éditeur de requêtes Supabase :

```sql
-- Simuler la connexion de l'utilisateur 'A'
SET request.jwt.claim.sub = 'id-user-A-ici';

-- L'utilisateur A insère un repas personnalisé
INSERT INTO public.meal_logs (user_id, name, kcal, protein, carbs, fat)
VALUES ('id-user-A-ici', 'Poulet riz', 600, 45, 60, 12); -- Devrait RÉUSSIR

-- L'utilisateur A tente d'insérer un repas pour l'utilisateur B
INSERT INTO public.meal_logs (user_id, name, kcal, protein, carbs, fat)
VALUES ('id-user-B-ici', 'Salade de thon', 400, 30, 10, 15); -- Devrait ÉCHOUER (Violation RLS)

-- L'utilisateur A tente de lire les données
SELECT * FROM public.meal_logs; -- Devrait retourner UNIQUEMENT le repas de l'utilisateur A.
```

### Étape 3 : Tester les autorisations de lecture des templates

```sql
-- Même en étant connecté, vérifier que l'on peut lire le programme
SELECT * FROM public.workout_templates; -- Devrait RÉUSSIR et retourner les 7 jours de la semaine.

-- Tenter de modifier un template en tant qu'utilisateur standard
UPDATE public.workout_templates SET title = 'Titre piraté' WHERE day_of_week = 1; -- Devrait ÉCHOUER
```

### Étape 4 : Valider le cloisonnement de sécurité du Stockage (Storage RLS)

Pour vérifier que les politiques d'accès au bucket `progress-photos` fonctionnent correctement :

```sql
-- Simuler la connexion de l'utilisateur 'A'
SET request.jwt.claim.sub = 'id-user-A-ici';

-- L'utilisateur A tente d'uploader une photo dans son propre dossier
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES ('progress-photos', 'id-user-A-ici/face-s2.jpg', 'id-user-A-ici', '{"size": 120000}'::jsonb); -- Devrait RÉUSSIR

-- L'utilisateur A tente d'uploader une photo dans le dossier de l'utilisateur B
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES ('progress-photos', 'id-user-B-ici/face-s2.jpg', 'id-user-A-ici', '{"size": 120000}'::jsonb); -- Devrait ÉCHOUER

-- L'utilisateur A tente de lire le dossier de l'utilisateur B
SELECT * FROM storage.objects WHERE name LIKE 'id-user-B-ici/%'; -- Devrait retourner 0 ligne
```
