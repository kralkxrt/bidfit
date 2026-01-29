import React from 'react';

export function BidWinLogoIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M12 8C12 5.79086 13.7909 4 16 4H20C24.4183 4 28 7.58172 28 12C28 14.606 26.7542 16.9205 24.8159 18.3512C27.2882 19.5376 29 22.0673 29 25C29 29.9706 24.9706 34 20 34H16C13.7909 34 12 32.2091 12 30V8Z"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M20 12H22"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
            />
            <path
                d="M27 26.5L34 19.5"
                stroke="#60A5FA"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M34 19.5L31 16.5"
                stroke="#60A5FA"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
