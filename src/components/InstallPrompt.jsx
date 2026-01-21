
import { useState, useEffect } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if already installed or dismissed
        if (window.matchMedia('(display-mode: standalone)').matches || localStorage.getItem('installPromptDismissed')) {
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        // Remember the dismissal for a while? Or forever? 
        // For "first installation" usually implies we show it until they action it or explicitly dismiss.
        localStorage.setItem('installPromptDismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[var(--surface-card)] dark:bg-zinc-900 border-2 border-[var(--brand-primary)] rounded-2xl shadow-2xl p-4 flex items-center gap-4 max-w-sm w-full mx-auto backdrop-blur-md">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 text-[var(--brand-primary)]">
                    <FiDownload size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[var(--text-primary)] text-sm">Install App</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-tight mt-0.5">
                        Install CMS for a better experience.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
                    >
                        <FiX size={18} />
                    </button>
                    <button
                        onClick={handleInstallClick}
                        className="bg-[var(--brand-primary)] hover:bg-[#e6b533] text-black text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
