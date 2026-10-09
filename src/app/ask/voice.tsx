import { Ionicons } from "@expo/vector-icons";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { ScreenHeader } from "@/components/Screen";
import { Button, Card, Eyebrow, H1, Meta } from "@/components/ui";
import { FormField } from "@/components/FormField";
import { healthRequest, uploadForm } from "@/lib/healthApi";
import { usePalette } from "@/theme/context";
import { spacing, type } from "@/theme";

export default function VoiceQuestion() {
  const p = usePalette(); const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [text, setText] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [available, setAvailable] = useState(false);
  useEffect(() => { let active = true; Promise.all([healthRequest("status"), healthRequest("consent")]).then(([status, consent]) => { if (active) setAvailable(status.voice && consent.cloud_ai && consent.storage); }).catch(() => {}); return () => { active = false; }; }, []);
  const stop = async () => {
    if (busy) return; setBusy(true); setError("");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No audio was recorded. Please try again.");
      let body: FormData;
      if (Platform.OS === "web") { body = new FormData(); body.append("file", await (await fetch(uri)).blob(), "question.m4a"); }
      else body = uploadForm(uri, "question.m4a", "audio/mp4");
      const transcript = await healthRequest("voice", { method: "POST", body });
      setText(transcript.text);
    } catch (e) { setError(e instanceof Error ? e.message : "Transcription failed."); }
    finally { setBusy(false); await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
  };
  const record = async () => {
    setError("");
    try { const permission = await AudioModule.requestRecordingPermissionsAsync(); if (!permission.granted) throw new Error("Microphone access was declined. You can type your question below."); await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); await recorder.prepareToRecordAsync(); recorder.record({ forDuration: 60 }); }
    catch (e) { setError(e instanceof Error ? e.message : "Recording could not start."); }
  };
  return <View style={{ flex: 1, backgroundColor: p.bg }}><ScreenHeader backTo="/" title="Voice question" /><ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <Eyebrow tone="accent">IN YOUR OWN WORDS</Eyebrow><H1 style={{ marginTop: 12 }}>Say what’s on your mind.</H1><Meta style={{ marginTop: 12, lineHeight: 21 }}>Record up to one minute. Audio goes to the configured transcription provider only after you tap transcribe. Review and correct the text before sending your question.</Meta>
    <Card style={{ padding: 28, alignItems: "center", marginTop: 24 }}><Ionicons name="mic-outline" size={50} color={state.isRecording ? p.accentText : p.steadyText} /><Text style={[type.h2, { color: p.text, marginTop: 16 }]}>{state.isRecording ? `${Math.floor(state.durationMillis / 1000)} seconds` : busy ? "Transcribing…" : "Your voice, your choice"}</Text><Meta style={{ marginTop: 8, textAlign: "center" }}>The transcript is editable. Audio is not added to your health history.</Meta>
    {available ? <><Button title={state.isRecording ? "Stop & transcribe" : "Record a question"} icon={state.isRecording ? "stop" : "mic-outline"} variant="primary" disabled={busy} onPress={state.isRecording ? stop : record} style={{ marginTop: 20 }} />{!state.isRecording && recorder.uri && <Button title="Transcribe recorded audio" disabled={busy} onPress={stop} style={{ marginTop: 10 }} />}</> : <><Meta style={{ marginTop: 20, textAlign: "center", color: p.attentionText }}>Voice transcription requires a connected shared account, cloud AI consent and an enabled transcription provider.</Meta><Button title="Account & consent settings" onPress={() => router.push("/cloud-health" as never)} style={{ marginTop: 14 }} /></>}
    </Card>
    <FormField label="Review your question" value={text} onChangeText={setText} multiline placeholder="You can also use your keyboard’s microphone to dictate here." />
    <Button title="Send reviewed question" variant="primary" icon="arrow-forward" disabled={!text.trim() || busy || state.isRecording} onPress={() => router.replace({ pathname: "/ask/[id]", params: { id: `chat-${Date.now()}`, q: text.trim() } })} style={{ marginTop: 16 }} />
    {error ? <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: 18 }]}>{error}</Text> : null}
  </ScrollView></View>;
}
