// src/pages/ArchivedEvents.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

export default function ArchivedEvents() {
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const navigate = useNavigate();

  /* ---------------- LOAD ARCHIVED EVENTS ---------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "archived_events"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setArchivedEvents(list);
    });

    return () => unsub();
  }, []);

  const openRestoreModal = (event) => {
    setSelectedEvent(event);
    setShowRestoreModal(true);
  };

  /* ---------------- FULL RESTORE ----------------
     Restore:
      ✔ event data
      ✔ questions
      ✔ feedbacks
      ✔ geofence settings
      ✔ feedbackOpen state
  ------------------------------------------------ */
  const handleRestore = async () => {
    if (!selectedEvent) return;

    try {
      const eventId = selectedEvent.originalId || selectedEvent.id;

      // Restore Event Document
      await setDoc(doc(db, "events", eventId), {
        title: selectedEvent.title,
        location: selectedEvent.location,
        description: selectedEvent.description || "",
        latitude: selectedEvent.latitude,
        longitude: selectedEvent.longitude,
        radius: selectedEvent.radius,
        date: selectedEvent.date,
        createdAt: selectedEvent.createdAt || new Date(),
        updatedAt: new Date(),
        feedbackOpen: selectedEvent.feedbackOpen || false,
        isCurrent: false,
      });

      // Restore Questions
      if (selectedEvent.event_questions) {
        await setDoc(doc(db, "event_questions", eventId), {
          questions: selectedEvent.event_questions.questions || [],
          openEnded: selectedEvent.event_questions.openEnded || [],
          createdAt: selectedEvent.event_questions.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }

      /* Restore ALL feedbacks under this event */
      const archivedFeedbackCollections = [
        "archived_event_feedbacks",
        "archived_feedbacks",
      ];

      for (const colName of archivedFeedbackCollections) {
        const qRef = query(
          collection(db, colName),
          where("eventId", "==", eventId)
        );

        const snap = await getDocs(qRef);
        for (const fb of snap.docs) {
          await addDoc(collection(db, "feedbacks"), {
            ...fb.data(),
            restoredAt: new Date(),
          });
          await deleteDoc(doc(db, colName, fb.id));
        }
      }

      // Remove from archive
      await deleteDoc(doc(db, "archived_events", selectedEvent.id));

      Swal.fire({
        icon: "success",
        title: "Event Restored",
        text: "Event, questions, and feedbacks restored successfully!",
        timer: 1500,
        showConfirmButton: false,
        position: "top-end",
      });

      setShowRestoreModal(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error("RESTORE FAILED:", err);
      Swal.fire("Error", "Failed to restore event", "error");
    }
  };

  /* ---------------- DELETE ARCHIVED EVENT ---------------- */
  const handleDeleteArchive = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Archived Event?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
      position: "top-end",
    });

    if (!confirm.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "archived_events", id));
      Swal.fire("Deleted", "Archived event removed", "success");
    } catch (err) {
      console.error("Delete failed:", err);
      Swal.fire("Error", "Failed to delete archived event", "error");
    }
  };

  /* ---------------- VIEW FEEDBACKS (REDIRECT TO PAGE) ---------------- */
  const handleViewFeedbacks = (id, title) => {
    navigate(`/admin/archived-feedbacks/${id}`, {
      state: { eventName: title },
    });
  };

  /* ----------------------------------- UI ----------------------------------- */
  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        <h2 className="text-3xl font-semibold text-gray-800 mb-8">
          Archived Events
        </h2>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
          <table className="min-w-full text-left">
            <thead className="bg-gray-800 text-gray-100">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {archivedEvents.length > 0 ? (
                archivedEvents.map((ev) => (
                  <tr key={ev.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{ev.title}</td>
                    <td className="px-6 py-4">{ev.location}</td>
                    <td className="px-6 py-4">{ev.date}</td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {/* RESTORE */}
                        <button
                          onClick={() => openRestoreModal(ev)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Restore
                        </button>

                        {/* VIEW FEEDBACKS */}
                        <button
                          onClick={() => handleViewFeedbacks(ev.id, ev.title)}
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md text-sm"
                        >
                          View Feedbacks
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => handleDeleteArchive(ev.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center py-6 text-gray-500 bg-white"
                  >
                    No archived events available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESTORE MODAL */}
      {showRestoreModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h3 className="text-xl font-semibold mb-4">Restore Event</h3>

            <p className="text-gray-600 mb-6">
              Restore{" "}
              <span className="font-bold">“{selectedEvent.title}”</span> back to
              active events?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleRestore}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                Restore
              </button>

              <button
                onClick={() => setShowRestoreModal(false)}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-md"
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
