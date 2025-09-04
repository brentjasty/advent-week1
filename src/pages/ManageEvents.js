import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import Swal from "sweetalert2";

export default function ManageEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // optional: sort newest first
      list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setEvents(list);
    });
    return () => unsub();
  }, []);

  // Mark exactly one event as current
  const handleMakeCurrent = async (id) => {
    const confirm = await Swal.fire({
      title: "Make this the current event?",
      text: "This will unset any other current event.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1abc9c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, make current",
    });
    if (!confirm.isConfirmed) return;

    try {
      const batch = writeBatch(db);

      // Unset any existing current events (if any)
      const all = await getDocs(collection(db, "events"));
      all.forEach((d) => {
        const ref = doc(db, "events", d.id);
        batch.update(ref, { isCurrent: d.id === id });
      });

      await batch.commit();

      Swal.fire({
        icon: "success",
        title: "Updated",
        text: "Current event set successfully.",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to set current event", "error");
    }
  };

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

    if (!confirm.isConfirmed) return;

    try {
      const batch = writeBatch(db);

      // Add to archived_events
      const archivedRef = doc(collection(db, "archived_events"));
      batch.set(archivedRef, {
        title: eventData.title,
        location: eventData.location,
        date: eventData.date,
        createdAt: eventData.createdAt || new Date(),
        wasCurrent: !!eventData.isCurrent,
      });

      // If it was current, make sure no event is left "current"
      if (eventData.isCurrent) {
        const all = await getDocs(collection(db, "events"));
        all.forEach((d) => {
          batch.update(doc(db, "events", d.id), { isCurrent: false });
        });
      }

      // Delete from events
      batch.delete(doc(db, "events", id));

      await batch.commit();

      Swal.fire({
        icon: "success",
        title: "Archived!",
        text: "Event moved to Archived Events.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error archiving event:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to archive event",
        timer: 1800,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />
      <div className="flex-1 p-10 overflow-y-auto">
        <h2 className="text-3xl font-semibold text-gray-800 mb-8">Manage Events</h2>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <table className="min-w-full text-left text-gray-700">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-6 py-3 text-sm font-medium">Title</th>
                <th className="px-6 py-3 text-sm font-medium">Location</th>
                <th className="px-6 py-3 text-sm font-medium">Date</th>
                <th className="px-6 py-3 text-sm font-medium">Current</th>
                <th className="px-6 py-3 text-sm font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length ? (
                events.map((ev) => (
                  <tr key={ev.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4">{ev.title}</td>
                    <td className="px-6 py-4">{ev.location}</td>
                    <td className="px-6 py-4">{ev.date}</td>
                    <td className="px-6 py-4">{ev.isCurrent ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() =>
                          navigate(`/admin/event-feedbacks/${ev.id}`, {
                            state: { eventName: ev.title },
                          })
                        }
                      >
                        View Feedbacks
                      </button>

                      <button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() => handleMakeCurrent(ev.id)}
                        disabled={!!ev.isCurrent}
                        title={ev.isCurrent ? "Already current" : "Make current"}
                      >
                        {ev.isCurrent ? "Current" : "Make Current"}
                      </button>

                      <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() => handleArchive(ev.id, ev)}
                      >
                        Archive
                      </button>

                      <button
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm"
                        onClick={() => navigate(`/admin/edit-questions/${ev.id}`)}
                      >
                        Edit Questions
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
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
