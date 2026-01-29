import React from 'react';

/**
 * BidWin Logo Icon - "B" with integrated upward arrow
 * Use for favicon, sidebar, mobile app icons
 */
export function BidWinLogoIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="bidwin-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
            </defs>
            {/* B letterform with integrated upward arrow */}
            <path
                d="M16 8h16c8.837 0 16 7.163 16 16 0 4.5-1.87 8.566-4.879 11.465C46.25 38.214 48 42.352 48 47c0 9.389-7.611 17-17 17H16c-2.209 0-4-1.791-4-4V12c0-2.209 1.791-4 4-4z"
                fill="url(#bidwin-gradient)"
            />
            {/* Arrow cutout going up */}
            <path
                d="M22 28L32 12L42 28H36V40H28V28H22Z"
                fill="white"
            />
            {/* B bowl hint */}
            <ellipse cx="34" cy="52" rx="6" ry="5" fill="white" opacity="0.15" />
        </svg>
    );
}

/**
 * BidWin Full Logo - Icon + Wordmark
 * Use for headers, marketing, full-size displays
 */
export function BidWinLogo({ className, variant = 'light' }: { className?: string; variant?: 'light' | 'dark' }) {
    const textColor = variant === 'dark' ? '#FFFFFF' : '#1E293B';
    const accentColor = variant === 'dark' ? '#60A5FA' : '#2563EB';

    return (
        <svg
            className={className}
            viewBox="0 0 200 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="bidwin-gradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
            </defs>

            {/* Icon: B with upward arrow */}
            <g>
                <path
                    d="M8 4h12c6.627 0 12 5.373 12 12 0 3.375-1.403 6.424-3.659 8.599C30.687 26.66 32 29.764 32 33.25c0 7.042-5.708 12.75-12.75 12.75H8c-1.657 0-3-1.343-3-3V7c0-1.657 1.343-3 3-3z"
                    fill="url(#bidwin-gradient-full)"
                />
                <path d="M11.5 19L18.5 6L25.5 19H21.5V28.5H15.5V19H11.5Z" fill="white" />
                <ellipse cx="19.5" cy="37" rx="4.5" ry="3.75" fill="white" opacity="0.15" />
            </g>

            {/* Wordmark: BidWin */}
            <text
                x="44"
                y="39"
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                fontSize="32"
                fontWeight="700"
                letterSpacing="-1"
            >
                <tspan fill={textColor}>Bid</tspan>
                <tspan fill={accentColor}>Win</tspan>
            </text>
        </svg>
    );
}
