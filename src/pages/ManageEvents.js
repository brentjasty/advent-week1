import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";

function ManageEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

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

  const handleArchive = async (id, eventData) => {
    const confirm = await Swal.fire({
      title: "Archive this event?",
      text: "This event will be moved to Archived Events.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1abc9c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, archive it!",
    });

    if (confirm.isConfirmed) {
      try {
        await addDoc(collection(db, "archived_events"), {
          title: eventData.title,
          location: eventData.location,
          date: eventData.date,
          createdAt: eventData.createdAt || new Date(),
        });

        await deleteDoc(doc(db, "events", id));

        Swal.fire({
          icon: "success",
          title: "Archived!",
          text: "Event moved to Archived Events.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error archiving event:", error);
        Swal.fire({
          icon: "error",
          title: "Failed to archive event",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto">
        <h2 className="text-3xl font-semibold text-gray-800 mb-8">
          Manage Events
        </h2>

        {/* Events Table */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <table className="min-w-full text-left text-gray-700">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-6 py-3 text-sm font-medium">Title</th>
                <th className="px-6 py-3 text-sm font-medium">Location</th>
                <th className="px-6 py-3 text-sm font-medium">Date</th>
                <th className="px-6 py-3 text-sm font-medium text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length > 0 ? (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">{event.title}</td>
                    <td className="px-6 py-4">{event.location}</td>
                    <td className="px-6 py-4">{event.date}</td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() =>
                          navigate(`/admin/event-feedbacks/${event.id}`, {
                            state: { eventName: event.title },
                          })
                        }
                      >
                        View Feedbacks
                      </button>
                      <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() => handleArchive(event.id, event)}
                      >
                        Archive
                      </button>
                      <button
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() =>
                          navigate(`/admin/edit-questions/${event.id}`)
                        }
                      >
                        Edit Questions
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
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
    </div>
  );
}

export default ManageEvents;
