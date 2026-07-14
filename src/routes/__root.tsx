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
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "@/components/BottomNav";
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
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
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
      { name: "theme-color", content: "#1a1f2e" },
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
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/335a21fc-e57b-4451-b09f-7be969b9956e/id-preview-8b470969--6044c4a3-32f5-412d-bda4-f1b440d666bf.lovable.app-1783970189301.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/335a21fc-e57b-4451-b09f-7be969b9956e/id-preview-8b470969--6044c4a3-32f5-412d-bda4-f1b440d666bf.lovable.app-1783970189301.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
import { useAppActions } from "@/lib/store";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { syncProfileFromSupabase } = useAppActions();

  useEffect(() => {
    // Synchroniser le profil initialement au montage s'il y a déjà une session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncProfileFromSupabase();
      }
    });

    // Écouter les changements d'état d'authentification Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        syncProfileFromSupabase();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncProfileFromSupabase]);

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
      ];
      const isPrivateRoute = privateRoutes.includes(location.pathname);

      if (!session && isPrivateRoute) {
        navigate({ to: "/connexion" });
      } else if (session && location.pathname === "/connexion") {
        navigate({ to: "/" });
      }
    });
  }, [location.pathname, navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative">
        <Outlet />
        <BottomNav />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
