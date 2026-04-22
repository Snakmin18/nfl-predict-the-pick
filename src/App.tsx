import { BrowserRouter, Route, Routes } from "react-router-dom";
import NewDraftPage from "./pages/NewDraftPage";
import DraftPage from "./pages/DraftPage";
import AdminDraftOrderPage from "./pages/AdminDraftOrderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NewDraftPage />} />
        <Route path="/draft/:draftId" element={<DraftPage />} />
        <Route path="/admin/draft-order" element={<AdminDraftOrderPage />} />
      </Routes>
    </BrowserRouter>
  );
}
