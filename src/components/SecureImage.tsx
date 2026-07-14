import { useSignedUrl } from "@/hooks/use-signed-url";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera } from "lucide-react";

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string | undefined | null;
  fallbackLabel?: string;
}

export function SecureImage({ path, fallbackLabel, className, ...props }: SecureImageProps) {
  const { url, loading, error } = useSignedUrl(path);

  if (loading) {
    return <Skeleton className={className} />;
  }

  if (error || !url) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted/40 text-muted-foreground ${className}`}
      >
        <Camera className="h-5 w-5 mb-1 opacity-60" />
        {fallbackLabel && <p className="text-[10px] uppercase tracking-widest">{fallbackLabel}</p>}
      </div>
    );
  }

  return <img src={url} className={className} {...props} />;
}
