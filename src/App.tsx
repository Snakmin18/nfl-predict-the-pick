import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NewDraftPage from "./pages/NewDraftPage";
import DraftPage from "./pages/DraftPage";
import LobbyPage from "./pages/LobbyPage";
import AdminDraftOrderPage from "./pages/AdminDraftOrderPage";
import OfficialDraftPage from "./pages/OfficialDraftPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:lobbyId/:participantId" element={<LobbyPage />} />
        <Route path="/draft/:draftId" element={<DraftPage />} />
        <Route path="/new" element={<NewDraftPage />} />
        <Route path="/admin/draft-order" element={<AdminDraftOrderPage />} />
        <Route path="/admin/official-draft" element={<OfficialDraftPage />} />
      </Routes>
    </BrowserRouter>
  );
}
