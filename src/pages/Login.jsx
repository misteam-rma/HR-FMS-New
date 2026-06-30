import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';
import logo from '../Assets/RMAALL.png';
import officeBg from '../Assets/office-bg.png';
import { normalizeRole } from '../utils/auth';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec';
const SHEET_API_URL = `${SCRIPT_URL}?sheet=USER&action=fetch`;
const LEAVING_API_URL = `${SCRIPT_URL}?sheet=LEAVING&action=fetch`;

localStorage.removeItem('hasSeenLanguageHint');

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(
        `https://script.google.com/macros/s/AKfycbwGN0L4CqcZdhgie3l94KGGjWHqaL_cHRgwtw1CCUZy6yqpF5lFlFNBbO10dEm7BNK6FQ/exec?sheet=USER&action=fetch`
      );
      const data = await res.json();

      const userJson = data;
      const leavingRes = await fetch(LEAVING_API_URL);
      const leavingJson = await leavingRes.json();

      if (!userJson.success || !leavingJson.success) {
        toast.error('Error fetching data');
        setSubmitting(false);
        return;
      }

      const userRows = userJson.data;
      const userHeaders = userRows[0];
      const users = userRows.slice(1).map(row => {
        let obj = {};
        userHeaders.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });

      const leavingRows = leavingJson.data;
      const leavingHeaders = leavingRows[5];
      const leavingData = leavingRows.slice(6).map((row) => {
        let obj = {};
        leavingHeaders.forEach((h, i) => (obj[h] = row[i]));
        return obj;
      });

      const matchedUserRow = userRows.slice(1).find(row => {
        const idG = row[6]?.toString().trim();
        const idH = row[7]?.toString().trim();
        const pass = row[8]?.toString().trim();
        return (idG === username || idH === username) && pass === password;
      });

      if (!matchedUserRow) {
        toast.error('Invalid credentials');
        setSubmitting(false);
        return;
      }

      // Map matched row to expected object structure
      const matchedUser = {
        userName: matchedUserRow[2], // Name at Col C
        UserId: matchedUserRow[6],   // Code at Col G
        role: matchedUserRow[11],     // Role at Col L
        ...userHeaders.reduce((acc, h, i) => ({ ...acc, [h]: matchedUserRow[i] }), {})
      };

      const displayName = matchedUser.userName;
      const isUserLeaving = leavingData.some(record => {
        const leavingName = record[leavingHeaders[2]];
        const leavingStatus = record[leavingHeaders[13]];
        return leavingName && displayName &&
          leavingName.toString().toLowerCase() === displayName.toString().toLowerCase() &&
          leavingStatus !== null && leavingStatus !== undefined && leavingStatus !== '';
      });

      if (isUserLeaving) {
        toast.error('Employee access has been deactivated');
        setSubmitting(false);
        return;
      }

      toast.success('Login successful!');

      // Normalize user object for backward compatibility with other components
      const normalizedRole = normalizeRole(matchedUserRow[11]);
      const normalizedUser = {
        ...matchedUser,
        Admin: normalizedRole === 'admin' ? 'Yes' : 'No',
        Role: normalizedRole,
        role: normalizedRole,
        Code: matchedUserRow[6],
        Name: matchedUserRow[2]
      };

      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('employeeId', matchedUserRow[6]?.toString().trim() || '');
      sessionStorage.setItem('role', normalizedRole);
      login(normalizedUser);

      if (normalizedRole === 'admin') {
        navigate("/", { replace: true });
      } else {
        navigate("/my-profile", { replace: true });
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Left Section: Image and Content */}
      <div className="relative md:w-5/12 lg:w-4/12 hidden md:flex flex-col items-start justify-center p-12 overflow-hidden text-white">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform hover:scale-105 duration-[20s]"
          style={{ backgroundImage: `url(${officeBg})` }}
        />
        <div className="absolute inset-0 z-10 bg-indigo-900/70 backdrop-blur-[1px]" />

        {/* Branding Content */}
        <div className="relative z-20 space-y-6 animate-in fade-in slide-in-from-left duration-700">
          <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
            Manage your workforce <br /> efficient<span className="text-blue-400">ly.</span>
          </h1>
          <p className="text-lg text-blue-500 font-medium max-w-sm opacity-90 leading-relaxed">
            Streamline human resources and file management with our powerful, intuitive system designed for modern businesses.
          </p>
        </div>

        {/* Subtle decorative line */}
        <div className="absolute bottom-12 left-12 w-24 h-1 bg-blue-500/50 rounded-full z-20" />
      </div>

      {/* Right Section: Login Form */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-sm space-y-12">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src={logo}
              alt="Rahul Mishra & Associates"
              className="h-20 w-auto object-contain transition-opacity duration-500"
            />
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Username Input */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all shadow-sm group-hover:bg-gray-100"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all shadow-sm group-hover:bg-gray-100"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 px-6 text-sm font-bold bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100/50 hover:bg-indigo-700 hover:shadow-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all active:scale-[0.98] ${submitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-dashed rounded-full animate-spin"></div>
                    <span className="font-bold uppercase tracking-widest text-xs">Authenticating...</span>
                  </div>
                ) : 'Sign in Securely'}
              </button>
            </div>
          </form>


        </div>
      </div>
    </div>
  );
};

export default Login;

