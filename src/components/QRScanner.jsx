import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FiX } from 'react-icons/fi';

const QRScanner = ({ onScan, onClose, onError }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        // Initialize Scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            false
        );

        scanner.render(
            (decodedText) => {
                onScan(decodedText);
                scanner.clear().catch(console.error);
            },
            (errorMessage) => {
                if (onError) onError(errorMessage);
            }
        );

        scannerRef.current = scanner;

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [onScan, onError]);

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Scan QR Code</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <FiX size={24} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="p-6 bg-black">
                    <div id="reader" className="overflow-hidden rounded-xl"></div>
                </div>

                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Point your camera at a QR code to scan
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
