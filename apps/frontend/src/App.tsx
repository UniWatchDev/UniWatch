import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { NavBar } from '@/components/nav-bar';
import { Lobby } from '@/pages/lobby';
import { RoomPage } from '@/pages/room';
import { CreateRoom } from '@/pages/create-room';
import { EditRoom } from '@/pages/edit-room';

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/rooms" element={<Lobby />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/rooms/new" element={<CreateRoom />} /> 
        <Route path="/rooms/:id/edit" element={<EditRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
