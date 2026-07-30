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
import PretPromoScreen from './components/PretPromoScreen'
import WelcomeScreen from './components/WelcomeScreen'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [fadingOut, setFadingOut] = useState(false)
  const [showPromo, setShowPromo] = useState(true)
  const [promoFadingOut, setPromoFadingOut] = useState(false)
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem('trainlive_onboarded') !== 'true'
  )

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), 2000)
    const removeTimer = setTimeout(() => setShowSplash(false), 2500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  useEffect(() => {
    if (showSplash) return
    const fadeTimer = setTimeout(() => setPromoFadingOut(true), 2000)
    const removeTimer = setTimeout(() => setShowPromo(false), 2500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [showSplash])

  if (showSplash) {
    return <SplashScreen fadingOut={fadingOut} />
  }

  if (showPromo) {
    return <PretPromoScreen fadingOut={promoFadingOut} />
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        onDismiss={() => {
          localStorage.setItem('trainlive_onboarded', 'true')
          setShowWelcome(false)
        }}
      />
    )
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