import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import Swal from "sweetalert2";

const MAX_RATED = 10;

export default function EditQuestions() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rated, setRated] = useState([]);       // array of strings (max 10)
  const [openEnded, setOpenEnded] = useState([]); // array of strings
  const [newRated, setNewRated] = useState("");
  const [newOpen, setNewOpen] = useState("");

  const docRef = useMemo(
    () => (eventId ? doc(db, "event_questions", eventId) : null),
    [eventId]
  );

  // Load live
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

  /* -------------------------- helpers -------------------------- */
  const move = (arr, from, to) => {
    const next = [...arr];
    const item = next.splice(from, 1)[0];
    next.splice(to, 0, item);
    return next;
  };

  const addRated = () => {
    const q = newRated.trim();
    if (!q) return;
    if (rated.length >= MAX_RATED) {
      Swal.fire("Limit reached", `Rated questions are limited to ${MAX_RATED}.`, "info");
      return;
    }
    setRated((s) => [...s, q]);
    setNewRated("");
  };

  const addOpen = () => {
    const q = newOpen.trim();
    if (!q) return;
    setOpenEnded((s) => [...s, q]);
    setNewOpen("");
  };

  const saveAll = async () => {
    if (!eventId || !docRef) return;
    try {
      await setDoc(
        docRef,
        {
          eventId,
          questions: rated.map((s) => String(s).trim()).filter(Boolean).slice(0, MAX_RATED),
          openEnded: openEnded.map((s) => String(s).trim()).filter(Boolean),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      Swal.fire({ icon: "success", title: "Saved", timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e?.message || "Failed to save questions.", "error");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">
            Edit Questions
          </h1>
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
            {/* Rated questions (1–10) */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Rated Questions</h2>
                  <p className="text-sm text-gray-500">
                    These appear with 1–5 stars. Limit: {MAX_RATED}.
                  </p>
                </div>
                <span className="text-sm text-gray-600">
                  {rated.length}/{MAX_RATED}
                </span>
              </div>

              {/* Add new rated */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Add rated question…"
                  value={newRated}
                  onChange={(e) => setNewRated(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addRated}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Add
                </button>
              </div>

              {/* List rated */}
              <ul className="mt-5 space-y-3">
                {rated.length ? (
                  rated.map((q, idx) => (
                    <li
                      key={idx}
                      className="border rounded-md p-3 flex items-center gap-3"
                    >
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
                        className="flex-1 px-2 py-1 border rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          disabled={idx === 0}
                          onClick={() => setRated((s) => move(s, idx, idx - 1))}
                          className={`px-2 py-1 rounded-md border ${
                            idx === 0 ? "opacity-40" : "hover:bg-gray-50"
                          }`}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          disabled={idx === rated.length - 1}
                          onClick={() => setRated((s) => move(s, idx, idx + 1))}
                          className={`px-2 py-1 rounded-md border ${
                            idx === rated.length - 1 ? "opacity-40" : "hover:bg-gray-50"
                          }`}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() =>
                            setRated((s) => s.filter((_, i) => i !== idx))
                          }
                          className="px-2 py-1 rounded-md border text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 text-sm">No rated questions yet.</li>
                )}
              </ul>
            </div>

            {/* Open-ended questions */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800">Open-Ended Questions</h2>
              <p className="text-sm text-gray-500">
                Students will answer these in text boxes. Add as many as you need.
              </p>

              {/* Add new open-ended */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Add open-ended question…"
                  value={newOpen}
                  onChange={(e) => setNewOpen(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addOpen}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Add
                </button>
              </div>

              {/* List open-ended */}
              <ul className="mt-5 space-y-3">
                {openEnded.length ? (
                  openEnded.map((q, idx) => (
                    <li
                      key={idx}
                      className="border rounded-md p-3 flex items-center gap-3"
                    >
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
                        className="flex-1 px-2 py-1 border rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          disabled={idx === 0}
                          onClick={() => setOpenEnded((s) => move(s, idx, idx - 1))}
                          className={`px-2 py-1 rounded-md border ${
                            idx === 0 ? "opacity-40" : "hover:bg-gray-50"
                          }`}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          disabled={idx === openEnded.length - 1}
                          onClick={() => setOpenEnded((s) => move(s, idx, idx + 1))}
                          className={`px-2 py-1 rounded-md border ${
                            idx === openEnded.length - 1 ? "opacity-40" : "hover:bg-gray-50"
                          }`}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() =>
                            setOpenEnded((s) => s.filter((_, i) => i !== idx))
                          }
                          className="px-2 py-1 rounded-md border text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 text-sm">No open-ended questions yet.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Save bar */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={saveAll}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md"
          >
            Save Changes
          </button>
          <span className="text-sm text-gray-500">
            This saves rated + open-ended questions for this event.
          </span>
        </div>
      </div>
    </div>
  );
}
