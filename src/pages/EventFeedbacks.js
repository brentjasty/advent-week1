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
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
} from "firebase/firestore";
import Swal from "sweetalert2";

/** Dev: show sample cards if Firestore is empty */
const USE_SAMPLE_WHEN_EMPTY = true;

/** Where per‑event questions live */
const EVENT_Q_COLLECTION = "event_questions";

/* --------------------------- helpers --------------------------- */

const average = (nums) => {
  const vals = nums.map(Number).filter((n) => !Number.isNaN(n));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

// Simple heuristic sentiment until VADER writes fb.sentiment
const deriveSentimentHeuristic = (fb) => {
  const text = (fb?.comment || "").toLowerCase();
  const spamWords = ["http://", "https://", "buy now", "promo", "free $$$", "visit my"];
  const isSpam = spamWords.some((w) => text.includes(w)) || fb?.isSpam === true;
  if (isSpam) return "spam";

  const ratings = Array.isArray(fb?.ratings) ? fb.ratings : [Number(fb?.rating || 0)];
  const avg = average(ratings);
  if (avg >= 4) return "positive";
  if (avg > 0 && avg <= 2) return "negative";
  return "neutral";
};

const fmtDate = (ts) => {
  try {
    const d = ts?.toDate?.() instanceof Date ? ts.toDate() : new Date(ts || Date.now());
    return d.toLocaleString();
  } catch {
    return "—";
  }
};

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
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

const Star = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4 text-yellow-400 inline-block" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.293c.3.921-.755 1.688-1.54 1.118l-2.802-2.037a1 1 0 00-1.175 0l-2.802 2.037c-.784.57-1.838-.197-1.539-1.118l1.07-3.293a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
  </svg>
);

/* --------------------------- card --------------------------- */

const FeedbackCard = ({ fb, questions, onArchive }) => {
  const sentiment = (fb?.sentiment || fb?._sentiment || "neutral").toLowerCase();
  const chipColor =
    sentiment === "positive"
      ? "bg-green-100 text-green-700"
      : sentiment === "negative"
      ? "bg-red-100 text-red-700"
      : sentiment === "spam"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";

  const ratings = Array.isArray(fb?.ratings)
    ? fb.ratings.map((n) => Number(n))
    : [Number(fb?.rating || 0)];

  const avg = Number(average(ratings).toFixed(2));
  const rows = (questions && questions.length ? questions : []).map((q, idx) => ({
    idx: idx + 1,
    q,
    val: Number(ratings[idx] ?? 0),
  }));

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600">
            {fb?.anonymous ? <em>Anonymous</em> : fb?.userName || fb?.userEmail || "User"}
          </div>
          <div className="text-xs text-gray-400">{fmtDate(fb?.createdAt)}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${chipColor} capitalize`}>
          {sentiment}
        </div>
      </div>

      {/* Total Average Rating */}
      <div className="flex items-center gap-2">
        <div className="text-[15px] text-gray-600">Total Average Rating:</div>
        <div className="text-base font-semibold text-gray-800">{avg}</div>
        <Star />
      </div>

      {/* Comment */}
      <div>
        <div className="text-[13px] font-medium text-gray-600 mb-1">Comment:</div>
        <div className="text-gray-700">
          {fb?.comment ? fb.comment : <span className="italic text-gray-400">No comment</span>}
        </div>
      </div>

      {/* Question items */}
      {rows.length > 0 && (
        <div className="border-t pt-3">
          <div className="text-[13px] font-medium text-gray-600 mb-2">Question Ratings</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
            {rows.map(({ idx, q, val }) => (
              <li key={idx} className="text-sm text-gray-700">
                <span className="text-gray-500 mr-1">{idx}.</span>
                <span className="font-medium">{q}</span>
                {": "}
                <span className="font-semibold">{val}</span> <Star />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2">
        <button
          onClick={onArchive}
          className="px-3 py-2 text-sm rounded-md bg-yellow-500 hover:bg-yellow-600 text-white transition"
        >
          Archive
        </button>
      </div>
    </div>
  );
};

/* --------------------------- page --------------------------- */

export default function EventFeedbacks() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [eventName] = useState(location?.state?.eventName || "Event");
  const [feedbacks, setFeedbacks] = useState([]);
  const [questions, setQuestions] = useState([]); // per‑event questions

  // 🔧 SINGLE state for the sentiment filter
  const [active, setActive] = useState(
    new URLSearchParams(location.search).get("sentiment") || "all"
  );

  // Load per‑event questions
  useEffect(() => {
    if (!eventId) return;

    (async () => {
      try {
        const qRef = query(
          collection(db, EVENT_Q_COLLECTION),
          where("eventId", "==", eventId),
          limit(1)
        );
        const snap = await getDocs(qRef);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (Array.isArray(data?.questions) && data.questions.length) {
            setQuestions(data.questions);
            return;
          }
        }
      } catch (e) {
        console.warn("Failed fetching event questions – falling back to sample.", e);
      }

      // Fallback sample questions
      setQuestions([
        "Overall, how satisfied were you with the event?",
        "How helpful were the talks/workshops?",
        "Rate the quality of speakers.",
        "Was the schedule well-organized?",
        "Rate venue comfort (seating, A/C, etc.).",
        "Rate audio/visual quality.",
        "How relevant was the content to you?",
        "How helpful were the staff/ushers?",
        "Rate the check‑in experience.",
        "Would you recommend this event to others?",
      ]);
    })();
  }, [eventId]);

  // Live feedbacks for this event
  useEffect(() => {
    if (!eventId) return;
    const qRef = query(
      collection(db, "feedbacks"),
      where("eventId", "==", eventId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(qRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFeedbacks(list);
    });
    return () => unsub();
  }, [eventId]);

  // Sample feedbacks if empty
  const withSample = useMemo(() => {
    if (feedbacks.length > 0 || !USE_SAMPLE_WHEN_EMPTY) return feedbacks;

    return [
      {
        id: "sample1",
        userName: "Jane Student",
        comment: "Loved the event! Speakers were amazing.",
        ratings: [5, 5, 4, 5, 4, 5, 5, 4, 5, 5],
        createdAt: new Date(),
        sentiment: "positive",
        eventId,
      },
      {
        id: "sample2",
        userEmail: "user@domain.com",
        comment: "Audio issues, couldn't hear from the back.",
        ratings: [2, 3, 2, 2, 2, 2, 2, 2, 2, 2],
        createdAt: new Date(),
        sentiment: "negative",
        eventId,
      },
      {
        id: "sample3",
        anonymous: true,
        comment: "Visit my site http://spam.example.com for free gifts",
        ratings: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        createdAt: new Date(),
        sentiment: "spam",
        eventId,
      },
    ];
  }, [feedbacks, eventId]);

  // Enrich for filter/stats
  const enriched = useMemo(
    () =>
      withSample.map((fb) => {
        const ratings = Array.isArray(fb?.ratings) ? fb.ratings : [Number(fb?.rating || 0)];
        return {
          ...fb,
          _avg: Number(average(ratings).toFixed(2)),
          _sentiment: fb?.sentiment || deriveSentimentHeuristic(fb),
        };
      }),
    [withSample]
  );

  // Page-level average
  const pageAvg = useMemo(() => {
    const avgs = enriched.map((f) => f._avg).filter((n) => n > 0);
    return avgs.length ? Number((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2)) : 0;
  }, [enriched]);

  // Counts
  const counts = useMemo(() => {
    const total = enriched.length;
    const positive = enriched.filter((f) => f._sentiment === "positive").length;
    const negative = enriched.filter((f) => f._sentiment === "negative").length;
    const spam = enriched.filter((f) => f._sentiment === "spam").length;
    return { total, positive, negative, spam };
  }, [enriched]);

  // Visible cards
  const visible = useMemo(() => {
    if (active === "all") return enriched;
    return enriched.filter((f) => f._sentiment === active);
  }, [active, enriched]);

  // Sync sentiment filter to URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (active === "all") params.delete("sentiment");
    else params.set("sentiment", active);
    navigate({ search: params.toString() }, { replace: true });
  }, [active]); // eslint-disable-line

  // Archive → move doc to archived_feedbacks
  const handleArchive = async (id, fb) => {
    const confirm = await Swal.fire({
      title: "Archive this feedback?",
      text: "It will move to Archived Feedbacks.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1abc9c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, archive",
    });
    if (!confirm.isConfirmed) return;
    try {
      await addDoc(collection(db, "archived_feedbacks"), {
        ...fb,
        archivedAt: new Date(),
      });
      await deleteDoc(doc(db, "feedbacks", id));
      Swal.fire({ icon: "success", title: "Archived", timer: 1400, showConfirmButton: false });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Failed to archive", text: e?.message || "" });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        {/* Header with Archived link on the right */}
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-3xl font-semibold text-gray-800">
            Feedbacks — <span className="text-blue-600">{eventName}</span>
          </h1>

          <button
            onClick={() =>
              navigate(`/admin/archived-feedbacks/${eventId}`, {
                state: { eventName },
              })
            }
            className="px-4 py-2 rounded-full text-sm border bg-white hover:bg-gray-100 text-gray-700 shadow-sm"
            title="View archived feedbacks"
          >
            Archived Feedbacks
          </button>
        </div>

        {/* Page average */}
        <p className="text-gray-500 mb-6">
          Average Rating:{" "}
          <span className="font-semibold text-gray-700">
            {pageAvg} <span className="text-yellow-500">★</span>
          </span>
        </p>

        {/* Filters with visible counters */}
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

        {/* Cards grid */}
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            No feedbacks in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((fb) => (
              <FeedbackCard
                key={fb.id}
                fb={fb}
                questions={questions}
                onArchive={() => handleArchive(fb.id, fb)}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">
          NOTE: VADER not integrated yet. Questions load from <code>{EVENT_Q_COLLECTION}</code>.
        </p>
      </div>
    </div>
  );
}
