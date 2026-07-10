import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import HomeDashboard from './pages/HomeDashboard'
import SignInPage from './pages/SignInPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import CheckEmailPage from './pages/CheckEmailPage'
import CreatePasswordPage from './pages/CreatePasswordPage'
import AlertsPage from './pages/AlertsPage'
import SplashScreen from './components/SplashScreen'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    // Start fading just before the 2.5s mark, so the fade itself finishes
    // right at 2.5s instead of adding extra time on top of it.
    const fadeTimer = setTimeout(() => setFadingOut(true), 2000)
    const removeTimer = setTimeout(() => setShowSplash(false), 2500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (showSplash) {
    return <SplashScreen fadingOut={fadingOut} />
  }

  return (
    <Routes>
      <Route path="/" element={<HomeDashboard />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/reset-password" element={<CreatePasswordPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
    </Routes>
  )
}
