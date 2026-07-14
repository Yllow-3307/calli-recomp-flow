# Comment préparer le repo GitHub pour Jules

## Où mettre ces fichiers

À la racine du repo GitHub :

- `AGENTS.md`

Dans un dossier `docs/` :

- `docs/skills_sportifs.md`
- `docs/ui_skill.md`
- `docs/programme_seed.json`
- `docs/guide_creation_app_cali.md`
- optionnel : `docs/programme_fusionne_recomp_cali.pdf`

## Pourquoi

Jules lit ton repo GitHub. Il ne lit pas automatiquement ton projet Claude.

Ces fichiers donnent à Jules :

- le contexte de l'app,
- les règles à ne pas casser,
- les skills sportifs,
- les règles de design premium,
- les priorités techniques.

## Première tâche à donner à Jules ensuite

Une fois ces fichiers ajoutés au repo, commence par demander à Jules un audit :

```text
Commence par un audit du code généré par Lovable.

Lis AGENTS.md et les fichiers dans docs/.

Ne modifie pas les fonctionnalités pour l'instant.
Crée seulement un rapport dans docs/AUDIT_LOVABLE.md.

Vérifie : architecture, pages existantes, stockage localStorage vs Supabase, auth, RLS, photos, progression, séances, risques et priorités de correction.

Ouvre une Pull Request contenant uniquement docs/AUDIT_LOVABLE.md.
```
