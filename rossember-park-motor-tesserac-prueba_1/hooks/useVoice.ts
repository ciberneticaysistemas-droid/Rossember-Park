import { useCallback } from 'react';

export const useVoice = () => {
    const speak = useCallback((text: string) => {
        if (!('speechSynthesis' in window)) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES'; // Spanish
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    }, []);

    return { speak };
};
