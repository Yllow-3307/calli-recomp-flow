import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Bandeau réseau discret, fixé en haut :
 *  - hors-ligne → ambre « tout est gardé sur l'appareil » (les données restent
 *    en localStorage et seront repoussées à la reconnexion par la synchro)
 *  - retour réseau → vert « synchronisation » pendant 5 s
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      setJustBack(true);
    };
    const off = () => {
      setOnline(false);
      setJustBack(false);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!justBack) return;
    const t = setTimeout(() => setJustBack(false), 5000);
    return () => clearTimeout(t);
  }, [justBack]);

  if (online && !justBack) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-bold text-center transition-colors ${
        online ? "bg-emerald-500/90 text-white" : "bg-amber-500/95 text-slate-950"
      }`}
    >
      {online ? (
        <>
          <Wifi className="h-3.5 w-3.5 shrink-0" /> Connexion retrouvée — synchronisation…
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 shrink-0" /> Hors ligne — tout est gardé sur l'appareil,
          synchro auto au retour du réseau
        </>
      )}
    </div>
  );
}
