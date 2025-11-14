import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getCountFromServer,
  query,
  where,
  onSnapshot,
  limit,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import Swal from "sweetalert2";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    feedbacks: 0,
    events: 0,
    attendanceTotal: 0,
    validated: 0,
    invalidated: 0,
  });

  const [currentEvent, setCurrentEvent] = useState(null);
  const [toggling, setToggling] = useState(false);

  // ✅ Fetch feedback & event counts once
  useEffect(() => {
    (async () => {
      try {
        const feedbackSnap = await getCountFromServer(collection(db, "feedbacks"));
        const eventsSnap = await getCountFromServer(collection(db, "events"));
        setStats((prev) => ({
          ...prev,
          feedbacks: feedbackSnap.data().count,
          events: eventsSnap.data().count,
        }));
      } catch (err) {
        console.error("Error loading feedback/events:", err);
      }
    })();
  }, []);

  // ✅ Attendance Logs (total count)
  useEffect(() => {
    const qRef = query(collection(db, "attendanceLogs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(qRef, (snap) => {
      const total = snap.size;
      setStats((prev) => ({ ...prev, attendanceTotal: total }));
    });
    return () => unsub();
  }, []);

  // ✅ Live Validation Status (validated / invalidated)
  useEffect(() => {
    const qRef = query(collection(db, "attendanceLogs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(qRef, (snap) => {
      const latestMap = new Map();

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const studentID = data.studentID || data.userId || "unknown";
        if (!latestMap.has(studentID)) {
          latestMap.set(studentID, data);
        }
      });

      const latest = Array.from(latestMap.values());
      const validated = latest.filter((d) => d.status === "validated").length;
      const invalidated = latest.filter((d) => d.status !== "validated").length;

      setStats((prev) => ({
        ...prev,
        validated,
        invalidated,
      }));
    });

    return () => unsub();
  }, []);

  // ✅ Current Event
  useEffect(() => {
    const qRef = query(collection(db, "events"), where("isCurrent", "==", true), limit(1));
    const unsub = onSnapshot(qRef, (snap) => {
      if (snap.empty) setCurrentEvent(null);
      else {
        const d = snap.docs[0];
        setCurrentEvent({ id: d.id, ...d.data() });
      }
    });
    return () => unsub();
  }, []);

  // ✅ Toggle Feedback Form
  const handleToggleFeedback = async () => {
    if (!currentEvent?.id) return;
    const next = !Boolean(currentEvent.feedbackOpen);
    setToggling(true);
    try {
      await updateDoc(doc(db, "events", currentEvent.id), {
        feedbackOpen: next,
      });
      Swal.fire({
        icon: "success",
        title: next ? "Feedback Form Opened" : "Feedback Form Closed",
        timer: 1400,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Failed to update",
        text: e?.message || "",
      });
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-semibold mb-10 text-gray-800">
          Welcome back, <span className="text-yellow-500">Admin!</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ✅ Current Event */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg md:col-span-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Current Event</h2>

            {currentEvent ? (
              <>
                <p className="text-xl font-bold text-yellow-500">
                  {currentEvent.title || "Untitled"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentEvent.location ? `@ ${currentEvent.location}` : "Location: TBA"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentEvent.date || "Date: TBA"}
                </p>

                {/* ✅ Feedback Toggle */}
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Feedback Form</p>
                      <p className="text-xs text-gray-500">
                        Toggle to manually {currentEvent.feedbackOpen ? "close" : "open"} the mobile
                        feedback form.
                      </p>
                    </div>

                    <button
                      onClick={handleToggleFeedback}
                      disabled={toggling}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        currentEvent.feedbackOpen ? "bg-yellow-500" : "bg-gray-300"
                      } ${toggling ? "opacity-70 cursor-not-allowed" : "hover:brightness-95"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          currentEvent.feedbackOpen ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        currentEvent.feedbackOpen
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          currentEvent.feedbackOpen ? "bg-yellow-500" : "bg-gray-400"
                        }`}
                      />
                      {currentEvent.feedbackOpen ? "OPEN" : "CLOSED"}
                    </span>
                  </div>
                </div>

                {/* ❌ Buttons removed here */}
              </>
            ) : (
              <p className="text-gray-500">
                No current event selected. Set one in{" "}
                <span className="font-semibold">Manage Events</span>.
              </p>
            )}
          </div>

          {/* ✅ Total Feedback */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Total Feedback</h2>
            <p className="text-4xl font-bold text-yellow-500">{stats.feedbacks}</p>
          </div>

          {/* ✅ Notifications */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Notifications</h2>
              <p className="text-sm text-gray-500">Send updates or announcements to users.</p>
            </div>
            <button
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-md shadow-md transition"
              onClick={() => navigate("/admin/notifications")}
            >
              Add Notifications
            </button>
          </div>

          {/* ✅ Live Validated */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Validated</h2>
              <p className="text-4xl font-bold text-yellow-400">{stats.validated}</p>
            </div>
            <button
              onClick={() => navigate("/admin/validated")}
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-md shadow-md transition"
            >
              View Validated
            </button>
          </div>

          {/* ✅ Live Invalidated */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Invalidated</h2>
              <p className="text-4xl font-bold text-yellow-400">{stats.invalidated}</p>
            </div>
            <button
              onClick={() => navigate("/admin/invalidated")}
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-md shadow-md transition"
            >
              View Invalidated
            </button>
          </div>

          {/* ✅ Attendance Logs */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Attendance Logs</h2>
              <p className="text-4xl font-bold text-yellow-500">{stats.attendanceTotal}</p>
            </div>
            <button
              onClick={() => navigate("/admin/attendance-logs")}
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-md shadow-md transition"
            >
              View Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
