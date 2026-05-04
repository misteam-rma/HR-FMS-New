import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Download, QrCode } from "lucide-react";

const QRCodeModal = ({ isOpen, onClose }) => {
    const qrRef = useRef();

    if (!isOpen) return null;

    const downloadQRCode = () => {
        const canvas = qrRef.current.querySelector("canvas");
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = "visitor-registration-qr.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // The direct public URL for the visitor form
    const visitorUrl = `${window.location.origin}/visitor-form`;

    return (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-outfit" onClick={onClose}>
            <div 
                className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                            <QrCode size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800">Registration QR</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-10 flex flex-col items-center gap-8 text-center">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-indigo-50 rounded-[3rem] -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <div ref={qrRef} className="p-6 bg-white border-4 border-white rounded-[2rem] shadow-xl ring-1 ring-slate-100">
                            <QRCodeCanvas 
                                value={visitorUrl} 
                                size={200}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: "/favicon.ico",
                                    x: undefined,
                                    y: undefined,
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                }}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <p className="text-sm font-black text-slate-800 mb-1 uppercase tracking-wider">Visitor Self-Entry</p>
                        <p className="text-[10px] text-slate-400 font-bold break-all max-w-[220px] mx-auto uppercase tracking-tighter">
                            {visitorUrl}
                        </p>
                    </div>

                    <button
                        onClick={downloadQRCode}
                        className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    >
                        <Download size={18} />
                        Download PDF QR
                    </button>
                </div>
                
                <div className="bg-slate-50/50 p-5 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">Gate Pass Management</p>
                </div>
            </div>
        </div>
    );
};

export default QRCodeModal;
