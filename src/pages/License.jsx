import { KeyRound } from 'lucide-react'
import { useState, useEffect } from 'react'

const License = () => {
    const [userRole, setUserRole] = useState("")
    const [username, setUsername] = useState("")

    useEffect(() => {
        const storedRole = sessionStorage.getItem('role') || 'user'
        const storedUsername = sessionStorage.getItem('username') || 'User'
        setUserRole(storedRole)
        setUsername(storedUsername)
    }, [])

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10 font-outfit">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">License Agreement</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Software license terms and conditions
                    </p>
                </div>
            </div>

            {/* License Content */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col justify-center items-center py-16 px-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                    <KeyRound size={32} />
                </div>
                
                <div className="w-full max-w-2xl space-y-6">
                    {/* Copyright Notice */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-md transition-all">
                        <div className="text-2xl font-black text-slate-900 mb-4 text-center tracking-tight">
                            © BOTIVATE SERVICES LLP
                        </div>
                        <p className="text-slate-600 text-center leading-relaxed font-medium">
                            This software is developed exclusively by Botivate Services LLP for use by its clients.
                            Unauthorized use, distribution, or copying of this software is strictly prohibited and
                            may result in legal action.
                        </p>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 text-center hover:shadow-md transition-all">
                        <h4 className="font-bold text-slate-800 mb-3 text-lg">Contact Information</h4>
                        <p className="text-slate-500 font-medium mb-4 text-sm">
                            For license inquiries or technical support, please contact our support team:
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                            <a href="mailto:info@botivate.in" className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-600 hover:text-white transition-all">
                                📧 info@botivate.in
                            </a>
                            <a href="https://www.botivate.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-600 hover:text-white transition-all">
                                🌐 www.botivate.in
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default License