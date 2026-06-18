import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Yggdrasil from './pages/Yggdrasil/Yggdrasil'
import Alfheim from './pages/Alfheim/Alfheim'
import Valhalla from './pages/Valhalla/Valhalla'
import Midgard from './pages/Midgard/Midgard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Yggdrasil />} />
        <Route path="/alfheim/*" element={<Alfheim />} />
        <Route path="/valhalla/*" element={<Valhalla />} />
        <Route path="/midgard/*" element={<Midgard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App