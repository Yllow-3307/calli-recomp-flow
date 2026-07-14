# Design premium — Calli Recomp Tracker

Ce fichier sert de référence design pour Jules ou un autre agent de code.

## Objectif

Améliorer le design de l'app sans casser les fonctionnalités.

L'app doit rester :

- mobile-first,
- rapide,
- lisible pendant une séance,
- fiable,
- connectée à Supabase si configuré.

## Inspiration

Effets visuels inspirés du guide :

- ShaderGradient : gradients animés 3D.
- Liquid Logo : effet métal/liquide pour logo.
- Liquid Glass : effet verre Apple.
- React Three Fiber : 3D dans React.

Ces effets sont des inspirations. Ne pas tout intégrer automatiquement.

## Recommandation pour cette app

Priorité : CSS/Tailwind plutôt que grosses dépendances.

À utiliser :

- glassmorphism léger,
- gradients CSS subtils,
- badges colorés,
- boutons avec glow discret,
- micro-animations simples,
- design sombre premium.

À éviter au début :

- WebGL partout,
- React Three Fiber sur les pages d'entraînement,
- Liquid Glass JS vanilla complexe,
- effets qui ralentissent mobile,
- redesign qui casse les données.

## Style cible

Ambiance : Nike Training Club + Apple Fitness + dashboard premium.

Palette recommandée :

- background : `#05070F`, `#0B1020`, `#111827`
- primary : violet `#8B5CF6`
- secondary : cyan `#06B6D4`
- push : orange/rouge `#F97316`
- pull : violet `#A855F7`
- legs : jaune/orange `#F59E0B`
- running : vert/bleu `#10B981` ou `#38BDF8`
- rest : gris/bleu `#64748B`

## Glassmorphism recommandé

Exemple Tailwind :

```tsx
<div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/30">
  ...
</div>
```

## Gradient CSS recommandé

```css
.premium-gradient {
  background:
    radial-gradient(circle at 20% 10%, rgba(139,92,246,.35), transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(6,182,212,.25), transparent 35%),
    radial-gradient(circle at 50% 90%, rgba(249,115,22,.18), transparent 35%),
    #05070f;
}
```

## Pages à styliser en priorité

1. Dashboard / Aujourd'hui
2. Navigation mobile
3. Programme
4. Progression
5. Nutrition
6. Mesures/photos
7. Lecteur de séance, mais avec design sobre

## Lecteur de séance : contraintes spéciales

Le lecteur de séance doit être ultra lisible :

- pas de 3D,
- pas de fond trop animé,
- timer visible,
- boutons très grands,
- progression de séance claire,
- cartes exercices simples,
- états visibles : série faite / en cours / restante.

## Si une dépendance visuelle est envisagée

Avant d'installer une dépendance, vérifier :

- utilité réelle,
- impact mobile,
- taille bundle,
- compatibilité avec le projet,
- possibilité de faire pareil en CSS/Tailwind.

Installer ShaderGradient ou React Three Fiber seulement si explicitement demandé et limité à une section non critique comme login/dashboard hero.
