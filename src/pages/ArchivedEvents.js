// src/pages/ArchivedEvents.js
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  deleteDoc,
  addDoc,
  doc,
  setDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function ArchivedEvents() {
  const [archived, setArchived] = useState([]);
  const [notification, setNotification] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);

  const navigate = useNavigate();

  /* LOAD ARCHIVED EVENTS */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "archived_events"), (snap) => {
      setArchived(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  /* TOAST */
  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  /* RESTORE EVENT */
  const handleRestore = (event) => {
    setSelectedEvent(event);
    setDeleteMode(false);
    setShowModal(true);
  };

  const confirmRestore = async () => {
    try {
      const { id, ...eventData } = selectedEvent;

      /* STEP 1 — Restore event */
      const restoredRef = await addDoc(collection(db, "events"), {
        ...eventData,
        restoredAt: new Date().toISOString(),
      });

      const newEventId = restoredRef.id;

      /* STEP 2 — Restore Questions */
      if (eventData.questions && Object.keys(eventData.questions).length > 0) {
        await setDoc(doc(db, "event_questions", newEventId), {
          ...eventData.questions,
        });
      }

      /* STEP 3 — Restore Feedbacks */
      if (Array.isArray(eventData.feedbacks)) {
        for (const fb of eventData.feedbacks) {
          const { id: oldId, ...fbData } = fb;
          await addDoc(collection(db, "feedbacks"), {
            ...fbData,
            eventId: newEventId,
          });
        }
      }

      /* STEP 4 — Restore Attendance Logs */
      if (Array.isArray(eventData.attendanceLogs)) {
        for (const log of eventData.attendanceLogs) {
          const { id: oldId, ...logData } = log;
          await addDoc(collection(db, "attendanceLogs"), {
            ...logData,
            eventId: newEventId,
          });
        }
      }

      /* Delete archived record */
      await deleteDoc(doc(db, "archived_events", selectedEvent.id));

      showToast("Event restored successfully!");
    } catch (error) {
      console.error("Restore error:", error);
      showToast("Error restoring event.");
    }

    setSelectedEvent(null);
    setShowModal(false);
  };

  /* DELETE ARCHIVED EVENT */
  const handleDelete = (event) => {
    setSelectedEvent(event);
    setDeleteMode(true);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "archived_events", selectedEvent.id));
      showToast("Event permanently deleted!");
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Error deleting event.");
    }

    setSelectedEvent(null);
    setShowModal(false);
  };

  /* UI */
  return (
    <div className="flex min-h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-6 md:p-10 overflow-y-auto relative">

        <h2 className="text-3xl font-semibold text-gray-800 mb-6">
          Archived Events
        </h2>

        {notification && (
          <div className="fixed top-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50">
            {notification}
          </div>
        )}

        <div className="bg-white shadow-xl rounded-2xl border overflow-x-auto">
          <table className="min-w-full text-left text-sm md:text-base">
            <thead className="bg-gray-800 text-gray-100">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Archived At</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {archived.length > 0 ? (
                archived.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">{ev.title}</td>
                    <td className="px-6 py-4">{ev.location}</td>
                    <td className="px-6 py-4">{ev.date}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {ev.archivedAt
                        ? new Date(ev.archivedAt).toLocaleString()
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-center gap-2">

                        {/* RESTORE BUTTON (YELLOW) */}
                        <button
                          onClick={() => handleRestore(ev)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-3 py-1 rounded-md text-xs md:text-sm"
                        >
                          Restore
                        </button>

                        {/* DELETE BUTTON (RED) */}
                        <button
                          onClick={() => handleDelete(ev)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs md:text-sm"
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
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500 bg-white"
                  >
                    No archived events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl shadow-xl w-80 md:w-96 p-6 text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              {deleteMode ? "Delete Event" : "Restore Event"}
            </h3>

            <p className="text-gray-600 mb-6">
              Are you sure you want to{" "}
              <span className="font-semibold text-gray-900">
                {deleteMode ? "delete" : "restore"}
              </span>{" "}
              “{selectedEvent?.title}”?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={deleteMode ? confirmDelete : confirmRestore}
                className={`${
                  deleteMode
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white px-4 py-2 rounded-md`}
              >
                Confirm
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
