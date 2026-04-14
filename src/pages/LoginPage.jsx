import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-6 border border-gray-100">
        <div className="space-y-2">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CPARS Dashboard</h1>
          <p className="text-gray-500 text-sm">Sign in with your Monday.com account to continue</p>
        </div>

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-sm"
        >
          <img src="https://cdn.monday.com/images/logos/monday_logo_icon.png" alt="" className="w-5 h-5" onError={e => e.target.style.display='none'} />
          Sign in with Monday.com
        </button>

        <p className="text-xs text-gray-400">
          You'll be redirected to Monday.com to authorize access.
        </p>
      </div>
    </div>
  )
}
