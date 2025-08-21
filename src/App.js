import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddEvent from "./pages/AddEvent";
import ManageEvents from "./pages/ManageEvents";
import ArchivedEvents from "./pages/ArchivedEvents";
import EventFeedbacks from "./pages/EventFeedbacks";
import ArchivedFeedbacks from "./pages/ArchivedFeedbacks";
import EditQuestions from "./pages/EditQuestions";
import EventAnalytics from "./pages/EventAnalytics";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route → Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Admin pages */}
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/add-event" element={<AddEvent />} />
        <Route path="/admin/manage-events" element={<ManageEvents />} />
        <Route path="/admin/archived-events" element={<ArchivedEvents />} />
        <Route path="/admin/event-feedbacks/:eventId" element={<EventFeedbacks />} />
        <Route path="/admin/archived-feedbacks/:eventId" element={<ArchivedFeedbacks />} />
        <Route path="/admin/edit-questions/:eventId" element={<EditQuestions />} />
        <Route path="/admin/event-analytics/:eventId" element={<EventAnalytics />} />

        {/* Fallback → Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
