import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
  getDocs,
  where,
  limit,
} from "firebase/firestore";

export default function AttendanceLogs() {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [ready, setReady] = useState(false); // ⭐ prevents loading logs too early

  /* -----------------------------------------------------
     LOAD EVENTS + AUTO-SELECT CURRENT EVENT
  ----------------------------------------------------- */
  useEffect(() => {
    async function loadEvents() {
      const snap = await getDocs(collection(db, "events"));
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setEvents(list);
    }
    loadEvents();

    // Listen for the current event REALTIME
    const qRef = query(
      collection(db, "events"),
      where("isCurrent", "==", true),
      limit(1)
    );

    const unsub = onSnapshot(qRef, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const ce = { id: d.id, title: d.data().title };

        setCurrentEvent(ce);

        // ⭐ Ensure we DEFAULT to CURRENT EVENT when page opens
        setSelectedEvent(ce.id);
      } else {
        // no current event → fallback
        setSelectedEvent("All");
      }

      // ⭐ now ready to load logs
      setReady(true);
    });

    return () => unsub();
  }, []);

  /* -----------------------------------------------------
     LOAD ATTENDANCE LOGS (after currentEvent is ready)
  ----------------------------------------------------- */
  useEffect(() => {
    if (!ready || selectedEvent == null) return; // ⭐ prevent early "All logs" loading

    let qRef = null;

    if (selectedEvent === "All") {
      qRef = query(collection(db, "attendanceLogs"), orderBy("timestamp", "desc"));
    } else {
      qRef = query(
        collection(db, "attendanceLogs"),
        where("eventId", "==", selectedEvent),
        orderBy("timestamp", "desc")
      );
    }

    const unsub = onSnapshot(qRef, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          let studentID = data.studentID || "—";
          let studentName = data.studentName || "—";

          // fetch from users collection
          if (data.userId) {
            try {
              const ref = doc(db, "users", data.userId);
              const userDoc = await getDoc(ref);
              if (userDoc.exists()) {
                const ud = userDoc.data();
                studentID = ud.idNumber || ud.studentID || studentID;

                studentName =
                  ud.displayName ??
                  `${ud.firstName ?? ""} ${ud.surname ?? ""}`.trim() ??
                  ud.fullName ??
                  "User";
              }
            } catch {}
          }

          return { id: d.id, ...data, studentID, studentName };
        })
      );

      setLogs(list);
    });

    return () => unsub();
  }, [ready, selectedEvent]); // ⭐ load only when ready

  /* -----------------------------------------------------
     FORMAT DATE
  ----------------------------------------------------- */
  const fmtDate = (ts) => {
    if (!ts) return "—";
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  /* -----------------------------------------------------
     SEARCH + STATUS FILTER
  ----------------------------------------------------- */
  useEffect(() => {
    let results = logs;
    const term = search.toLowerCase();

    if (term) {
      results = results.filter(
        (l) =>
          l.studentID.toLowerCase().includes(term) ||
          l.studentName.toLowerCase().includes(term) ||
          l.email?.toLowerCase().includes(term)
      );
    }

    if (statusFilter === "Validated") {
      results = results.filter((l) => l.status === "validated");
    } else if (statusFilter === "Invalidated") {
      results = results.filter((l) => l.status !== "validated");
    }

    setFiltered(results);
  }, [logs, search, statusFilter]);

  /* -----------------------------------------------------
     SUMMARY COUNTS
  ----------------------------------------------------- */
  const counts = useMemo(() => {
    return {
      total: logs.length,
      valid: logs.filter((l) => l.status === "validated").length,
      invalid: logs.filter((l) => l.status !== "validated").length,
    };
  }, [logs]);

  /* -----------------------------------------------------
     DROPDOWN OPTIONS
  ----------------------------------------------------- */
  const eventOptions = [];

  if (currentEvent) {
    eventOptions.push({
      id: currentEvent.id,
      title: `⭐・${currentEvent.title}`,
      isCurrent: true,
    });
  }

  eventOptions.push({ id: "All", title: "All Events" });

  events.forEach((ev) => {
    if (!currentEvent || ev.id !== currentEvent.id) {
      eventOptions.push({ id: ev.id, title: ev.title });
    }
  });

  /* -----------------------------------------------------
     UI
  ----------------------------------------------------- */
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Loading attendance logs...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">Attendance Logs</h1>

          <div className="text-right text-sm text-gray-600">
            <div>
              Total: <span className="font-semibold">{counts.total}</span>
            </div>
            <div className="text-green-600">Validated: {counts.valid}</div>
            <div className="text-red-600">Invalidated: {counts.invalid}</div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">

          {/* EVENT DROPDOWN */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-4 py-3 rounded-lg border bg-white shadow-sm"
          >
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id} style={ev.isCurrent ? { fontWeight: "bold" } : {}}>
                {ev.title}
              </option>
            ))}
          </select>

          {/* SEARCH */}
          <input
            type="text"
            placeholder="Search Student ID, Name, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border shadow-sm"
          />
        </div>

        {/* STATUS FILTER BUTTONS */}
        <div className="flex space-x-3 mb-6">
          {["All", "Validated", "Invalidated"].map((type) => (
            <button
              key={type}
              onClick={() => setStatusFilter(type)}
              className={`px-5 py-2 rounded-lg font-medium border transition ${
                statusFilter === type
                  ? "bg-yellow-400 text-white border-yellow-400"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50 text-gray-700 text-sm font-semibold">
              <tr>
                {selectedEvent === "All" && <th className="px-6 py-3 text-left">Event</th>}
                <th className="px-6 py-3 text-left">Student ID</th>
                <th className="px-6 py-3 text-left">Student Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    {selectedEvent === "All" && (
                      <td className="px-6 py-3">
                        {events.find((e) => e.id === log.eventId)?.title || "—"}
                      </td>
                    )}

                    <td className="px-6 py-3">{log.studentID}</td>
                    <td className="px-6 py-3">{log.studentName}</td>
                    <td className="px-6 py-3">{log.email || "—"}</td>
                    <td className="px-6 py-3">{fmtDate(log.timestamp)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          log.status === "validated"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.status === "validated" ? "Validated" : "Invalidated"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={selectedEvent === "All" ? 6 : 5}
                    className="px-6 py-10 text-center text-gray-500 italic"
                  >
                    No attendance logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          * This table updates in real-time based on attendance submissions.
        </p>
      </div>
    </div>
  );
}
