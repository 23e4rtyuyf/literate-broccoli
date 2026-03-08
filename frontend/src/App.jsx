import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CrisisBoard from './pages/CrisisBoard'
import Debrief from './pages/Debrief'
import Terms from './pages/Terms'
import Messages from './pages/Messages'
import MapView from './pages/MapView'
import CaptainApply from './pages/CaptainApply'

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/crisis/:id" element={<CrisisBoard />} />
          <Route path="/debrief/:id" element={<Debrief />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/apply-captain" element={<CaptainApply />} />
        </Routes>
      </main>
    </div>
  )
}
