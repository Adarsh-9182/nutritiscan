import * as DocumentPicker from "expo-document-picker";
export async function exportBackup(payload: string): Promise<void> {
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `nutritiscan-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function exportText(payload: string): Promise<void> {
  const blob = new Blob([payload], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `nutritiscan-appointment-${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function readBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain"], multiple: false, base64: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.file) throw new Error("This browser could not read that file. Try another backup.");
  if (asset.file.size > 10_000_000) throw new Error("Backup is too large (maximum 10 MB).");
  return asset.file.text();
}
