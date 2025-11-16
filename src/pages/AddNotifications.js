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

export default function AddNotifications() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Modal + callback fix
  const [modal, setModal] = useState({
    open: false,
    type: "",
    message: "",
  });
  const [pendingAction, setPendingAction] = useState(null);

  const openModal = (type, message, onConfirm = null) => {
    setModal({ open: true, type, message });
    setPendingAction(() => onConfirm);
  };

  const closeModal = () => {
    setModal({ open: false, type: "", message: "" });
    setPendingAction(null);
  };

  const notifications = useMemo(() => {
    const arr = Array.isArray(selectedDoc?.notifications)
      ? selectedDoc.notifications
      : [];

    return [...arr].sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [selectedDoc]);

  /* Load Events */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.isCurrent === true) - (a.isCurrent === true));

      setEvents(list);

      if (!selectedId) {
        const currentEvent = list.find((e) => e.isCurrent);
        setSelectedId(currentEvent ? currentEvent.id : list[0]?.id || "");
      }
    });

    return () => unsub();
  }, [selectedId]);

  /* Load Selected Event */
  useEffect(() => {
    if (!selectedId) return;

    const ref = doc(db, "events", selectedId);
    const unsub = onSnapshot(ref, (snap) =>
      setSelectedDoc({ id: snap.id, ...snap.data() })
    );

    return () => unsub();
  }, [selectedId]);

  /* ADD NOTIFICATION */
  const confirmAdd = async () => {
    if (!selectedId) return;

    const ref = doc(db, "events", selectedId);

    const payload = {
      title: title.trim() || undefined,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await updateDoc(ref, { notifications: arrayUnion(payload) });
    } catch {
      const snap = await getDoc(ref);
      const arr = Array.isArray(snap.data()?.notifications)
        ? snap.data().notifications
        : [];
      await setDoc(ref, { notifications: [...arr, payload] }, { merge: true });
    }

    setTitle("");
    setBody("");
    closeModal();
  };

  /* Add button */
  const handleAdd = (e) => {
    e.preventDefault();

    if (!selectedId) {
      openModal("warning", "Select an event first.");
      return;
    }

    if (!title.trim() && !body.trim()) {
      openModal("warning", "Please enter a message.");
      return;
    }

    openModal("confirm", "Add this notification?", confirmAdd);
  };

  /* DELETE SINGLE */
  const confirmDelete = async (index) => {
    const ref = doc(db, "events", selectedId);
    const snap = await getDoc(ref);

    const arr = Array.isArray(snap.data()?.notifications)
      ? snap.data().notifications
      : [];

    const next = arr.filter((_, i) => i !== index);

    await updateDoc(ref, { notifications: next });
    closeModal();
  };

  const handleDelete = (index) =>
    openModal("delete", "Delete this notification?", () =>
      confirmDelete(index)
    );

  /* CLEAR ALL */
  const confirmClearAll = async () => {
    await updateDoc(doc(db, "events", selectedId), { notifications: [] });
    closeModal();
  };

  const handleClearAll = () => {
    if (!selectedId || notifications.length === 0) return;
    openModal("delete", "Clear ALL notifications?", confirmClearAll);
  };

  /* UI */
  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />

      <div className="flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">
            Add Notifications
          </h1>

          <button
            onClick={() => navigate("/admin/dashboard")}
            className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100 text-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Event Picker */}
        <div className="bg-white rounded-xl shadow p-5 mb-5">
          <label className="font-medium text-gray-700 text-sm mb-2 block">
            Select Event{" "}
            {selectedDoc?.isCurrent && (
              <span className="text-xs text-green-600 ml-2 font-semibold">
                CURRENT
              </span>
            )}
          </label>

          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full border px-3 py-2 rounded-md"
          >
            <option value="" disabled>
              -- Select an event --
            </option>

            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} {ev.isCurrent ? "• (Current)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Add Notification */}
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Create Notification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Subject (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded-md px-3 py-2"
            />

            <input
              type="text"
              placeholder="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="border rounded-md px-3 py-2 md:col-span-2"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              disabled={!selectedId}
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

        {/* Existing Notifications */}
        <div className="bg-white rounded-xl shadow p-5 mt-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Existing Notifications
          </h2>

          {!selectedId ? (
            <p className="text-gray-500">Select an event first.</p>
          ) : notifications.length === 0 ? (
            <p className="text-gray-500">No notifications available.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n, i) => (
                <li
                  key={i}
                  className="border rounded-lg p-3 flex justify-between items-start"
                >
                  <div>
                    {n.title && (
                      <p className="font-semibold text-gray-800">{n.title}</p>
                    )}
                    <p className="text-gray-700">{n.body}</p>

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(i)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6 text-center">

            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              {modal.type === "confirm"
                ? "Confirm Action"
                : modal.type === "delete"
                ? "Delete"
                : "Notice"}
            </h3>

            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {modal.message}
            </p>

            <div className="flex justify-center gap-4">
              {modal.type !== "warning" && pendingAction && (
                <button
                  onClick={() => pendingAction()}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium px-4 py-2 rounded-md"
                >
                  Confirm
                </button>
              )}

              <button
                onClick={closeModal}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-4 py-2 rounded-md"
              >
                {modal.type === "warning" ? "Okay" : "Cancel"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
