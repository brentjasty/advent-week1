import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";

export default function Validated() {
  const [validatedUsers, setValidatedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    const qRef = query(collection(db, "attendanceLogs"), orderBy("timestamp", "desc"));

    const unsub = onSnapshot(qRef, async (snap) => {
      const latestMap = new Map();

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const studentID = data.studentID || "—";
        if (!latestMap.has(studentID)) {
          latestMap.set(studentID, { id: docSnap.id, ...data });
        }
      }

      const validatedOnly = Array.from(latestMap.values()).filter(
        (d) => d.status === "validated"
      );

      const list = await Promise.all(
        validatedOnly.map(async (d) => {
          let studentID = d.studentID || "—";
          if ((!studentID || studentID === "—") && d.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", d.userId));
              if (userDoc.exists()) {
                studentID = userDoc.data().idNumber || "—";
              }
            } catch {
              studentID = "—";
            }
          }
          return { id: d.id, ...d, studentID };
        })
      );

      setValidatedUsers(list);
    });

    return () => unsub();
  }, []);

  const fmtDate = (ts) => {
    if (!ts) return "—";
    const date = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const term = search.toLowerCase();
    let results = validatedUsers;

    if (term) {
      results = results.filter(
        (u) =>
          u.studentID?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
      );
    }

    setFiltered(results);
  }, [search, validatedUsers]);

  const count = useMemo(() => filtered.length, [filtered]);

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-10 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">
            Validated Students
          </h1>
          <p className="text-green-600 font-medium">
            Currently Validated:{" "}
            <span className="text-gray-800 font-semibold">{count}</span>
          </p>
        </div>

        <div className="flex mb-6">
          <input
            type="text"
            placeholder="Search by Student ID or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-50 text-gray-700 text-sm font-semibold">
              <tr>
                <th className="px-6 py-3 text-left">Student ID</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Last Updated</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-700">{user.studentID}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{user.email || "—"}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{fmtDate(user.timestamp)}</td>
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
                    colSpan="4"
                    className="px-6 py-10 text-center text-gray-500 italic"
                  >
                    No currently validated students.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          * Updates live — only the latest validated students are shown.
        </p>
      </div>
    </div>
  );
}
