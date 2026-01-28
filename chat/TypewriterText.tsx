import { useState, useEffect } from 'react';

interface TypewriterTextProps {
    text: string;
    speed?: number;  // ms per character
    delay?: number;  // ms before starting
    onComplete?: () => void;
}

export function TypewriterText({
    text,
    speed = 40,
    delay = 300,
    onComplete
}: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setDisplayedText('');
        setIsComplete(false);

        let index = 0;
        let intervalId: NodeJS.Timeout;

        const startTimeout = setTimeout(() => {
            intervalId = setInterval(() => {
                if (index < text.length) {
                    setDisplayedText(text.slice(0, index + 1));
                    index++;
                } else {
                    clearInterval(intervalId);
                    setIsComplete(true);
                    onComplete?.();
                }
            }, speed);
        }, delay);

        return () => {
            clearTimeout(startTimeout);
            if (intervalId) clearInterval(intervalId);
        };
    }, [text, speed, delay, onComplete]);

    return (
        <span>
            {displayedText}
            {!isComplete && (
                <span className="inline-block w-0.5 h-5 bg-purple-400 ml-0.5 animate-pulse" />
            )}
        </span>
    );
}
