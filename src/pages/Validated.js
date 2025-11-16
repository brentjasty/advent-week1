import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
  where,
  limit,
} from "firebase/firestore";

export default function Validated() {
  const [validatedUsers, setValidatedUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("All");

  const [search, setSearch] = useState("");

  /* -------------------------------------------
     LOAD EVENTS + CURRENT EVENT
  ------------------------------------------- */
  useEffect(() => {
    async function loadEvents() {
      const snap = await getDocs(collection(db, "events"));
      const list = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "Untitled Event",
      }));
      setEvents(list);
    }
    loadEvents();

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
        setSelectedEvent(ce.id); // ⭐ Auto-select current event
      } else {
        setSelectedEvent("All");
      }
    });

    return () => unsub();
  }, []);

  /* -------------------------------------------
     REAL-TIME VALIDATED STUDENTS (LATEST ONLY)
  ------------------------------------------- */
  useEffect(() => {
    const qRef = query(collection(db, "attendanceLogs"), orderBy("timestamp", "desc"));

    const unsub = onSnapshot(qRef, async (snap) => {
      const latestMap = new Map();

      for (const docSnap of snap.docs) {
        const data = docSnap.data();

        const studentID = data.studentID || "—";
        const eventId = data.eventId || "none";

        const key = `${eventId}_${studentID}`;

        if (!latestMap.has(key)) {
          latestMap.set(key, { id: docSnap.id, ...data });
        }
      }

      // VALIDATED ONLY
      const validList = Array.from(latestMap.values()).filter(
        (d) => d.status === "validated"
      );

      // Merge USERS data
      const finalList = await Promise.all(
        validList.map(async (d) => {
          let studentID = d.studentID || "—";
          let studentName = d.studentName || "—";

          if (d.userId) {
            try {
              const ref = doc(db, "users", d.userId);
              const snap = await getDoc(ref);

              if (snap.exists()) {
                const ud = snap.data();

                studentID = ud.idNumber || ud.studentID || studentID;

                studentName =
                  ud.displayName ??
                  `${ud.firstName ?? ""} ${ud.surname ?? ""}`.trim() ??
                  ud.fullName ??
                  "User";
              }
            } catch {}
          }

          return { ...d, studentID, studentName };
        })
      );

      setValidatedUsers(finalList);
    });

    return () => unsub();
  }, []);

  /* -------------------------------------------
     DATE FORMATTER
  ------------------------------------------- */
  const fmtDate = (ts) => {
    if (!ts) return "—";
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  /* -------------------------------------------
     SEARCH + EVENT FILTER
  ------------------------------------------- */
  useEffect(() => {
    let results = validatedUsers;

    if (selectedEvent !== "All") {
      results = results.filter((u) => u.eventId === selectedEvent);
    }

    const term = search.toLowerCase();
    if (term) {
      results = results.filter(
        (u) =>
          u.studentID?.toLowerCase().includes(term) ||
          u.studentName?.toLowerCase().includes(term) ||
          (u.email || "—").toLowerCase().includes(term)
      );
    }

    setFiltered(results);
  }, [search, selectedEvent, validatedUsers]);

  const count = useMemo(() => filtered.length, [filtered]);

  /* -------------------------------------------
     DROPDOWN OPTIONS
  ------------------------------------------- */
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

  /* -------------------------------------------
     UI
  ------------------------------------------- */
  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-gray-800">Validated Students</h1>
          <p className="text-green-600 font-semibold text-lg">
            Total: <span className="text-gray-800">{count}</span>
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-6">

          {/* EVENT DROPDOWN */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-4 py-3 rounded-lg border bg-white text-gray-700 w-full md:w-1/3"
          >
            {eventOptions.map((ev) => (
              <option
                key={ev.id}
                value={ev.id}
                style={ev.isCurrent ? { fontWeight: "bold" } : {}}
              >
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
            className="px-4 py-3 rounded-lg border bg-white focus:ring-yellow-400 w-full mt-4 md:mt-0"
          />
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-50 text-gray-700 text-sm font-semibold">
              <tr>
                {selectedEvent === "All" && (
                  <th className="px-6 py-3 text-left">Event</th>
                )}
                <th className="px-6 py-3 text-left">Student ID</th>
                <th className="px-6 py-3 text-left">Student Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Last Updated</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50 transition">
                    {selectedEvent === "All" && (
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {events.find((e) => e.id === u.eventId)?.title || "—"}
                      </td>
                    )}

                    <td className="px-6 py-3 text-sm">{u.studentID}</td>
                    <td className="px-6 py-3 text-sm">{u.studentName}</td>
                    <td className="px-6 py-3 text-sm">{u.email || "—"}</td>
                    <td className="px-6 py-3 text-sm">{fmtDate(u.timestamp)}</td>

                    <td className="px-6 py-3">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        VALIDATED
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
                    No validated logs found for this event.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          * Shows only the latest validated status per student per event.
        </p>
      </div>
    </div>
  );
}
