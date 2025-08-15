import { useState } from 'react'
import { useSignUpEmailPassword } from '@nhost/react'
import { Link } from 'react-router-dom'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { signUpEmailPassword, isLoading, error } = useSignUpEmailPassword()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    await signUpEmailPassword(email, password)
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800/50 backdrop-blur-md rounded-xl shadow-xl border border-purple-900/30">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-purple-200 tracking-wide">
            Initialize Your Account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <input
              type="email"
              required
              className="appearance-none rounded-md relative block w-full px-4 py-3 bg-gray-900/50 border border-purple-900/50 placeholder-gray-400 text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <input
              type="password"
              required
              className="appearance-none rounded-md relative block w-full px-4 py-3 bg-gray-900/50 border border-purple-900/50 placeholder-gray-400 text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <input
              type="password"
              required
              className="appearance-none rounded-md relative block w-full px-4 py-3 bg-gray-900/50 border border-purple-900/50 placeholder-gray-400 text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm font-medium">{error.message}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-700 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400 disabled:opacity-50 transition-all duration-300"
            >
              {isLoading ? 'Initializing...' : 'Create Account'}
            </button>
          </div>
          
          <div className="text-center">
            <Link to="/login" className="text-purple-300 hover:text-purple-200 transition-colors duration-200">
              Already registered? Access now
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}