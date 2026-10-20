import { ArrowRight, Bell, CalendarDays, ChartNoAxesColumnIncreasing, Heart, MessageSquare, Route, ShieldCheck, Users } from 'lucide-react'
import platformImage from '../assets/Cinematic Commuter Train Platform-1.png'
import flavioImage from '../assets/Friendly Cybernetic Portrait with Smartphone-2.png'
import phoneImage from '../assets/Avviso Travel Companion App Mockup-3.png'
import trainImage from '../assets/Modern Red-and-White Commuter Train-4.png'
import avvisoLogo from '../assets/avviso-logo-transparent.png'
import './FeatureCards.css'

const benefits = [
  { icon: CalendarDays, color: '#ff002b', title: 'Remembers your journeys', text: 'Learns your routes, times and preferences.' },
  { icon: ChartNoAxesColumnIncreasing, color: '#008cff', title: 'Predicts potential problems', text: 'Uses past data, live reports and weather to warn you early.' },
  { icon: Bell, color: '#ff9c00', title: 'Reminds you about events', text: 'Concerts, matches, festivals and other local events.' },
  { icon: ShieldCheck, color: '#00bd8b', title: 'Helps you travel more safely', text: 'Alerts you to recurring issues and suggests better options.' },
]

const features = [
  { icon: Users, color: '#f50029', label: 'Real passenger reports' },
  { icon: MessageSquare, color: '#008cff', label: 'Live conversations' },
  { icon: Route, color: '#9e00e6', label: 'Route updates' },
  { icon: ChartNoAxesColumnIncreasing, color: '#00b78c', label: 'AI insights with Flavio' },
  { icon: CalendarDays, color: '#ff9400', label: 'Event & weather alerts' },
  { icon: ShieldCheck, color: '#f50029', label: 'A safer community' },
]

export default function FeatureCards() {
  return (
    <section className="flavio-banner" aria-labelledby="flavio-heading">
      <div className="flavio-hero">
        <img src={platformImage} alt="" className="flavio-platform" loading="lazy" />
        <div className="flavio-shade" aria-hidden="true" />

        <div className="flavio-copy">
          <div className="flavio-brand-row">
            <img src={avvisoLogo} alt="Avviso Live" className="flavio-logo" loading="lazy" />
            <p className="flavio-handwritten flavio-brand-note">Built by commuters.<br />For commuters.</p>
          </div>
          <span className="flavio-coming-soon">Coming soon</span>
          <h2 id="flavio-heading"><span className="flavio-meet">Meet <strong>Flavio.</strong></span><span>Your personal</span><span>AI Travel Companion.</span></h2>
          <p className="flavio-description">Flavio learns from real passenger reports, predicts potential disruptions and helps you travel smarter, safer and more in control.</p>
          <div className="flavio-support"><Heart fill="currentColor" aria-hidden="true" /><span>Support Avviso</span><ArrowRight aria-hidden="true" /></div>
          <p className="flavio-support-note">Your support helps keep Avviso free for everyone and makes new features like Flavio possible.</p>
        </div>

        <div className="flavio-art">
          <img src={flavioImage} alt="Flavio, your friendly AI travel companion, holding a smartphone" className="flavio-portrait" loading="lazy" />
          <img src={phoneImage} alt="Preview of the Avviso travel companion app" className="flavio-phone" loading="lazy" />
        </div>

        <div className="flavio-benefits" aria-label="Coming soon with Flavio">
          {benefits.map(({ icon: Icon, color, title, text }) => (
            <article key={title} className="flavio-benefit">
              <span className="flavio-benefit-icon" style={{ backgroundColor: color }}><Icon aria-hidden="true" strokeWidth={2.7} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </div>

      <div className="flavio-footer">
        <ul className="flavio-feature-list" aria-label="The Avviso community">
          {features.map(({ icon: Icon, color, label }) => <li key={label}><Icon style={{ color }} aria-hidden="true" strokeWidth={2.7} /><span>{label}</span></li>)}
        </ul>
        <p className="flavio-handwritten flavio-footer-note">Built by commuters.<br />Powered by commuters.</p>
        <div className="flavio-train-wrap"><img src={trainImage} alt="Illustration of a red and white commuter train" className="flavio-train" loading="lazy" /></div>
      </div>
    </section>
  )
}
