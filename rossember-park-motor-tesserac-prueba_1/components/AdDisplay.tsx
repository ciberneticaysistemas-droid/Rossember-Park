import React, { useState, useEffect } from 'react';

interface AdDisplayProps {
    ads: string[];
    interval?: number; // Rotation interval in ms, default 5000
    adTrigger?: number; // Force next on increment
    className?: string; // Additional classes
}

export const AdDisplay: React.FC<AdDisplayProps> = ({ ads, interval = 5000, adTrigger, className = '' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (adTrigger !== undefined) {
            setCurrentIndex((prev) => (prev + 1) % ads.length);
        }
    }, [adTrigger, ads.length]);

    useEffect(() => {
        if (ads.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % ads.length);
        }, interval);

        return () => clearInterval(timer);
    }, [ads.length, interval]);

    const isVideo = (url: string) => url.startsWith('data:video/') || /\.(mp4|webm|ogg)$/i.test(url);
    const isPDF = (url: string) => url.startsWith('data:application/pdf') || /\.pdf$/i.test(url);
    const isYoutube = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo = (url: string) => url.includes('vimeo.com');

    const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/');
        }
        if (url.includes('youtu.be/')) {
            return url.replace('youtu.be/', 'www.youtube.com/embed/');
        }
        if (url.includes('vimeo.com/')) {
            return url.replace('vimeo.com/', 'player.vimeo.com/video/');
        }
        return url;
    };

    const renderAdContent = (url: string, index: number, isVisible: boolean) => {
        const baseClass = `absolute inset-0 transition-all duration-1000 ease-in-out ${isVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-95 rotate-1 pointer-events-none'}`;

        if (isYoutube(url) || isVimeo(url)) {
            return (
                <div key={index} className={baseClass}>
                    <iframe
                        src={`${getEmbedUrl(url)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${url.split('v=')[1]}`} // Attempting loop for YT
                        className="w-full h-full border-none"
                        title={`Video Ad ${index + 1}`}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                    />
                </div>
            );
        }

        if (isVideo(url)) {
            return (
                <div key={index} className={baseClass}>
                    <video
                        src={url}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                </div>
            );
        }

        if (isPDF(url)) {
            return (
                <div key={index} className={baseClass}>
                    <iframe
                        src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full border-none"
                        title={`Ad ${index + 1}`}
                    />
                </div>
            );
        }

        return (
            <div key={index} className={baseClass}>
                <img
                    src={url}
                    alt={`Advertisement ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-[10px] text-center p-4">Publicidad no disponible</div>';
                        }
                    }}
                />
            </div>
        );
    };

    if (!ads || ads.length === 0) return null;

    return (
        <div className={`relative overflow-hidden rounded-xl shadow-lg border border-gray-100 bg-gray-50 flex items-center justify-center ${className}`}>
            {ads.map((ad, index) => renderAdContent(ad, index, index === currentIndex))}

            {/* Invisible spacer to maintain proportional height based on first image if possible, 
                otherwise we rely on the container's className height */}
            {!isVideo(ads[0]) && !isPDF(ads[0]) && (
                <img
                    src={ads[currentIndex]}
                    alt="Active Ad"
                    className="w-full h-full object-cover invisible"
                />
            )}

            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest backdrop-blur-md z-10 border border-white/20">
                P R O M O
            </div>
        </div>
    );
};
