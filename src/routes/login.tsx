import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Dumbbell, Mail, Lock, LogIn, UserPlus } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — Calli Recomp" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    setActionLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Erreur de connexion : " + error.message);
    } else {
      toast.success("Ravi de vous revoir ! 👋");
      navigate({ to: "/" });
    }
    setActionLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setActionLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error("Erreur d'inscription : " + error.message);
    } else {
      toast.success("Compte créé avec succès ! Un e-mail de confirmation vous a été envoyé si configuré.");
      // Auto-login or navigate to onboarding
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate({ to: "/" });
      }
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <PageShell>
      <div className="px-5 pt-12 pb-4 text-center">
        <div className="mx-auto h-16 w-16 grid place-items-center rounded-full btn-hero mb-4">
          <Dumbbell className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="text-3xl font-black text-gradient">Calli Recomp</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Suivi premium de recomposition corporelle & de skills de force.
        </p>
      </div>

      <div className="px-5 mt-4">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-card border border-border p-1">
            <TabsTrigger value="login" className="rounded-xl font-bold py-2.5">
              Se connecter
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-xl font-bold py-2.5">
              S'inscrire
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="card-premium p-5 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">E-mail</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Mot de passe</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-input"
                  />
                </div>
              </div>

              <Button type="submit" disabled={actionLoading} className="w-full h-12 rounded-2xl btn-hero font-bold mt-2">
                {actionLoading ? "Connexion en cours..." : "Connexion"} <LogIn className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="card-premium p-5 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">E-mail</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Mot de passe</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-input"
                  />
                </div>
              </div>

              <Button type="submit" disabled={actionLoading} className="w-full h-12 rounded-2xl btn-hero font-bold mt-2">
                {actionLoading ? "Création en cours..." : "Créer un compte"} <UserPlus className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
