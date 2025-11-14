import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🔐 Authentication
import Login from "./pages/Login";

// 🧭 Admin Pages
import Dashboard from "./pages/Dashboard";
import AddEvent from "./pages/AddEvent";
import ManageEvents from "./pages/ManageEvents";
import ArchivedEvents from "./pages/ArchivedEvents";
import EventFeedbacks from "./pages/EventFeedbacks";
import ArchivedFeedbacks from "./pages/ArchivedFeedbacks";
import EditQuestions from "./pages/EditQuestions";
import EventAnalytics from "./pages/EventAnalytics";
import AddNotifications from "./pages/AddNotifications";
import EditEvent from "./pages/EditEvent";
import AttendanceLogs from "./pages/AttendanceLogs";

// 🟩 Attendance Filters
import Validated from "./pages/Validated";
import Invalidated from "./pages/Invalidated";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default Route → Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />

        {/* ✅ Admin Routes */}
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/add-event" element={<AddEvent />} />
        <Route path="/admin/manage-events" element={<ManageEvents />} />
        <Route path="/admin/archived-events" element={<ArchivedEvents />} />
        <Route path="/admin/event-feedbacks/:eventId" element={<EventFeedbacks />} />
        <Route path="/admin/archived-feedbacks/:eventId" element={<ArchivedFeedbacks />} />
        <Route path="/admin/edit-questions/:eventId" element={<EditQuestions />} />
        <Route path="/admin/event-analytics/:eventId" element={<EventAnalytics />} />
        <Route path="/admin/notifications" element={<AddNotifications />} />
        <Route path="/admin/edit-event/:id" element={<EditEvent />} />
        <Route path="/admin/attendance-logs" element={<AttendanceLogs />} />

        {/* 🟩 Attendance Filters */}
        <Route path="/admin/validated" element={<Validated />} />
        <Route path="/admin/invalidated" element={<Invalidated />} />

        {/* Catch-All → Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
