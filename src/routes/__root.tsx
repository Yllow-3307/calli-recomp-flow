import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { BottomNav, DesktopNav } from "@/components/BottomNav";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-gradient">404</h1>
        <p className="mt-4 text-muted-foreground">Cette page n'existe pas.</p>
        <a href="/" className="mt-6 inline-flex rounded-full btn-hero px-6 py-3 text-sm">
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Un problème est survenu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Essaie de rafraîchir la page.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full btn-hero px-6 py-3 text-sm"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#05070f" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Calli Recomp" },
      { title: "Aujourd'hui — Calli Recomp" },
      {
        name: "description",
        content: "Ta séance du jour, ta progression, tes rappels.",
      },
      { property: "og:title", content: "Aujourd'hui — Calli Recomp" },
      { property: "og:description", content: "Ta séance du jour, ta progression, tes rappels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aujourd'hui — Calli Recomp" },
      { name: "twitter:description", content: "Ta séance du jour, ta progression, tes rappels." },
      {
        property: "og:image",
        content: "https://calli-recomp-flow.vercel.app/og-image.png",
      },
      {
        name: "twitter:image",
        content: "https://calli-recomp-flow.vercel.app/og-image.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAppActions, useAppState, todayKey } from "@/lib/store";
import { nutritionTargets, planDays } from "@/lib/plan";
import { getTodayProgram } from "@/lib/program";
import { startReminderLoop } from "@/lib/reminders";
import { OfflineBanner } from "@/components/OfflineBanner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { syncAllDataWithSupabase } = useAppActions();
  const { profile, workouts, water } = useAppState();
  const onboarded = profile.onboarded;

  // Enregistre le Service Worker (PWA) — production uniquement
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[PWA] Échec d'enregistrement du Service Worker", err));
  }, []);

  useEffect(() => {
    // Synchroniser toutes les données initialement au montage s'il y a déjà une session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncAllDataWithSupabase();
      }
    });

    // Écouter les changements d'état d'authentification Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        syncAllDataWithSupabase();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncAllDataWithSupabase]);

  // Rattrapage automatique dès que le réseau revient : les écritures faites
  // hors-ligne (séances, repas, eau…) sont repoussées vers Supabase.
  useEffect(() => {
    const onOnline = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) syncAllDataWithSupabase();
      });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncAllDataWithSupabase]);

  // Rappels locaux (séance + hydratation) — voir src/lib/reminders.ts
  const trainedToday = workouts.some((w) => w.date.slice(0, 10) === todayKey());
  const waterNow = water[todayKey()] || 0;
  const waterTarget = nutritionTargets(profile).waterL;
  const sessionTitle = getTodayProgram(false, planDays(profile)).title;
  useEffect(
    () => startReminderLoop(() => ({ trainedToday, waterNow, waterTarget, sessionTitle })),
    [trainedToday, waterNow, waterTarget, sessionTitle],
  );

  useEffect(() => {
    // Vérification de route à chaque changement de page
    supabase.auth.getSession().then(({ data: { session } }) => {
      const privateRoutes = [
        "/",
        "/seance",
        "/progression",
        "/nutrition",
        "/mesures",
        "/parametres",
        "/historique",
        "/skills",
        "/onboarding",
      ];
      const isPrivateRoute =
        privateRoutes.includes(location.pathname) ||
        location.pathname.startsWith("/historique") ||
        location.pathname.startsWith("/skills");

      if (!session && isPrivateRoute) {
        navigate({ to: "/connexion" });
      } else if (session && location.pathname === "/connexion") {
        navigate({ to: "/" });
      } else if (session && !onboarded && location.pathname !== "/onboarding") {
        // Profil incomplet : l'onboarding génère d'abord son plan personnalisé
        navigate({ to: "/onboarding" });
      }
      // NB : un utilisateur déjà onboardé PEUT aller sur /onboarding
      // (Paramètres → « Générer un nouveau plan » ou fin de cycle) : on ne le
      // redirige plus vers l'accueil, sinon le bouton semblait sans effet.
    });
  }, [location.pathname, navigate, onboarded]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative">
        <OfflineBanner />
        {/* key = transition de page douce à chaque navigation */}
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
        <BottomNav />
        <DesktopNav />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
