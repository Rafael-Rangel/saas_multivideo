import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function Login() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      navigate('/')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            N8N Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Faça login para acessar sua conta
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          redirectTo={`${window.location.origin}/`}
        />
      </div>
    </div>
  )
}

