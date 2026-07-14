// Helper function to convert a Base64 string to a File object (Blob wrapper)
export function base64ToFile(base64String: string, filename: string): File | null {
  try {
    const arr = base64String.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    console.error("Failed to convert base64 to File", err);
    return null;
  }
}
