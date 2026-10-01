// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import { HashRouter } from 'react-router-dom'
// import 'leaflet/dist/leaflet.css'
// import './index.css'
// import App from './App.jsx'
// import { AuthProvider } from './lib/AuthContext.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     {/* <HashRouter> */}
//       <AuthProvider>
//         <App />
//       </AuthProvider>
//     {/* </HashRouter> */}
//   </StrictMode>,
// )

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'

const configuredBase = import.meta.env.BASE_URL.replace(/\/$/, '')
const localDeploymentBase = window.location.pathname.startsWith('/rail-dashboard')
  ? '/rail-dashboard'
  : ''
const basename = configuredBase || localDeploymentBase || undefined

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)