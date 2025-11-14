// src/admin/ArchivedFeedbacks.js
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import vader from "vader-sentiment";
import Swal from "sweetalert2";

/* ------------------------- UTIL FUNCTIONS ------------------------- */

const average = (nums) => {
  const vals = (Array.isArray(nums) ? nums : [])
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const analyzeSentiment = (text = "") => {
  const spamWords = ["http://", "https://", "buy now", "promo", "free $$$", "visit my"];
  if (!text) return "neutral";
  if (spamWords.some((w) => text.toLowerCase().includes(w))) return "spam";

  try {
    const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);
    if (intensity.compound >= 0.05) return "positive";
    if (intensity.compound <= -0.05) return "negative";
  } catch {
    return "neutral";
  }
  return "neutral";
};

const fmtDate = (ts) => {
  try {
    if (!ts) return "—";
    if (typeof ts?.toDate === "function") return ts.toDate().toLocaleString();
    if (ts?.seconds != null) return new Date(ts.seconds * 1000).toLocaleString();
    if (ts instanceof Date) return ts.toLocaleString();
    if (typeof ts === "number") return new Date(ts).toLocaleString();
    return String(ts);
  } catch {
    return "—";
  }
};

/* ------------------------- UI ------------------------- */

const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={
      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition " +
      (active ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 hover:bg-gray-100 border")
    }
  >
    {children}
  </button>
);

const CountBadge = ({ color, children }) => {
  const colors = {
    gray: "bg-gray-400 text-white",
    green: "bg-green-500 text-white",
    red: "bg-red-500 text-white",
    yellow: "bg-yellow-500 text-white",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};

const Star = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4 text-yellow-400 inline-block" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.293c.3.921-.755 1.688-1.54 1.118l-2.802-2.037a1 1 0 00-1.175 0l-2.802 2.037c-.784.57-1.838-.197-1.539-1.118l1.07-3.293a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
  </svg>
);

/* ------------------------- MODAL ------------------------- */

function FeedbackModal({ open, onClose, feedback = {}, questions = [], user }) {
  if (!open) return null;

  const ratings = Array.isArray(feedback.ratings)
    ? feedback.ratings.map(Number)
    : Object.values(feedback.ratings || {}).map(Number);

  const answers = Array.isArray(feedback.answers)
    ? feedback.answers
    : Object.values(feedback.answers || {});

  const avg = Number(average(ratings).toFixed(2));
  const sentiment = (feedback.sentiment || "neutral").toLowerCase();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-auto">

        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold">Feedback Detail</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Submitted</div>
              <div className="text-sm text-gray-700">{fmtDate(feedback.createdAt)}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Average Rating</div>
              <div className="text-2xl font-bold text-gray-800">
                {avg} <span className="text-yellow-500">★</span>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Sentiment</div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  sentiment === "positive"
                    ? "bg-green-100 text-green-700"
                    : sentiment === "negative"
                    ? "bg-red-100 text-red-700"
                    : sentiment === "spam"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {sentiment}
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Student ID</div>
              <div className="text-sm text-gray-700">{user?.idNumber ?? feedback.userId ?? "—"}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="text-sm text-gray-700">
                {feedback.anonymous ? "Anonymous" : `${user?.firstName ?? ""} ${user?.surname ?? ""}`.trim()}
              </div>
            </div>
          </div>

          {/* comment */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Comment</div>
            <div className="bg-gray-50 border p-3 rounded-md text-gray-700">
              {feedback.comment || <em>No comment</em>}
            </div>
          </div>

          {/* ratings + open-ended answers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 border p-4 rounded-md">
              <div className="text-sm font-medium text-gray-600 mb-2">Question Ratings</div>
              <ul className="space-y-2 text-sm">
                {questions.map((q, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      <span className="text-gray-400 mr-1">{i + 1}.</span>
                      {q}
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      {ratings[i] ?? 0} <Star />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 border p-4 rounded-md">
              <div className="text-sm font-medium text-gray-600 mb-2">Open-ended Answers</div>
              {answers.length ? (
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  {answers.map((a, idx) => (
                    <li key={idx} className="bg-white border p-2 rounded-md">
                      {a}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-gray-500 italic">No open-ended answers.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-white border rounded-md hover:bg-gray-100">
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ------------------------- PAGE ------------------------- */

export default function ArchivedFeedbacks() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [eventName] = useState(location?.state?.eventName || "Event");
  const [feedbacks, setFeedbacks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState({});
  const [active, setActive] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  /* Load questions */
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const snap = await getDoc(doc(db, "event_questions", eventId));
      if (snap.exists()) setQuestions(snap.data().questions || []);
    })();
  }, [eventId]);

  /* Load archived feedbacks */
  useEffect(() => {
    if (!eventId) return;

    const qRef = query(collection(db, "archived_feedbacks"), where("eventId", "==", eventId));

    const unsub = onSnapshot(qRef, (snap) => {
      const arr = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data();
        arr.push({
          id: docSnap.id,
          ...raw,
          ratings: raw.ratings ? Object.values(raw.ratings).map(Number) : [],
          answers: raw.answers ? Object.values(raw.answers) : [],
        });
      });

      arr.sort((a, b) => {
        const tA = a.archivedAt?.toMillis?.() ?? 0;
        const tB = b.archivedAt?.toMillis?.() ?? 0;
        return tB - tA;
      });

      setFeedbacks(arr);
    });

    return () => unsub();
  }, [eventId]);

  /* Load user data */
  useEffect(() => {
    const loadUsers = async () => {
      const map = {};
      for (const fb of feedbacks) {
        if (!fb.userId || map[fb.userId]) continue;
        const s = await getDoc(doc(db, "users", fb.userId));
        if (s.exists()) map[fb.userId] = s.data();
      }
      setUsers(map);
    };

    if (feedbacks.length > 0) loadUsers();
  }, [feedbacks]);

  const enriched = useMemo(
    () =>
      feedbacks.map((fb) => ({
        ...fb,
        _sentiment: fb.sentiment || analyzeSentiment(fb.comment),
        _avg: Number(average(fb.ratings).toFixed(2)),
      })),
    [feedbacks]
  );

  const counts = useMemo(
    () => ({
      total: enriched.length,
      positive: enriched.filter((f) => f._sentiment === "positive").length,
      negative: enriched.filter((f) => f._sentiment === "negative").length,
      spam: enriched.filter((f) => f._sentiment === "spam").length,
    }),
    [enriched]
  );

  const visible = useMemo(() => {
    if (active === "all") return enriched;
    return enriched.filter((f) => f._sentiment === active);
  }, [active, enriched]);

  const openModal = (fb) => {
    setSelectedFeedback(fb);
    setModalOpen(true);
  };

  /* ------------------ FIXED: RESTORE FEEDBACK ------------------ */
  const handleRestore = async (id, fb) => {
    const confirm = await Swal.fire({
      title: "Restore this feedback?",
      text: "It will be moved back to Feedbacks.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#d33",
      confirmButtonText: "Restore",
    });

    if (!confirm.isConfirmed) return;

    try {
      // Remove archive-only fields
      const { archivedAt, id: _discard, ...cleanData } = fb;

      await addDoc(collection(db, "feedbacks"), {
        ...cleanData,
        restoredAt: new Date(),
      });

      await deleteDoc(doc(db, "archived_feedbacks", id));

      // remove instantly from UI
      setFeedbacks((prev) => prev.filter((item) => item.id !== id));

      Swal.fire({
        icon: "success",
        title: "Restored",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Failed to restore",
        text: e?.message || "",
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">
            Archived Feedbacks — <span className="text-yellow-500">{eventName}</span>
          </h1>

          <button
            onClick={() =>
              navigate(`/admin/event-feedbacks/${eventId}`, {
                state: { eventName },
              })
            }
            className="px-4 py-2 rounded-full text-sm border bg-white hover:bg-gray-100 text-gray-700 shadow-sm"
          >
            Back to Feedbacks
          </button>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Pill active={active === "all"} onClick={() => setActive("all")}>
            All <CountBadge color="gray">{counts.total}</CountBadge>
          </Pill>
          <Pill active={active === "positive"} onClick={() => setActive("positive")}>
            Positive <CountBadge color="green">{counts.positive}</CountBadge>
          </Pill>
          <Pill active={active === "negative"} onClick={() => setActive("negative")}>
            Negative <CountBadge color="red">{counts.negative}</CountBadge>
          </Pill>
          <Pill active={active === "spam"} onClick={() => setActive("spam")}>
            Spam <CountBadge color="yellow">{counts.spam}</CountBadge>
          </Pill>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Comment</th>
                  <th className="px-4 py-3 text-center">Sentiment</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-gray-500">
                      No archived feedbacks found.
                    </td>
                  </tr>
                ) : (
                  visible.map((fb) => {
                    const user = users[fb.userId] || null;

                    return (
                      <tr key={fb.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">{user?.idNumber ?? fb.userId ?? "—"}</td>

                        <td className="px-4 py-3">
                          {fb.anonymous ? (
                            <em>Anonymous</em>
                          ) : (
                            `${user?.firstName ?? ""} ${user?.surname ?? ""}`.trim()
                          )}
                        </td>

                        <td className="px-4 py-3 truncate max-w-[35ch]">{fb.comment || "—"}</td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs ${
                              fb._sentiment === "positive"
                                ? "bg-green-100 text-green-700"
                                : fb._sentiment === "negative"
                                ? "bg-red-100 text-red-700"
                                : fb._sentiment === "spam"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {fb._sentiment}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openModal(fb)}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-800 text-white rounded-md text-sm"
                            >
                              View Feedback Form
                            </button>

                            <button
                              onClick={() => handleRestore(fb.id, fb)}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm"
                            >
                              Restore
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        <FeedbackModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          feedback={selectedFeedback}
          questions={questions}
          user={users[selectedFeedback?.userId]}
        />
      </div>
    </div>
  );
}
