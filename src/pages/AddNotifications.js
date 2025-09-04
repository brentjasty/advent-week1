// src/pages/AddNotifications.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import Swal from "sweetalert2";

export default function AddNotifications() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Load events live (keep current on top + default select)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.isCurrent === true) - (a.isCurrent === true));
      setEvents(list);

      if (!selectedId) {
        const cur = list.find((e) => e.isCurrent);
        setSelectedId(cur ? cur.id : (list[0]?.id || ""));
      }
    });
    return () => unsub();
  }, [selectedId]);

  // Watch selected event doc live
  useEffect(() => {
    if (!selectedId) return;
    const ref = doc(db, "events", selectedId);
    const unsub = onSnapshot(ref, (d) => setSelectedDoc({ id: d.id, ...d.data() }));
    return () => unsub();
  }, [selectedId]);

  const notifications = useMemo(() => {
    const arr = Array.isArray(selectedDoc?.notifications) ? selectedDoc.notifications : [];
    // sort by createdAt if present (client timestamps)
    return [...arr].sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [selectedDoc]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      Swal.fire("No Event", "Select an event first.", "warning");
      return;
    }
    if (!title.trim() && !body.trim()) {
      Swal.fire("Missing content", "Add a subject or message.", "warning");
      return;
    }

    const ref = doc(db, "events", selectedId);
    // IMPORTANT: use client timestamp for array item (serverTimestamp is not allowed inside arrays)
    const payload = {
      title: title.trim() || undefined,
      body: body.trim() || "",
      createdAt: new Date().toISOString(),
    };

    try {
      // Primary: append via arrayUnion
      await updateDoc(ref, { notifications: arrayUnion(payload) });
      setTitle("");
      setBody("");
      Swal.fire({ icon: "success", title: "Notification added", timer: 1200, showConfirmButton: false });
    } catch (err) {
      // Fallback: read-modify-write with merge
      try {
        const snap = await getDoc(ref);
        const current = Array.isArray(snap.data()?.notifications) ? snap.data().notifications : [];
        await setDoc(
          ref,
          { notifications: [...current, payload] },
          { merge: true }
        );
        setTitle("");
        setBody("");
        Swal.fire({
          icon: "success",
          title: "Notification added",
          text: "Saved using a safe fallback write.",
          timer: 1400,
          showConfirmButton: false,
        });
      } catch (err2) {
        console.error("Add notification failed:", err, "Fallback failed:", err2);
        Swal.fire("Error", err2?.message || err?.message || "Failed to add notification.", "error");
      }
    }
  };

  const handleDelete = async (idx) => {
    if (!selectedId) return;
    const ok = await Swal.fire({
      title: "Delete this notification?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      confirmButtonText: "Delete",
    });
    if (!ok.isConfirmed) return;

    try {
      const ref = doc(db, "events", selectedId);
      const snap = await getDoc(ref);
      const arr = Array.isArray(snap.data()?.notifications) ? snap.data().notifications : [];
      const next = arr.filter((_, i) => i !== idx);
      await updateDoc(ref, { notifications: next });
      Swal.fire({ icon: "success", title: "Deleted", timer: 900, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err?.message || "Failed to delete notification.", "error");
    }
  };

  const handleClearAll = async () => {
    if (!selectedId || notifications.length === 0) return;
    const ok = await Swal.fire({
      title: "Clear ALL notifications?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      confirmButtonText: "Clear all",
    });
    if (!ok.isConfirmed) return;

    try {
      await updateDoc(doc(db, "events", selectedId), { notifications: [] });
      Swal.fire({ icon: "success", title: "Cleared", timer: 900, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err?.message || "Failed to clear notifications.", "error");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Add Notifications</h1>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100 text-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Event picker */}
        <div className="bg-white rounded-xl shadow p-5 mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Event{" "}
            {selectedDoc?.isCurrent && (
              <span className="ml-2 text-xs text-emerald-600 font-semibold">CURRENT</span>
            )}
          </label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="" disabled>-- Select an event --</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title || "Untitled"} {ev.isCurrent ? "• (Current)" : ""}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
            {selectedDoc?.location && <span>Location: {selectedDoc.location}</span>}
            {selectedDoc?.date && <span>Date: {selectedDoc.date}</span>}
          </div>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-5 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Create Notification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Subject (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded-md px-3 py-2 w-full md:col-span-1"
            />
            <input
              type="text"
              placeholder="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="border rounded-md px-3 py-2 w-full md:col-span-2"
              required
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              disabled={!selectedId}
              title={!selectedId ? "Select an event first" : ""}
            >
              Add Notification
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              disabled={!selectedId || notifications.length === 0}
            >
              Clear All
            </button>
          </div>
        </form>

        {/* Existing notifications */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Existing Notifications</h2>
          {!selectedId ? (
            <p className="text-gray-500">Select an event to view notifications.</p>
          ) : notifications.length === 0 ? (
            <p className="text-gray-500">No notifications for this event.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n, idx) => (
                <li key={idx} className="border rounded-lg p-3 flex items-start justify-between gap-4">
                  <div>
                    {n.title && (
                      <p className="font-semibold text-gray-800 mb-0.5">Subject: {n.title}</p>
                    )}
                    <p className="text-gray-700">{n.body || ""}</p>
                    {n.createdAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-5">
          Mobile reads notifications from each event’s <code>notifications</code> array. Mark one event as{" "}
          <strong>Current</strong> in Manage Events for it to show in the app.
        </p>
      </div>
    </div>
  );
}
