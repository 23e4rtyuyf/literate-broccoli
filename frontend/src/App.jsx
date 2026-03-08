import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CrisisBoard from './pages/CrisisBoard'
import Debrief from './pages/Debrief'

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
        </Routes>
      </main>
    </div>
  )
}
