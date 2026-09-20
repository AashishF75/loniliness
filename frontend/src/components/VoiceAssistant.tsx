import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Square, X, RotateCcw, Sparkles, AlertCircle, Bot, User } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { voiceService } from '../services/voiceService';
import { aiService } from '../services/aiService';
import { useTranslation } from 'react-i18next';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceExchangeComplete?: (userText: string, aiResponse: { content: string; recommendations?: any[] }) => void;
}

type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  isOpen,
  onClose,
  onVoiceExchangeComplete
}) => {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<VoiceState>('IDLE');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const activeListenerRef = useRef<{ stop: () => void } | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(voiceService.isSpeechRecognitionSupported());
  }, []);

  // Cleanup on close or unmount
  useEffect(() => {
    if (!isOpen) {
      handleStopAll();
    }
    return () => {
      handleStopAll();
    };
  }, [isOpen]);

  const handleStopAll = () => {
    if (activeListenerRef.current) {
      activeListenerRef.current.stop();
      activeListenerRef.current = null;
    }
    voiceService.stopSpeaking();
    setIsSpeaking(false);
  };

  const handleStartListening = () => {
    handleStopAll();
    setErrorMessage('');
    setUserTranscript('');
    setAiMessage('');
    setRecommendations([]);
    setState('LISTENING');

    const listener = voiceService.startListening(
      {
        onStart: () => {
          setState('LISTENING');
        },
        onResult: (transcript: string, isFinal: boolean) => {
          setUserTranscript(transcript);
          if (isFinal) {
            handleSendSpokenQuery(transcript);
          }
        },
        onError: (err: string) => {
          if (err === 'PERMISSION_DENIED') {
            setErrorMessage(t('aiCompanion.micDenied'));
          } else if (err === 'NO_SPEECH') {
            setErrorMessage(t('aiCompanion.couldNotHear'));
          } else if (err === 'UNSUPPORTED') {
            setIsSupported(false);
            setErrorMessage(t('aiCompanion.unsupported'));
          } else {
            setErrorMessage(t('aiCompanion.couldNotHear'));
          }
          setState('ERROR');
        },
        onEnd: () => {
          // If ended without a final transcript and still listening, transition or evaluate
          setState(prev => {
            if (prev === 'LISTENING') {
              if (userTranscript.trim()) {
                handleSendSpokenQuery(userTranscript);
                return 'PROCESSING';
              }
              return 'IDLE';
            }
            return prev;
          });
        }
      },
      i18n.language
    );

    activeListenerRef.current = listener;
  };

  const handleStopListening = () => {
    if (activeListenerRef.current) {
      activeListenerRef.current.stop();
      activeListenerRef.current = null;
    }

    if (userTranscript.trim()) {
      handleSendSpokenQuery(userTranscript);
    } else {
      setState('IDLE');
    }
  };

  const handleSendSpokenQuery = async (spokenText: string) => {
    const query = spokenText.trim();
    if (!query) {
      setState('IDLE');
      return;
    }

    if (activeListenerRef.current) {
      activeListenerRef.current.stop();
      activeListenerRef.current = null;
    }

    setState('PROCESSING');

    try {
      const response = await aiService.sendMessage(query);
      const messageContent = response.content || '';
      const recs = response.recommendations || [];

      setAiMessage(messageContent);
      setRecommendations(recs);
      setState('SPEAKING');

      // Notify parent to record in chat transcript if desired
      onVoiceExchangeComplete?.(query, {
        content: messageContent,
        recommendations: recs
      });

      // Speak Saathi's response automatically
      playSpeech(messageContent);
    } catch (err: any) {
      console.error('[VoiceAssistant] Error querying AI:', err);
      const fallback = t('aiCompanion.errorResponse');
      setAiMessage(fallback);
      setState('SPEAKING');
      playSpeech(fallback);
    }
  };

  const playSpeech = (text: string) => {
    if (!voiceService.isSpeechSynthesisSupported()) return;

    setIsSpeaking(true);
    voiceService.speak(
      text,
      {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      },
      i18n.language
    );
  };

  const handleStopSpeaking = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border-4 border-brand-500 flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-assistant-title"
      >
        {/* Header */}
        <div className="bg-brand-700 text-white p-6 sm:p-8 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white text-brand-700 rounded-2xl flex items-center justify-center shadow-inner font-extrabold text-3xl">
              🗣️
            </div>
            <div>
              <h2 id="voice-assistant-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {t('aiCompanion.talkToSaathi')}
              </h2>
              <p className="text-brand-100 text-base sm:text-lg font-medium mt-0.5">
                {t('aiCompanion.companionDesc')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleStopAll();
              onClose();
            }}
            className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition-colors font-bold flex items-center gap-2 text-lg shrink-0"
            title={t('aiCompanion.close')}
            aria-label={t('aiCompanion.close')}
          >
            <X className="w-8 h-8" />
            <span className="hidden sm:inline">{t('aiCompanion.close')}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center justify-between gap-6 bg-slate-50">

          {/* Unsupported Browser Alert */}
          {!isSupported && (
            <div className="w-full bg-amber-50 border-2 border-amber-300 text-amber-900 p-6 rounded-3xl flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-amber-600 shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold mb-1">{t('aiCompanion.unsupported')}</h3>
                <p className="text-lg text-amber-800">
                  {t('aiCompanion.unsupported')}
                </p>
              </div>
            </div>
          )}

          {/* Central Interactive Voice Area */}
          <div className="w-full flex flex-col items-center justify-center py-4 text-center">

            {/* Primary Action Button */}
            {state === 'IDLE' && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleStartListening}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all border-8 border-brand-100"
                  aria-label={t('aiCompanion.tapToSpeak')}
                >
                  <Mic className="w-16 h-16 sm:w-20 sm:h-20" />
                </button>
                <div className="mt-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 block">
                    {t('aiCompanion.tapToSpeak')}
                  </span>
                  <span className="text-lg text-gray-500 font-medium mt-1 block">
                    Tap the button and speak your question
                  </span>
                </div>
              </div>
            )}

            {state === 'LISTENING' && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <span className="absolute -inset-4 rounded-full bg-red-400/30 animate-ping" />
                  <button
                    onClick={handleStopListening}
                    className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl transition-all border-8 border-red-100"
                    aria-label="Stop listening"
                  >
                    <Mic className="w-16 h-16 sm:w-20 sm:h-20 animate-pulse" />
                  </button>
                </div>
                <div className="mt-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-red-600 animate-pulse block">
                    {t('aiCompanion.listening')}
                  </span>
                  <span className="text-lg text-gray-600 font-bold mt-1 block">
                    Tap when finished speaking
                  </span>
                </div>
              </div>
            )}

            {state === 'PROCESSING' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shadow-lg border-8 border-brand-200">
                  <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 animate-spin" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-brand-800 block">
                    {t('aiCompanion.thinking')}
                  </span>
                  <span className="text-lg text-gray-500 font-medium mt-1 block">
                    Finding the best response for you...
                  </span>
                </div>
              </div>
            )}

            {state === 'SPEAKING' && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={isSpeaking ? handleStopSpeaking : () => playSpeech(aiMessage)}
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full text-white flex items-center justify-center shadow-xl transition-all border-8 ${
                    isSpeaking
                      ? 'bg-amber-600 hover:bg-amber-700 border-amber-100'
                      : 'bg-brand-600 hover:bg-brand-700 border-brand-100'
                  }`}
                  aria-label={isSpeaking ? t('aiCompanion.stopSpeaking') : t('aiCompanion.listenAgain')}
                >
                  {isSpeaking ? (
                    <Square className="w-12 h-12 sm:w-16 sm:h-16 fill-current" />
                  ) : (
                    <Volume2 className="w-14 h-14 sm:w-18 sm:h-18" />
                  )}
                </button>
                <div className="mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 block">
                    {isSpeaking ? t('aiCompanion.speaking') : t('aiCompanion.saathiAi')}
                  </span>
                  <div className="flex gap-3 justify-center mt-3">
                    {isSpeaking ? (
                      <Button
                        size="lg"
                        onClick={handleStopSpeaking}
                        className="bg-red-600 hover:bg-red-700 text-white text-xl py-3 px-6 rounded-2xl flex items-center gap-2 shadow-md"
                      >
                        <Square className="w-6 h-6 fill-current" />
                        {t('aiCompanion.stopSpeaking')}
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={() => playSpeech(aiMessage)}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-xl py-3 px-6 rounded-2xl flex items-center gap-2 shadow-md"
                      >
                        <Volume2 className="w-6 h-6" />
                        {t('aiCompanion.listenAgain')}
                      </Button>
                    )}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleStartListening}
                      className="text-xl py-3 px-6 rounded-2xl flex items-center gap-2 border-2 border-brand-600 text-brand-700 hover:bg-brand-50"
                    >
                      <Mic className="w-6 h-6" />
                      {t('aiCompanion.talkToSaathi')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {state === 'ERROR' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-red-100 text-red-600 flex items-center justify-center border-8 border-red-200 shadow-md">
                  <AlertCircle className="w-14 h-14 sm:w-16 sm:h-16" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-red-700 block">
                    {errorMessage || t('aiCompanion.couldNotHear')}
                  </span>
                  <div className="mt-4 flex gap-3 justify-center">
                    <Button
                      size="lg"
                      onClick={handleStartListening}
                      className="bg-brand-600 hover:bg-brand-700 text-white text-xl py-3 px-8 rounded-2xl flex items-center gap-3 shadow-md"
                    >
                      <RotateCcw className="w-6 h-6" />
                      {t('aiCompanion.tryAgain')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spoken Exchanges Display Area */}
          <div className="w-full flex flex-col gap-4">

            {/* User Speech Card */}
            {userTranscript && (
              <div className="bg-white border-2 border-gray-300 p-5 rounded-3xl shadow-sm text-left">
                <div className="flex items-center gap-2 text-gray-500 font-bold text-base mb-1">
                  <User className="w-5 h-5 text-gray-600" />
                  <span>{t('aiCompanion.youSaid')}:</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-snug">
                  "{userTranscript}"
                </p>
              </div>
            )}

            {/* AI Response Card */}
            {aiMessage && (
              <div className="bg-brand-50 border-2 border-brand-300 p-5 rounded-3xl shadow-sm text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-brand-700 font-bold text-base">
                    <Bot className="w-6 h-6 text-brand-600" />
                    <span className="text-lg">{t('aiCompanion.saathiSaid')}:</span>
                  </div>
                  <button
                    onClick={() => isSpeaking ? handleStopSpeaking() : playSpeech(aiMessage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-brand-300 text-brand-700 hover:bg-brand-100 font-bold text-base transition-colors"
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="w-4 h-4 fill-current text-red-600" />
                        <span className="text-red-700">{t('aiCompanion.stopSpeaking')}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5 text-brand-600" />
                        <span>{t('aiCompanion.listenAgain')}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed">
                  {aiMessage}
                </p>

                {/* Recommendations within voice assistant */}
                {recommendations && recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-brand-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recommendations.map((rec, i) => (
                      <Card key={i} className="bg-white border-brand-200 p-4 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900">{rec.title}</h4>
                        <p className="text-gray-600 text-base font-medium">{rec.subtitle}</p>
                        <span className="text-brand-800 font-bold bg-brand-100 inline-block px-3 py-1 rounded-xl text-sm mt-2">
                          {rec.stat}
                        </span>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer info */}
        <div className="bg-white p-4 border-t border-gray-200 flex justify-between items-center text-gray-500 text-sm font-medium px-6">
          <span>🔒 Speech processed securely on your device</span>
          <Button
            variant="ghost"
            onClick={() => {
              handleStopAll();
              onClose();
            }}
            className="text-gray-700 hover:text-gray-900 font-bold text-lg"
          >
            {t('aiCompanion.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};
