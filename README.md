# Calli Recomp Tracker

PWA mobile-first de suivi de recomposition corporelle sur 12 semaines :
callisthénie, skills (handstand, muscle-up, flags…), running, nutrition,
mesures corporelles et photos de progression.

> Projet initialement généré avec Lovable, désormais **100% autonome** :
> aucune dépendance à Lovable (ni package, ni config, ni service).

## Stack

- **React 19** + **TypeScript**
- **TanStack Start** (Router + Query) — rendu SSR/SPA avec nitro
- **Tailwind CSS v4** + **shadcn/ui** (Radix UI, Lucide)
- **Supabase** (Postgres, Auth, RLS, Storage)
- **Vite 8** — build nitro (Vercel détecté automatiquement en CI)
- **Vercel** — hébergement (tier gratuit)

## Prérequis

- [Node.js](https://nodejs.org) 20.19+ (ou [Bun](https://bun.sh) si tu préfères `bun.lock`)
- [VS Code](https://code.visualstudio.com) (gratuit) — extensions conseillées :
  - *Tailwind CSS IntelliSense*, *ES7+ React/Redux snippets*, *Prettier*, *Supabase*

## Installation

```bash
git clone https://github.com/Yllow-3307/calli-recomp-flow.git
cd calli-recomp-flow
npm install        # ou : bun install
```

Copie `.env` (ou renseigne-le) avec tes clés Supabase :

```bash
VITE_SUPABASE_URL=https://<ton-projet>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
```

> La clé *publishable* est faite pour être côté client : la sécurité des
> données est assurée par les règles **RLS** de Supabase. Ne commit jamais
> une clé `secret` (service_role), elle doit rester hors du repo.

## Développement

```bash
npm run dev      # serveur de dev sur http://localhost:5173
npm run build    # build de production
npm run preview  # prévisualiser le build
npm run lint     # vérifier le code
npm run format   # formater avec Prettier
```

## Base de données Supabase

Le schéma complet (tables, triggers, règles RLS, templates du programme)
est dans `supabase/migrations/20240714000000_init_schema.sql`.

Pour l'appliquer :
1. Dashboard Supabase → **SQL Editor** → *New query*
2. Coller le contenu du fichier de migration → **Run**

Détails complets dans `docs/SUPABASE_SETUP.md`.

## Déploiement Vercel (gratuit)

1. Pousse ton code sur GitHub (`git add -A && git commit -m "..." && git push`)
2. Sur [vercel.com](https://vercel.com) → *Add New Project* → importe le repo
3. Ajoute les 3 variables d'environnement `VITE_SUPABASE_*` dans *Settings → Environment Variables*
4. Chaque `git push` redéploie automatiquement ✨

Alternative gratuite : **Cloudflare Pages** (le preset nitro `cloudflare-module`
est déjà configuré en repli) ou **Netlify**.

## Structure du projet

```
src/
├── routes/              # Pages (TanStack Router, fichier-par-route)
│   ├── index.tsx        # Dashboard / Aujourd'hui
│   ├── seance.tsx       # Lecteur de séance (ne pas casser !)
│   ├── programme.tsx    # Grille des 12 semaines
│   ├── progression.tsx  # Surcharge progressive + graphes
│   ├── nutrition.tsx    # Macros + hydratation
│   ├── mesures.tsx      # Poids, mensurations, photos
│   ├── historique.tsx   # Historique des séances
│   ├── skills.tsx       # Progression skills callisthénie
│   ├── parametres.tsx   # Profil & réglages
│   └── connexion.tsx    # Auth Supabase
├── components/ui/       # Composants shadcn/ui
├── integrations/supabase/  # Clients Supabase (browser + server) + middlewares auth
├── lib/
│   ├── store.ts         # Store applicatif (sync Supabase + fallback local)
│   ├── program.ts       # Données du programme 12 semaines
│   └── programme_seed.json
├── server.ts            # Entry serveur SSR (catch erreurs)
└── start.ts             # createStart + middlewares
supabase/migrations/     # Schéma SQL
docs/                    # Guides : audit, setup Supabase, skills, UI…
```

## Règles du projet (historiques, toujours valables)

Voir `AGENTS.md` — en résumé :
- ne pas casser le lecteur de séance, l'auth, ni les règles RLS ;
- données personnelles toujours liées à `auth.uid()` ;
- photos dans Supabase Storage (bucket privé), jamais en Base64 dans le state ;
- mobile-first, lisible, rapide ; design premium **après** fiabilité des données.

## Roadmap d'amélioration

Voir `docs/AUDIT_LOVABLE.md` pour l'audit d'origine et `docs/JOURNAL_2026-07-18.md` pour le détail des travaux du 18/07/2026.

Déjà fait ✅ :

- retrait complet de Lovable (aucune dépendance)
- données : tout persiste dans Supabase, **y compris les notes/statuts de skills**
  (nouvelle migration `20260718000000_skill_states.sql` à appliquer)
- typage Supabase intégral réparé (autocomplétion VS Code fonctionnelle)
- PWA installable (manifest + icônes) avec mode hors-ligne basique
- touches design premium (transitions de page, glow nav, accessibilité)

Prochaines étapes :

1. **Logique** : progression skills automatisée (règles RPE), rappels/notifications
2. **Design** : badges par type de séance poussés plus loin, micro-animations des cartes
   (inspirations : Mobbin, Behance, Dribbble — toutes consultables gratuitement)
3. **PWA avancé** : file d'attente hors-ligne pour les écritures Supabase
