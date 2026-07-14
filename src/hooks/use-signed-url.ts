import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache for signed URLs to avoid querying Supabase Storage for the exact same path repeatedly.
// Map of path -> { url: string, expiresAt: number }
const signedUrlCache: Record<string, { url: string; expiresAt: number }> = {};

export function useSignedUrl(path: string | undefined | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    // If it's already a Base64 encoded string or a direct web URL, no signed URL is needed.
    if (path.startsWith("data:") || path.startsWith("http:") || path.startsWith("https:")) {
      setUrl(path);
      return;
    }

    // Check Cache first
    const cached = signedUrlCache[path];
    const now = Date.now();
    // Re-use cache if it still has at least 5 minutes of lifetime left (300 seconds)
    if (cached && cached.expiresAt > now + 300 * 1000) {
      setUrl(cached.url);
      return;
    }

    let isMounted = true;
    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error: storageErr } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(path, 3600); // 1 hour

        if (storageErr) throw storageErr;

        if (data?.signedUrl && isMounted) {
          // Cache URL with expiration set to now + 1 hour (minus 2 minutes safety margin)
          signedUrlCache[path] = {
            url: data.signedUrl,
            expiresAt: Date.now() + 3480 * 1000,
          };
          setUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("Error creating signed url for path:", path, err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [path]);

  return { url, loading, error };
}
