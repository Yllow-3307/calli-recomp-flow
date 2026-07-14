# Skills sportifs — Calli Recomp Tracker

Ce fichier décrit les skills sportifs principaux que l'app doit suivre.

## Skills à intégrer

1. Handstand
2. HSPU / Handstand Push-Up
3. Muscle-up
4. Tuck flag / Human flag progression
5. Dragon flag
6. L-sit

## Données à suivre pour chaque skill

Chaque skill doit avoir :

- niveau actuel,
- objectif mois 1,
- objectif mois 2,
- objectif mois 3,
- prochain test,
- meilleur record,
- historique,
- notes techniques,
- statut : non commencé, en cours, proche, validé.

## Progressions attendues

### Handstand

- Départ : 5 secondes au mur
- Mois 1 : 25 secondes au mur
- Mois 2 : 30 secondes / début libre
- Mois 3 : libre 10 secondes+

### HSPU

- Départ : Pike push-up
- Mois 1 : négatifs au mur
- Mois 2 : HSPU mur ×5
- Mois 3 : HSPU libre

### Muscle-up

- Départ : 0 rep
- Mois 1 : transitions
- Mois 2 : muscle-up avec bande ×5
- Mois 3 : 1 muscle-up strict

### Tuck flag / Human flag progression

- Départ : planche latérale 30s
- Mois 1 : tuck flag
- Mois 2 : advanced tuck
- Mois 3 : full flag

### Dragon flag

- Départ : 3×3
- Mois 1 : 3×5
- Mois 2 : 3×8
- Mois 3 : 3×10+

### L-sit

- Départ : 5 secondes
- Mois 1 : 12 secondes
- Mois 2 : 20 secondes
- Mois 3 : 25 secondes+

## Règles de progression

- Tests toutes les 4 semaines : S4, S8, S12.
- Si l'utilisateur atteint le haut de la fourchette avec RPE ≤ 8, proposer +1 ou +2 reps la semaine suivante.
- Pour les holds, proposer +5 secondes.
- Si RPE ≥ 9 ou séance incomplète, garder le même objectif.
- Ne jamais augmenter la difficulté si la technique est mauvaise.
- Afficher des rappels techniques : gainage, contrôle, amplitude, filmage.

## Utilisation dans l'app

Créer ou améliorer une page `Skills` avec :

- cartes pour chaque skill,
- niveau actuel,
- objectif du mois,
- prochain test,
- historique,
- meilleurs records,
- conseils techniques,
- progression visuelle sur 12 semaines.

Les données doivent venir de Supabase si l'app est connectée à Supabase :

- `progress_tests`,
- `workout_sessions`,
- `exercise_logs`.

Pas de fausses données de démonstration en production.
