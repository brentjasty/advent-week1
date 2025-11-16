// src/pages/ManageEvents.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  /* Load all events */
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  /* Handle Set Current Event */
  const handleSetCurrent = async (id) => {
    try {
      const promises = events.map((event) =>
        updateDoc(doc(db, "events", event.id), { isCurrent: event.id === id })
      );
      await Promise.all(promises);
      showNotification("Current event updated successfully!");
    } catch (error) {
      console.error("Error updating current event:", error);
    }
  };

  /* Confirm archive click */
  const handleArchiveClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  /* =====================================================
        FULL DEEP ARCHIVE — Stores EVERYTHING
     ===================================================== */
  const confirmArchive = async () => {
    if (!selectedEvent) return;

    try {
      const eventId = selectedEvent.id;

      // Remove doc ID
      const { id, ...eventData } = selectedEvent;

      /* ------------------ STEP 1 — Load Questions ------------------ */
      const qSnap = await getDoc(doc(db, "event_questions", eventId));
      const questionsData = qSnap.exists() ? qSnap.data() : null;

      /* ------------------ STEP 2 — Load Feedbacks ------------------ */
      const fbSnap = await getDocs(
        query(collection(db, "feedbacks"), where("eventId", "==", eventId))
      );
      const feedbacks = fbSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      /* ------------------ STEP 3 — Load ATTENDANCE LOGS ------------------ */
      const logsSnap = await getDocs(
        query(collection(db, "attendanceLogs"), where("eventId", "==", eventId))
      );
      const attendanceLogs = logsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      /* ------------------ STEP 4 — Archive FULL document ------------------ */
      await addDoc(collection(db, "archived_events"), {
        ...eventData,
        archivedAt: new Date().toISOString(),
        questions: questionsData || {},
        feedbacks: feedbacks || [],
        attendanceLogs: attendanceLogs || [],
      });

      /* ------------------ STEP 5 — Delete original data ------------------ */

      // Delete event
      await deleteDoc(doc(db, "events", eventId));

      // Delete questions
      if (questionsData) {
        await deleteDoc(doc(db, "event_questions", eventId));
      }

      // Delete feedbacks
      for (const fb of feedbacks) {
        await deleteDoc(doc(db, "feedbacks", fb.id));
      }

      // Delete attendance logs
      for (const l of attendanceLogs) {
        await deleteDoc(doc(db, "attendanceLogs", l.id));
      }

      setShowModal(false);
      setSelectedEvent(null);
      showNotification("Event archived successfully!");

    } catch (error) {
      console.error("ARCHIVE ERROR:", error);
      showNotification("Error archiving event.");
    }
  };

  /* Edit Event */
  const handleEdit = (id) => {
    navigate(`/admin/edit-event/${id}`);
    showNotification("Redirecting to edit event...");
  };

  /* Edit Questions */
  const handleEditQuestions = (id, title) => {
    navigate(`/admin/edit-questions/${id}`, { state: { eventName: title } });
  };

  /* View Feedbacks */
  const handleViewFeedbacks = (id, title) => {
    navigate(`/admin/event-feedbacks/${id}`, { state: { eventName: title } });
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto relative">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
          Manage Events
        </h2>

        {notification && (
          <div className="fixed top-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-out z-50">
            {notification}
          </div>
        )}

        <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-left text-sm md:text-base">
            <thead className="bg-gray-800 text-gray-100">
              <tr>
                <th className="px-4 md:px-6 py-3">Title</th>
                <th className="px-4 md:px-6 py-3">Location</th>
                <th className="px-4 md:px-6 py-3">Date</th>
                <th className="px-4 md:px-6 py-3 text-center">Current</th>
                <th className="px-4 md:px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {events.length > 0 ? (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 md:px-6 py-4 text-gray-800">
                      {event.title}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-gray-700">
                      {event.location}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-gray-700">
                      {event.date}
                    </td>

                    <td className="px-4 md:px-6 py-4 text-center">
                      {event.isCurrent ? (
                        <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-md text-xs md:text-sm font-semibold">
                          CURRENT
                        </span>
                      ) : (
                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md text-xs md:text-sm"
                          onClick={() => handleSetCurrent(event.id)}
                        >
                          Set Current
                        </button>
                      )}
                    </td>

                    <td className="px-4 md:px-6 py-4">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md"
                          onClick={() => handleEdit(event.id)}
                        >
                          Edit
                        </button>

                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md"
                          onClick={() =>
                            handleEditQuestions(event.id, event.title)
                          }
                        >
                          Edit Questions
                        </button>

                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md"
                          onClick={() =>
                            handleViewFeedbacks(event.id, event.title)
                          }
                        >
                          View Feedbacks
                        </button>

                        <button
                          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-3 py-1 rounded-md"
                          onClick={() => handleArchiveClick(event)}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No events available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archive Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-2xl w-80 md:w-96 p-6 text-center">
            <h3 className="text-xl font-semibold mb-3">Archive Event</h3>

            <p className="text-gray-600 mb-6">
              Are you sure you want to archive{" "}
              <span className="font-semibold text-gray-900">
                “{selectedEvent?.title}”
              </span>
              ?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={confirmArchive}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-md"
              >
                Yes, Archive
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageEvents;
