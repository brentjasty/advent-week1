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
  orderBy,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import Swal from "sweetalert2";

const USE_SAMPLE_WHEN_EMPTY = true;

const deriveSentimentHeuristic = (fb) => {
  const rating = Number(fb?.rating);
  const text = (fb?.comment || "").toLowerCase();
  const spamWords = ["http://", "https://", "buy now", "promo", "free $$$", "visit my"];
  const isSpam = spamWords.some((w) => text.includes(w)) || fb?.isSpam === true;
  if (isSpam) return "spam";
  if (!Number.isNaN(rating)) {
    if (rating >= 4) return "positive";
    if (rating <= 2) return "negative";
  }
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
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[color] || colors.gray}`}
    >
      {children}
    </span>
  );
};

const FeedbackCard = ({ fb, onRestore }) => {
  const sentiment = (fb?.sentiment || fb?._sentiment || "neutral").toLowerCase();
  const chipColor =
    sentiment === "positive"
      ? "bg-green-100 text-green-700"
      : sentiment === "negative"
      ? "bg-red-100 text-red-700"
      : sentiment === "spam"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">
            {fb?.anonymous ? <em>Anonymous</em> : fb?.userName || fb?.userEmail || "User"}
          </div>
          <div className="text-xs text-gray-400">{fmtDate(fb?.createdAt)}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${chipColor} capitalize`}>
          {sentiment}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold text-gray-800">{fb?.rating ?? "—"}</div>
        <div className="text-yellow-500">★</div>
      </div>

      <div className="text-gray-700">
        {fb?.comment ? fb.comment : <span className="italic text-gray-400">No comment</span>}
      </div>

      {Array.isArray(fb?.answers) && fb.answers.length > 0 && (
        <div className="mt-1 border-t pt-3">
          <div className="text-sm font-medium text-gray-600 mb-2">Question Responses</div>
          <ul className="space-y-1">
            {fb.answers.map((a, idx) => (
              <li key={idx} className="text-sm text-gray-600">
                <span className="font-medium">{a?.question}</span>
                {": "}
                <span>{a?.answer}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <button
          onClick={onRestore}
          className="px-3 py-2 text-sm rounded-md bg-green-500 hover:bg-green-600 text-white transition"
        >
          Restore
        </button>
      </div>
    </div>
  );
};

export default function ArchivedFeedbacks() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [eventName] = useState(location?.state?.eventName || "Event");
  const [feedbacks, setFeedbacks] = useState([]);
  const [active, setActive] = useState("all");

  useEffect(() => {
    if (!eventId) return;
    const qRef = query(
      collection(db, "archived_feedbacks"),
      where("eventId", "==", eventId),
      orderBy("archivedAt", "desc")
    );
    const unsub = onSnapshot(qRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFeedbacks(list);
    });
    return () => unsub();
  }, [eventId]);

  const withSample = useMemo(() => {
    if (feedbacks.length > 0 || !USE_SAMPLE_WHEN_EMPTY) return feedbacks;
    return [
      {
        id: "arch1",
        userName: "Archived User",
        rating: 3,
        comment: "This was a saved feedback.",
        sentiment: "positive",
        createdAt: new Date(),
        archivedAt: new Date(),
      },
    ];
  }, [feedbacks]);

  const enriched = useMemo(
    () =>
      withSample.map((fb) => ({
        ...fb,
        _sentiment: fb?.sentiment || deriveSentimentHeuristic(fb),
      })),
    [withSample]
  );

  const stats = useMemo(() => {
    const ratings = enriched.map((f) => Number(f.rating)).filter((n) => !Number.isNaN(n));
    const avg = ratings.length
      ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2))
      : 0;
    const total = enriched.length;
    const positive = enriched.filter((f) => f._sentiment === "positive").length;
    const negative = enriched.filter((f) => f._sentiment === "negative").length;
    const spam = enriched.filter((f) => f._sentiment === "spam").length;
    return { avg, total, positive, negative, spam };
  }, [enriched]);

  const visible = useMemo(() => {
    if (active === "all") return enriched;
    return enriched.filter((f) => f._sentiment === active);
  }, [active, enriched]);

  const handleRestore = async (id, fb) => {
    const confirm = await Swal.fire({
      title: "Restore this feedback?",
      text: "It will move back to Feedbacks.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1abc9c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, restore",
    });
    if (!confirm.isConfirmed) return;
    try {
      await addDoc(collection(db, "feedbacks"), {
        ...fb,
        restoredAt: new Date(),
      });
      await deleteDoc(doc(db, "archived_feedbacks", id));
      Swal.fire({ icon: "success", title: "Restored", timer: 1400, showConfirmButton: false });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Failed to restore", text: e?.message || "" });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-3xl font-semibold text-gray-800">
            Archived Feedbacks — <span className="text-blue-600">{eventName}</span>
          </h1>
          <button
            onClick={() =>
              navigate(`/admin/event-feedbacks/${eventId}`, { state: { eventName } })
            }
            className="px-4 py-2 rounded-full text-sm border bg-white hover:bg-gray-100 text-gray-700 shadow-sm"
          >
            Back to Feedbacks
          </button>
        </div>

        <p className="text-gray-500 mb-6">
          Average Rating:{" "}
          <span className="font-semibold text-gray-700">
            {stats.avg} <span className="text-yellow-500">★</span>
          </span>
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <Pill active={active === "all"} onClick={() => setActive("all")}>
            All <CountBadge color="gray">{stats.total}</CountBadge>
          </Pill>
          <Pill active={active === "positive"} onClick={() => setActive("positive")}>
            Positive <CountBadge color="green">{stats.positive}</CountBadge>
          </Pill>
          <Pill active={active === "negative"} onClick={() => setActive("negative")}>
            Negative <CountBadge color="red">{stats.negative}</CountBadge>
          </Pill>
          <Pill active={active === "spam"} onClick={() => setActive("spam")}>
            Spam <CountBadge color="yellow">{stats.spam}</CountBadge>
          </Pill>
        </div>

        {visible.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            No archived feedbacks in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((fb) => (
              <FeedbackCard key={fb.id} fb={fb} onRestore={() => handleRestore(fb.id, fb)} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">Showing archived feedbacks.</p>
      </div>
    </div>
  );
}
