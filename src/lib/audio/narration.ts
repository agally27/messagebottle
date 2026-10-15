/**
 * Client-side narration fallback using the device's own speech synthesis.
 * Used only when no narration asset exists. Never imitates a real voice.
 */
export class DeviceNarrator {
  private utterance: SpeechSynthesisUtterance | null = null;
  private onEndCb: (() => void) | null = null;

  static supported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  speak(text: string, onEnd?: () => void): boolean {
    if (!DeviceNarrator.supported()) return false;
    this.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.pitch = 1;
    u.lang = "en-GB";
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.lang.toLowerCase().startsWith("en-gb")) ?? voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (preferred) u.voice = preferred;
    this.onEndCb = onEnd ?? null;
    u.onend = () => this.onEndCb?.();
    u.onerror = () => this.onEndCb?.();
    this.utterance = u;
    window.speechSynthesis.speak(u);
    return true;
  }

  cancel() {
    if (!DeviceNarrator.supported()) return;
    this.onEndCb = null;
    window.speechSynthesis.cancel();
    this.utterance = null;
  }

  get speaking(): boolean {
    return DeviceNarrator.supported() && window.speechSynthesis.speaking;
  }
}
