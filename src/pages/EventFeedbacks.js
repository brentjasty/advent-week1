// src/pages/EventFeedbacks.js
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import vader from "vader-sentiment";

const EVENT_Q_COLLECTION = "event_questions";
const USERS_COLLECTION = "users";

/* --------------------------- helpers --------------------------- */

const average = (nums) => {
  const vals = (Array.isArray(nums) ? nums : [])
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

/*
  SENTIMENT = COMMENT ONLY
  🔥 CHANGE: "neutral" → "spam"
*/

const analyzeCommentSentiment = (text = "") => {
  if (!text || typeof text !== "string") return "spam";

  const lower = text.toLowerCase().trim();

  const spamWords = [
    "http://",
    "https://",
    "buy now",
    "promo",
    "free $$$",
    "visit my",
  ];
  if (spamWords.some((w) => lower.includes(w))) return "spam";

  const noVowels = !/[aeiou]/i.test(lower);
  const longGibberish = /^[a-z]{15,}$/i.test(lower);
  if (noVowels || longGibberish) return "spam";

  try {
    const result = vader.SentimentIntensityAnalyzer.polarity_scores(text);
    if (result.compound >= 0.05) return "positive";
    if (result.compound <= -0.05) return "negative";
  } catch {}

  return "spam"; // 🔥 neutral → spam
};

const fmtDate = (ts) => {
  try {
    if (!ts) return "—";
    if (typeof ts?.toDate === "function") return ts.toDate().toLocaleString();
    if (ts?.seconds != null) return new Date(ts.seconds * 1000).toLocaleString();
    return String(ts);
  } catch {
    return "—";
  }
};

/* ---------------- UI ---------------- */

const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={
      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition " +
      (active
        ? "bg-blue-600 text-white shadow"
        : "bg-white text-gray-700 hover:bg-gray-100 border")
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
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        colors[color] || colors.gray
      }`}
    >
      {children}
    </span>
  );
};

const Star = () => (
  <svg
    viewBox="0 0 20 20"
    className="w-4 h-4 text-yellow-400 inline-block"
    fill="currentColor"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.293c.3.921-.755 1.688-1.54 1.118l-2.802-2.037a1 1 0 00-1.175 0l-2.802 2.037c-.784.57-1.838-.197-1.539-1.118l1.07-3.293a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
  </svg>
);

/* --------------------------- Modal --------------------------- */

function FeedbackModal({
  open,
  onClose,
  feedback = {},
  questions = [],
  openEndedQuestions = [],
}) {
  if (!open || !feedback) return null;

  const ratings = Array.isArray(feedback.ratings)
    ? feedback.ratings.map(Number)
    : feedback.ratings
    ? Object.values(feedback.ratings).map(Number)
    : [];

  const answers = feedback.answers
    ? Array.isArray(feedback.answers)
      ? feedback.answers
      : Object.values(feedback.answers)
    : [];

  const avg = Number(average(ratings || []).toFixed(2));
  const sentiment = analyzeCommentSentiment(feedback.comment).toLowerCase();

  const studentID = feedback.studentID ?? feedback.userId ?? "—";

  // 🔥 If anonymous hide ONLY name — student ID must remain visible
  const name = feedback.anonymous
    ? "Anonymous"
    : feedback.userName || feedback.displayName || feedback.userEmail || "User";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-auto max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold">Feedback Detail</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            Close ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Submitted</div>
              <div className="text-sm text-gray-700">
                {fmtDate(feedback.createdAt)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Student ID:{" "}
                <span className="font-medium text-gray-700">{studentID}</span>
              </div>
              <div className="text-xs text-gray-500">
                Name:{" "}
                <span className="font-medium text-gray-700">{name}</span>
              </div>
            </div>

            <div className="text-right">
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
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {sentiment}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm font-medium text-gray-600 mb-3">
                Question Ratings
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                {questions.length ? (
                  questions.map((q, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <span className="text-gray-500 mr-2">{idx + 1}.</span>{" "}
                        <span className="font-medium">{q}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="font-semibold">{ratings[idx] ?? 0}</div>
                        <Star />
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="text-gray-500 italic">
                    No rated questions available.
                  </div>
                )}
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm font-medium text-gray-600 mb-2">
                Open-ended Q → A
              </div>
              {openEndedQuestions.length ? (
                <div className="space-y-3 text-sm text-gray-700">
                  {openEndedQuestions.map((q, i) => (
                    <div key={i} className="p-3 bg-white rounded-md border">
                      <div className="text-xs text-gray-500 mb-1">
                        <strong>Q{i + 1}:</strong> {q}
                      </div>
                      <div className="text-gray-700">
                        {answers[i] ?? (
                          <em className="text-gray-400">No answer</em>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  No open-ended questions available.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-600 mb-1">
              Comment
            </div>
            <div className="bg-white p-3 rounded-md border text-gray-700">
              {feedback.comment || (
                <span className="italic text-gray-400">No comment</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md border bg-white text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- page --------------------------- */

export default function EventFeedbacks() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [eventName] = useState(location?.state?.eventName || "Event");
  const [feedbacks, setFeedbacks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [openEndedQuestions, setOpenEndedQuestions] = useState([]);
  const [active, setActive] = useState(
    new URLSearchParams(location.search).get("sentiment") || "all"
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  /* Load event questions */
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, EVENT_Q_COLLECTION, eventId));
        if (snap.exists()) {
          const data = snap.data();
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
          setOpenEndedQuestions(
            Array.isArray(data.openEnded) ? data.openEnded : []
          );
        } else {
          setQuestions([]);
          setOpenEndedQuestions([]);
        }
      } catch (err) {
        console.error("Failed fetching event questions:", err);
      }
    })();
  }, [eventId]);

  /* Load feedbacks */
  useEffect(() => {
    if (!eventId) return;

    const qRef = query(
      collection(db, "feedbacks"),
      where("eventId", "==", eventId)
    );

    const unsub = onSnapshot(qRef, async (snap) => {
      const temp = [];
      const userIdsSet = new Set();

      for (const d of snap.docs) {
        const raw = d.data();
        const fb = {
          id: d.id,
          ...raw,
          ratings: Array.isArray(raw.ratings)
            ? raw.ratings.map(Number)
            : raw.ratings
            ? Object.values(raw.ratings).map(Number)
            : [],
          answers: raw.answers
            ? Array.isArray(raw.answers)
              ? raw.answers
              : Object.values(raw.answers)
            : [],
        };
        temp.push(fb);
        if (raw.userId) userIdsSet.add(raw.userId);
      }

      /* Merge user info */
      const userMap = {};
      await Promise.all(
        Array.from(userIdsSet).map(async (uid) => {
          try {
            const udoc = await getDoc(doc(db, USERS_COLLECTION, uid));
            if (udoc.exists()) {
              const ud = udoc.data();
              userMap[uid] = {
                displayName:
                  ud.displayName ??
                  `${ud.firstName ?? ""} ${ud.surname ?? ""}`.trim(),
                idNumber: ud.idNumber ?? ud.studentID ?? null,
              };
            }
          } catch {}
        })
      );

      /* Compute sentiment */
      for (const fb of temp) {
        const uid = fb.userId;

        if (uid && userMap[uid]) {
          fb.displayName = userMap[uid].displayName;
          fb.studentID = userMap[uid].idNumber;
          fb.userName = fb.displayName;
        }

        // 🔥 Keep studentID even if anonymous
        if (fb.anonymous) {
          fb.userName = "Anonymous";
        }

        if (fb.comment) {
          try {
            const s = analyzeCommentSentiment(fb.comment);
            await updateDoc(doc(db, "feedbacks", fb.id), { sentiment: s });
            fb.sentiment = s;
          } catch {
            fb.sentiment = analyzeCommentSentiment(fb.comment);
          }
        } else {
          fb.sentiment = "spam"; // 🔥 neutral → spam
        }
      }

      temp.sort((a, b) => {
        const aMs =
          a.createdAt?.toMillis?.() ??
          (typeof a.createdAt === "number" ? a.createdAt : 0);
        const bMs =
          b.createdAt?.toMillis?.() ??
          (typeof b.createdAt === "number" ? b.createdAt : 0);
        return bMs - aMs;
      });

      setFeedbacks(temp);
    });

    return () => unsub();
  }, [eventId]);

  const enriched = useMemo(
    () =>
      feedbacks.map((fb) => ({
        ...fb,
        _avg: Number(average(fb.ratings || []).toFixed(2)),
        _sentiment: analyzeCommentSentiment(fb.comment).toLowerCase(),
      })),
    [feedbacks]
  );

  const counts = useMemo(() => {
    return {
      total: enriched.length,
      positive: enriched.filter((f) => f._sentiment === "positive").length,
      negative: enriched.filter((f) => f._sentiment === "negative").length,
      spam: enriched.filter((f) => f._sentiment === "spam").length,
    };
  }, [enriched]);

  const visible = useMemo(() => {
    if (active === "all") return enriched;
    return enriched.filter((f) => f._sentiment === active);
  }, [active, enriched]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (active === "all") params.delete("sentiment");
    else params.set("sentiment", active);
    navigate({ search: params.toString() }, { replace: true });
  }, [active]);

  const openModalWith = (fb) => {
    setSelectedFeedback(fb);
    setModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-3xl font-semibold text-gray-800">
            Feedbacks — <span className="text-blue-600">{eventName}</span>
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Pill active={active === "all"} onClick={() => setActive("all")}>
            All <CountBadge color="gray">{counts.total}</CountBadge>
          </Pill>
          <Pill
            active={active === "positive"}
            onClick={() => setActive("positive")}
          >
            Positive <CountBadge color="green">{counts.positive}</CountBadge>
          </Pill>
          <Pill
            active={active === "negative"}
            onClick={() => setActive("negative")}
          >
            Negative <CountBadge color="red">{counts.negative}</CountBadge>
          </Pill>
          <Pill active={active === "spam"} onClick={() => setActive("spam")}>
            Spam <CountBadge color="yellow">{counts.spam}</CountBadge>
          </Pill>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                    Student ID
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                    Comment
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-center">
                    Sentiment
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No feedbacks in this category.
                    </td>
                  </tr>
                ) : (
                  visible.map((fb) => (
                    <tr key={fb.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {fb.studentID ?? fb.userId ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {fb.anonymous ? (
                          <em>Anonymous</em>
                        ) : (
                          fb.userName ||
                          fb.displayName ||
                          fb.userEmail ||
                          "User"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 truncate max-w-[40ch]">
                        {fb.comment || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                            fb._sentiment === "positive"
                              ? "bg-green-100 text-green-700"
                              : fb._sentiment === "negative"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {fb._sentiment}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openModalWith(fb)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-800 text-white rounded-md text-sm"
                          >
                            View Feedback Form
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <FeedbackModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedFeedback(null);
          }}
          feedback={selectedFeedback || {}}
          questions={questions}
          openEndedQuestions={openEndedQuestions}
        />
      </div>
    </div>
  );
}
