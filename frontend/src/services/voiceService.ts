// Native Browser Speech Service for Saathi
// Leverages window.SpeechRecognition / window.webkitSpeechRecognition & window.speechSynthesis

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

export interface SpeechSynthesisHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

// BCP-47 Locale mapping for Saathi's supported languages
const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  bho: 'hi-IN', // Bhojpuri fallback to Hindi speech engine if bho-IN is unavailable
};

// Global reference to prevent Chrome garbage-collection bug during speech synthesis
let activeUtterance: SpeechSynthesisUtterance | null = null;

export const voiceService = {
  /**
   * Check if speech recognition is supported in this browser
   */
  isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  },

  /**
   * Check if speech synthesis is supported in this browser
   */
  isSpeechSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  },

  /**
   * Get BCP-47 locale tag from Saathi language code
   */
  getSpeechLocale(languageCode?: string): string {
    const lang = (languageCode || localStorage.getItem('saathi_language') || 'en').toLowerCase();
    return LANGUAGE_LOCALE_MAP[lang] || 'en-IN';
  },

  /**
   * Start listening for microphone speech input
   */
  startListening(handlers: SpeechRecognitionHandlers, languageCode?: string): { stop: () => void } {
    if (!this.isSpeechRecognitionSupported()) {
      handlers.onError?.('UNSUPPORTED');
      return { stop: () => {} };
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    let recognition: any;
    try {
      recognition = new SpeechRecognitionClass();
    } catch (err: any) {
      handlers.onError?.(err?.message || 'FAILED_TO_START');
      return { stop: () => {} };
    }

    const locale = this.getSpeechLocale(languageCode);
    recognition.lang = locale;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false; // Stop when speech sentence naturally pauses

    let isManuallyStopped = false;

    recognition.onstart = () => {
      handlers.onStart?.();
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      const text = (finalTranscript || interimTranscript).trim();
      const isFinal = Boolean(finalTranscript);
      if (text) {
        handlers.onResult?.(text, isFinal);
      }
    };

    recognition.onerror = (event: any) => {
      if (isManuallyStopped) return;
      const error = event.error || 'unknown';
      console.warn('[VoiceService] Speech recognition error:', error);

      if (error === 'not-allowed' || error === 'service-not-allowed') {
        handlers.onError?.('PERMISSION_DENIED');
      } else if (error === 'no-speech') {
        handlers.onError?.('NO_SPEECH');
      } else if (error === 'network') {
        handlers.onError?.('NETWORK_ERROR');
      } else if (error !== 'aborted') {
        handlers.onError?.(error);
      }
    };

    recognition.onend = () => {
      handlers.onEnd?.();
    };

    try {
      recognition.start();
    } catch (err: any) {
      handlers.onError?.(err?.message || 'START_ERROR');
    }

    return {
      stop: () => {
        isManuallyStopped = true;
        try {
          recognition.stop();
        } catch {
          // Ignore error on stop
        }
      }
    };
  },

  /**
   * Speak text aloud using SpeechSynthesis
   */
  speak(text: string, handlers?: SpeechSynthesisHandlers, languageCode?: string): void {
    if (!this.isSpeechSynthesisSupported()) {
      handlers?.onError?.('UNSUPPORTED');
      return;
    }

    this.stopSpeaking();

    // Clean text: strip markdown, URLs, and asterisks for smooth listening
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [link](url) -> link
      .replace(/[*#_~`>]/g, '')                 // remove markdown tokens
      .replace(/https?:\/\/\S+/g, '')            // remove bare urls
      .replace(/\s+/g, ' ')                      // normalize spaces
      .trim();

    if (!cleanText) {
      handlers?.onEnd?.();
      return;
    }

    const locale = this.getSpeechLocale(languageCode);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = locale;
    utterance.rate = 0.95; // Slightly slower, clear pacing for elderly seniors
    utterance.pitch = 1.0;

    // Pick best matching voice if available in browser
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // Find exact locale match
        const exactVoice = voices.find(v => v.lang === locale || v.lang.replace('_', '-') === locale);
        if (exactVoice) {
          utterance.voice = exactVoice;
        } else {
          // Find primary language match (e.g. 'hi' or 'en')
          const prefix = locale.split('-')[0];
          const prefixVoice = voices.find(v => v.lang.startsWith(prefix));
          if (prefixVoice) {
            utterance.voice = prefixVoice;
          }
        }
      }
    } catch {
      // Voice selection is best-effort
    }

    utterance.onstart = () => {
      handlers?.onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      handlers?.onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      handlers?.onError?.(e);
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  },

  /**
   * Stop any active speech synthesis immediately
   */
  stopSpeaking(): void {
    if (this.isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    activeUtterance = null;
  }
};
