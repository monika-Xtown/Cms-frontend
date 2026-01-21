import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { FaCheckCircle, FaTimesCircle, FaQrcode } from 'react-icons/fa';

const GlobalScannerListener = () => {
    const [scanResult, setScanResult] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // We connect DIRECTLY to the Backend PC (.10)
        // const socketUrl = 'https://api.prithviinnerwears.com';
        const socketUrl = 'http://192.168.1.5:5002';

        socketRef.current = io(socketUrl, {
            transports: ['websocket']
        });

        socketRef.current.on('qr-scan-result', (data) => {
            setScanResult({
                status: data.success ? 'success' : 'error',
                message: data.message,
                orderId: data.order_id
            });
            setTimeout(() => setScanResult(null), 5000);
        });

        return () => socketRef.current?.disconnect();
    }, []);

    if (!scanResult) return null;

    return (
        <div className="fixed bottom-10 right-10 z-[9999] p-6 rounded-2xl shadow-2xl text-white flex items-center gap-4 min-w-[320px] bg-slate-900 border border-slate-700 animate-bounce-in">
            <div className={`p-2 rounded-full ${scanResult.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {scanResult.status === 'success' ? <FaCheckCircle size={24} /> : <FaTimesCircle size={24} />}
            </div>
            <div>
                <p className="text-lg font-bold">{scanResult.message}</p>
                {scanResult.orderId && <p className="text-sm opacity-80 font-mono">Order: #{scanResult.orderId}</p>}
            </div>
        </div>
    );
};

export default GlobalScannerListener;  