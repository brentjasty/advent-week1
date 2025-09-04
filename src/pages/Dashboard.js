// src/pages/Dashboard.js
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
  updateDoc,
  doc,
} from "firebase/firestore";
import Swal from "sweetalert2";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    feedbacks: 0,
    checkins: 0,
    valid: 0,
    invalid: 0,
    events: 0,
  });

  const [currentEvent, setCurrentEvent] = useState(null);
  const [toggling, setToggling] = useState(false);

  // Counts (feedbacks / events / check-ins)
  useEffect(() => {
    (async () => {
      try {
        const feedbackSnap = await getCountFromServer(collection(db, "feedbacks"));
        const eventsSnap = await getCountFromServer(collection(db, "events"));
        const checkinSnap = await getCountFromServer(collection(db, "checkins"));
        const validSnap = await getCountFromServer(
          query(collection(db, "checkins"), where("valid", "==", true))
        );
        const invalidSnap = await getCountFromServer(
          query(collection(db, "checkins"), where("valid", "==", false))
        );

        setStats({
          feedbacks: feedbackSnap.data().count,
          events: eventsSnap.data().count,
          checkins: checkinSnap.data().count,
          valid: validSnap.data().count,
          invalid: invalidSnap.data().count,
        });
      } catch {
        setStats({ feedbacks: 0, checkins: 0, valid: 0, invalid: 0, events: 0 });
      }
    })();
  }, []);

  // Live: current event (isCurrent === true)
  useEffect(() => {
    const qRef = query(collection(db, "events"), where("isCurrent", "==", true), limit(1));
    const unsub = onSnapshot(qRef, (snap) => {
      if (snap.empty) {
        setCurrentEvent(null);
      } else {
        const d = snap.docs[0];
        setCurrentEvent({ id: d.id, ...d.data() });
      }
    });
    return () => unsub();
  }, []);

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
          Welcome back, <span className="text-blue-600">Admin!</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Current Event card */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg md:col-span-1">
            <h2 className="text-lg font-medium text-gray-700 mb-2">Current Event</h2>

            {currentEvent ? (
              <>
                <p className="text-xl font-bold text-blue-600">
                  {currentEvent.title || "Untitled"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentEvent.location ? `@ ${currentEvent.location}` : "Location: TBA"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentEvent.date || "Date: TBA"}
                </p>

                {/* Feedback Open/Close Switch */}
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Feedback Form
                      </p>
                      <p className="text-xs text-gray-500">
                        Toggle to manually {currentEvent.feedbackOpen ? "close" : "open"} the mobile feedback form.
                      </p>
                    </div>

                    {/* Switch */}
                    <button
                      onClick={handleToggleFeedback}
                      disabled={toggling}
                      className={
                        "relative inline-flex h-6 w-11 items-center rounded-full transition " +
                        (currentEvent.feedbackOpen ? "bg-emerald-500" : "bg-gray-300") +
                        (toggling ? " opacity-70 cursor-not-allowed" : " hover:brightness-95")
                      }
                      title={currentEvent.feedbackOpen ? "Close feedback" : "Open feedback"}
                    >
                      <span
                        className={
                          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition " +
                          (currentEvent.feedbackOpen ? "translate-x-5" : "translate-x-1")
                        }
                      />
                    </button>
                  </div>

                  {/* Current state pill */}
                  <div className="mt-3">
                    <span
                      className={
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold " +
                        (currentEvent.feedbackOpen
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-700")
                      }
                    >
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (currentEvent.feedbackOpen ? "bg-emerald-500" : "bg-gray-400")
                        }
                      />
                      {currentEvent.feedbackOpen ? "OPEN" : "CLOSED"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
                    onClick={() =>
                      navigate(`/admin/event-feedbacks/${currentEvent.id}`, {
                        state: { eventName: currentEvent.title || "Event" },
                      })
                    }
                  >
                    View Feedbacks
                  </button>
                  <button
                    className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-md text-sm"
                    onClick={() => navigate("/admin/manage-events")}
                  >
                    Manage Events
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500">
                No current event selected. Set one in{" "}
                <span className="font-semibold">Manage Events</span>.
              </p>
            )}
          </div>

          {/* Total Feedback */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">Total Feedback</h2>
            <p className="text-4xl font-bold text-blue-600">{stats.feedbacks}</p>
          </div>

          {/* Total Check-ins */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">Total Check-ins</h2>
            <p className="text-4xl font-bold text-blue-600">{stats.checkins}</p>
          </div>

          {/* Valid Check-ins */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">Valid Check-ins</h2>
            <p className="text-4xl font-bold text-blue-600">{stats.valid}</p>
          </div>

          {/* Invalid Check-ins */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">Invalid Check-ins</h2>
            <p className="text-4xl font-bold text-blue-600">{stats.invalid}</p>
          </div>

          {/* Notifications quick action */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">Notifications</h2>
            <button
              className="mt-2 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
              onClick={() => navigate("/admin/notifications")}
            >
              Add Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
