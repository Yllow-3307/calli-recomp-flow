import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Lock, Mail, Dumbbell, Loader2, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/connexion")({
  head: () => ({ meta: [{ title: "Connexion — Calli Recomp" }] }),
  component: ConnexionPage,
});

function translateAuthError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("invalid login credentials")) return "Identifiants incorrects. Vérifie ton e-mail et ton mot de passe.";
    if (msg.includes("user already registered")) return "Un compte existe déjà avec cette adresse e-mail.";
    if (msg.includes("rate limit exceeded") || msg.includes("too many requests")) return "Trop de tentatives. Patiente un instant avant de réessayer.";
    if (msg.includes("email not confirmed")) return "Ton e-mail n'a pas encore été validé. Vérifie tes courriels.";
    return err.message;
  }
  return "Une erreur est survenue lors de l'authentification.";
}

function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: "/" });
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Connexion réussie !");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session) {
        toast.success("Inscription réussie !");
        navigate({ to: "/" });
      } else {
        toast.success("Inscription réussie ! Vérifie tes e-mails pour valider ton compte.");
      }
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Veuillez indiquer votre adresse e-mail.");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/parametres`,
      });
      if (error) throw error;
      toast.success("E-mail de réinitialisation envoyé ! Vérifie ta boîte mail.");
      setForgotOpen(false);
      setResetEmail("");
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-5">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 mb-2">
              <Dumbbell className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gradient">
              Calli Recomp Tracker
            </h1>
            <p className="text-sm text-muted-foreground">
              Prends le contrôle de ta recomposition corporelle.
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
              <TabsTrigger value="login" className="font-semibold">
                Connexion
              </TabsTrigger>
              <TabsTrigger value="register" className="font-semibold">
                Inscription
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-login"
                      placeholder="nom@exemple.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-login">Mot de passe</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setForgotOpen(true);
                      }}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-login"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 bg-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full btn-hero" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-register">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-register"
                      placeholder="nom@exemple.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-register">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-register"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 bg-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full btn-hero" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer un compte"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent className="max-w-sm bg-slate-950 border-white/10">
              <DialogHeader>
                <DialogTitle className="font-black text-base text-white">
                  Réinitialiser mon mot de passe
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Renseigne ton adresse e-mail. Tu recevras un lien sécurisé pour choisir un nouveau mot de passe.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="bg-input"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => setForgotOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1 btn-hero text-xs" disabled={resetLoading}>
                    {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le lien"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PageShell>
  );
}
