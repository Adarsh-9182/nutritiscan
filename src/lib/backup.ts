import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export async function exportBackup(payload: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error("File sharing is unavailable on this device.");
  const file = new File(Paths.cache, `nutritiscan-backup-${Date.now()}.json`);
  file.create(); file.write(payload);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Save your NutritiScan backup" });
}
export async function exportText(payload: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device. Your records are still saved.");
  const file = new File(Paths.cache, `nutritiscan-appointment-${Date.now()}.txt`);
  file.create({ overwrite: true }); file.write(payload);
  await Sharing.shareAsync(file.uri, { mimeType: "text/plain", dialogTitle: "Share appointment summary" });
}
export async function readBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain"], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  if ((asset.size ?? file.size) > 10_000_000) throw new Error("Backup is too large (maximum 10 MB).");
  return file.text();
}
