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

function ArchivedEvents() {
  const navigate = useNavigate();
  const [archivedEvents, setArchivedEvents] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "archived_events"),
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setArchivedEvents(eventsData);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleRestore = async (id, eventData) => {
    const confirm = await Swal.fire({
      title: "Restore this event?",
      text: "This event will be moved back to Manage Events.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1abc9c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, restore it!",
    });

    if (confirm.isConfirmed) {
      try {
        // Add back to "events"
        await addDoc(collection(db, "events"), {
          title: eventData.title,
          location: eventData.location,
          date: eventData.date,
          createdAt: eventData.createdAt || new Date(),
        });

        // Remove from "archived_events"
        await deleteDoc(doc(db, "archived_events", id));

        Swal.fire({
          icon: "success",
          title: "Restored!",
          text: "Event moved back to Manage Events.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error restoring event:", error);
        Swal.fire({
          icon: "error",
          title: "Failed to restore event",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete this event?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "archived_events", id));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Event permanently deleted.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error deleting event:", error);
        Swal.fire({
          icon: "error",
          title: "Failed to delete event",
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
          Archived Events
        </h2>

        {/* Archived Events Table */}
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
              {archivedEvents.length > 0 ? (
                archivedEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">{event.title}</td>
                    <td className="px-6 py-4">{event.location}</td>
                    <td className="px-6 py-4">{event.date}</td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() => handleRestore(event.id, event)}
                      >
                        Restore
                      </button>
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() => handleDelete(event.id)}
                      >
                        Delete
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
                    No archived events available.
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

export default ArchivedEvents;
