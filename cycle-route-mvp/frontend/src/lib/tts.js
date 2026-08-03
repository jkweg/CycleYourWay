/**
 * Optional text-to-speech with Web Speech primary, native plugin stub fallback.
 */
export function speakText(text, { lang = 'pl-PL' } = {}) {
  if (!text) return

  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 1.05
      window.speechSynthesis.speak(utterance)
      return
    }
  } catch (error) {
    console.warn('[tts] Web Speech failed', error)
  }
}

export function cancelSpeech() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    // ignore
  }
}
