import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, []);

  // Toast
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  // Set Current Event
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

  // Show archive modal
  const handleArchiveClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  // Confirm archive
  const confirmArchive = async () => {
    if (!selectedEvent) return;
    try {
      await addDoc(collection(db, "archived_events"), {
        title: selectedEvent.title,
        location: selectedEvent.location,
        date: selectedEvent.date,
        createdAt: selectedEvent.createdAt || new Date(),
      });

      await deleteDoc(doc(db, "events", selectedEvent.id));

      setShowModal(false);
      setSelectedEvent(null);
      showNotification("Event archived successfully!");
    } catch (error) {
      console.error("Error archiving event:", error);
    }
  };

  // Edit Event
  const handleEdit = (id) => {
    navigate(`/admin/edit-event/${id}`);
    showNotification("Redirecting to edit event...");
  };

  // Edit Questions
  const handleEditQuestions = (id, title) => {
    navigate(`/admin/edit-questions/${id}`, {
      state: { eventName: title },
    });
  };

  // ⭐ NEW: View Feedbacks
  const handleViewFeedbacks = (id, title) => {
    navigate(`/admin/event-feedbacks/${id}`, {
      state: { eventName: title },
    });
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto relative">
        <h2 className="text-3xl font-semibold text-gray-800 mb-8">
          Manage Events
        </h2>

        {notification && (
          <div className="fixed top-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-out z-50">
            {notification}
          </div>
        )}

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
          <table className="min-w-full text-left">
            <thead className="bg-gray-800 text-gray-100">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold">Title</th>
                <th className="px-6 py-3 text-sm font-semibold">Location</th>
                <th className="px-6 py-3 text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-sm font-semibold text-center">
                  Current
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {events.length > 0 ? (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 text-gray-800">{event.title}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {event.location}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{event.date}</td>

                    <td className="px-6 py-4 text-center">
                      {event.isCurrent ? (
                        <button
                          disabled
                          className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-md text-sm font-medium opacity-90 cursor-default"
                        >
                          CURRENT
                        </button>
                      ) : (
                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md text-sm transition"
                          onClick={() => handleSetCurrent(event.id)}
                        >
                          Set Current
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">

                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md text-sm transition"
                          onClick={() => handleEdit(event.id)}
                        >
                          Edit
                        </button>

                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md text-sm transition"
                          onClick={() =>
                            handleEditQuestions(event.id, event.title)
                          }
                        >
                          Edit Questions
                        </button>

                        {/* ⭐ NEW: View Feedbacks */}
                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded-md text-sm transition"
                          onClick={() =>
                            handleViewFeedbacks(event.id, event.title)
                          }
                        >
                          View Feedbacks
                        </button>

                        <button
                          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-3 py-1 rounded-md text-sm transition font-medium"
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
                    className="px-6 py-8 text-center text-gray-500 bg-white"
                  >
                    No events available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6 text-center transform transition-all">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Archive Event
            </h3>

            <p className="text-gray-600 mb-6">
              Are you sure you want to archive{" "}
              <span className="font-medium text-gray-900">
                “{selectedEvent?.title}”
              </span>
              ?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={confirmArchive}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium px-4 py-2 rounded-md transition"
              >
                Yes, Archive
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-4 py-2 rounded-md transition"
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
