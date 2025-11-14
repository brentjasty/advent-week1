import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, orderBy, query, doc, getDoc } from "firebase/firestore";

export default function AttendanceLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [filtered, setFiltered] = useState([]);

  // ✅ Fetch Attendance Logs
  useEffect(() => {
    const qRef = query(collection(db, "attendanceLogs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(qRef, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          let studentID = data.studentID || "—";

          if ((!studentID || studentID === "—") && data.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.userId));
              if (userDoc.exists()) {
                studentID = userDoc.data().idNumber || "—";
              }
            } catch {
              studentID = "—";
            }
          }

          return { id: d.id, ...data, studentID };
        })
      );
      setLogs(list);
    });

    return () => unsub();
  }, []);

  // ✅ Format Timestamps
  const fmtDate = (ts) => {
    try {
      if (!ts) return "—";
      const date = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  };

  // ✅ Filters
  useEffect(() => {
    let results = logs;
    const term = search.toLowerCase();

    if (term) {
      results = results.filter(
        (l) =>
          l.studentID?.toString().toLowerCase().includes(term) ||
          l.email?.toLowerCase().includes(term)
      );
    }

    if (statusFilter === "Validated") {
      results = results.filter((l) => l.status === "validated");
    } else if (statusFilter === "Invalidated") {
      results = results.filter((l) => l.status !== "validated");
    }

    setFiltered(results);
  }, [search, logs, statusFilter]);

  // ✅ Summary
  const counts = useMemo(() => {
    const total = logs.length;
    const valid = logs.filter((l) => l.status === "validated").length;
    const invalid = logs.filter((l) => l.status !== "validated").length;
    return { total, valid, invalid };
  }, [logs]);

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">Attendance Logs</h1>
          <div className="text-right text-sm text-gray-600">
            <div>
              Total: <span className="font-semibold text-gray-800">{counts.total}</span>
            </div>
            <div className="text-green-600">Validated: {counts.valid}</div>
            <div className="text-red-600">Invalidated: {counts.invalid}</div>
          </div>
        </div>

        {/* Search Only */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <input
            type="text"
            placeholder="Search by Student ID or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          />
        </div>

        {/* Status Filters */}
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

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-50 text-gray-700 text-sm font-semibold">
              <tr>
                <th className="px-6 py-3 text-left">Student ID</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {log.studentID || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {log.email || "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {fmtDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
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
                    colSpan="4"
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
          * This table updates in real-time as users validate attendance from the mobile app.
        </p>
      </div>
    </div>
  );
}
