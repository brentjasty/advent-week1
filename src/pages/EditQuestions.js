import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

const MAX_RATED = 10;

export default function EditQuestions() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rated, setRated] = useState([]);
  const [openEnded, setOpenEnded] = useState([]);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");

  const [newRated, setNewRated] = useState("");
  const [newOpen, setNewOpen] = useState("");

  // ⭐ NEW — success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const docRef = useMemo(() => {
    return eventId ? doc(db, "event_questions", eventId) : null;
  }, [eventId]);

  /* ---------------------- Load Event Info ---------------------- */
  useEffect(() => {
    if (!eventId) return;

    const eventRef = doc(db, "events", eventId);
    getDoc(eventRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setEventName(data.title || "Event");
        setEventDate(data.date || "N/A");
      }
    });
  }, [eventId]);

  /* ---------------------- Live Load Questions ---------------------- */
  useEffect(() => {
    if (!docRef) return;

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setRated(Array.isArray(data.questions) ? data.questions : []);
        setOpenEnded(Array.isArray(data.openEnded) ? data.openEnded : []);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [docRef]);

  /* -------------------------- Helpers -------------------------- */
  const move = (arr, from, to) => {
    const next = [...arr];
    const item = next.splice(from, 1)[0];
    next.splice(to, 0, item);
    return next;
  };

  const addRated = () => {
    if (!newRated.trim()) return;
    if (rated.length >= MAX_RATED) {
      alert(`Rated questions limited to ${MAX_RATED}.`);
      return;
    }
    setRated((s) => [...s, newRated.trim()]);
    setNewRated("");
  };

  const addOpen = () => {
    if (!newOpen.trim()) return;
    setOpenEnded((s) => [...s, newOpen.trim()]);
    setNewOpen("");
  };

  /* -------------------------- Save -------------------------- */
  const saveAll = async () => {
    if (!eventId || !docRef) return;

    try {
      await setDoc(
        docRef,
        {
          eventId,
          eventTitle: eventName,
          eventDate,
          questions: rated.slice(0, MAX_RATED),
          openEnded,
          feedbackCount: 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // ⭐ Show custom modal instead of SweetAlert
      setShowSuccessModal(true);

    } catch (e) {
      alert("Save failed: " + e.message);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">
              Edit Questions — {eventName}
            </h1>
            <p className="text-gray-500 text-sm">{eventDate}</p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-100"
          >
            Back
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Rated Questions */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Rated Questions
                  </h2>
                  <p className="text-sm text-gray-500">
                    These appear with 1–5 stars. Limit: {MAX_RATED}.
                  </p>
                </div>
                <span className="text-sm text-gray-600">
                  {rated.length}/{MAX_RATED}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newRated}
                  onChange={(e) => setNewRated(e.target.value)}
                  placeholder="Add rated question…"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={addRated}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Add
                </button>
              </div>

              <ul className="mt-5 space-y-3">
                {rated.map((q, idx) => (
                  <li key={idx} className="border rounded-md p-3 flex items-center gap-3">
                    <span className="text-gray-500 w-6 text-right">{idx + 1}.</span>

                    <input
                      type="text"
                      value={q}
                      onChange={(e) =>
                        setRated((s) => {
                          const next = [...s];
                          next[idx] = e.target.value;
                          return next;
                        })
                      }
                      className="flex-1 px-2 py-1 border rounded-md"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        disabled={idx === 0}
                        onClick={() => setRated((s) => move(s, idx, idx - 1))}
                        className="px-2 py-1 rounded-md border"
                      >
                        ↑
                      </button>
                      <button
                        disabled={idx === rated.length - 1}
                        onClick={() => setRated((s) => move(s, idx, idx + 1))}
                        className="px-2 py-1 rounded-md border"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setRated((s) => s.filter((_, i) => i !== idx))}
                        className="px-2 py-1 rounded-md border text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Open-ended */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Open-Ended Questions
              </h2>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newOpen}
                  onChange={(e) => setNewOpen(e.target.value)}
                  placeholder="Add open-ended question…"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={addOpen}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Add
                </button>
              </div>

              <ul className="mt-5 space-y-3">
                {openEnded.map((q, idx) => (
                  <li key={idx} className="border rounded-md p-3 flex items-center gap-3">
                    <span className="text-gray-500 w-6 text-right">{idx + 1}.</span>

                    <input
                      type="text"
                      value={q}
                      onChange={(e) =>
                        setOpenEnded((s) => {
                          const next = [...s];
                          next[idx] = e.target.value;
                          return next;
                        })
                      }
                      className="flex-1 px-2 py-1 border rounded-md"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        disabled={idx === 0}
                        onClick={() => setOpenEnded((s) => move(s, idx, idx - 1))}
                        className="px-2 py-1 rounded-md border"
                      >
                        ↑
                      </button>
                      <button
                        disabled={idx === openEnded.length - 1}
                        onClick={() => setOpenEnded((s) => move(s, idx, idx + 1))}
                        className="px-2 py-1 rounded-md border"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() =>
                          setOpenEnded((s) => s.filter((_, i) => i !== idx))
                        }
                        className="px-2 py-1 rounded-md border text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8">
          <button
            onClick={saveAll}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* ⭐ SUCCESS MODAL (same style as Archive Event modal) */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6 text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Saved Successfully!
            </h3>

            <p className="text-gray-600 mb-6">
              The questions for <span className="font-medium">{eventName}</span> were updated.
            </p>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
