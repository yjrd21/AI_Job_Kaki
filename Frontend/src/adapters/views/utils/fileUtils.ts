// Limit uploaded CV files to five mebibytes.
export const MAX_CV_BYTES = 5 * 1024 * 1024;

// Read an accepted CV file and return its base64 content without the data URL prefix.
export async function fileToBase64(file: File): Promise<string> {
  if (file.size > MAX_CV_BYTES) throw new Error("CV must not exceed 5 MB");

  // Wait for the browser file reader to produce a data URL.
  const data = await new Promise<string>((resolve, reject) => {
    // Create the browser reader used to encode the selected file.
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  return data.split(",")[1] || "";
}
