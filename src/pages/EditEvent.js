// src/pages/EditEvent.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");

  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  /* 🔥 Fetch event data */
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const ref = doc(db, "events", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          showNotification("Event not found.", "error");
          navigate("/admin/manage-events");
          return;
        }

        const data = snap.data();

        setTitle(data.title || "");
        setLocation(data.location || "");
        setLatitude(data.latitude?.toString() || "");
        setLongitude(data.longitude?.toString() || "");
        setRadius(data.radius?.toString() || "");
        setDate(data.date || "");
        setDescription(data.description || "");

        // ⭐ FIXED: Load time ACCURATELY without timezone shifting
        if (data.startAt) {
          const d = new Date(data.startAt);
          const hrs = d.getHours().toString().padStart(2, "0");
          const mins = d.getMinutes().toString().padStart(2, "0");
          setStartTime(`${hrs}:${mins}`);
        }

        if (data.endAt) {
          const d = new Date(data.endAt);
          const hrs = d.getHours().toString().padStart(2, "0");
          const mins = d.getMinutes().toString().padStart(2, "0");
          setEndTime(`${hrs}:${mins}`);
        }
      } catch (error) {
        console.error(error);
        showNotification("Failed to fetch event data.", "error");
      }
    };

    fetchEvent();
  }, [id, navigate]);

  /* 🔥 Update Event */
  const handleUpdateEvent = async (e) => {
    e.preventDefault();

    try {
      const startAt = new Date(`${date}T${startTime}:00`);
      const endAt = new Date(`${date}T${endTime}:00`);

      await updateDoc(doc(db, "events", id), {
        title,
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        date,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        description,
      });

      showNotification("Event updated successfully!");

      setTimeout(() => navigate("/admin/manage-events"), 1200);
    } catch (error) {
      console.error(error);
      showNotification("Failed to update event.", "error");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-poppins">
      <Sidebar />

      <div className="flex-1 flex items-center justify-center p-10 overflow-y-auto relative">
        
        {/* Toast */}
        {notification && (
          <div
            className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-out z-50 ${
              notification.type === "error"
                ? "bg-red-500 text-white"
                : "bg-gray-900 text-white"
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl border border-gray-200">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
            Edit Event
          </h2>

          <form onSubmit={handleUpdateEvent} className="space-y-5">

            {/* TITLE */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Event Title</label>
              <input
                type="text"
                value={title}
                placeholder="Enter event title"
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
              />
            </div>

            {/* LOCATION */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Event Location</label>
              <input
                type="text"
                value={location}
                placeholder="Enter event location"
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
              />
            </div>

            {/* COORDS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  placeholder="8.508802"
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  placeholder="124.602974"
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            {/* RADIUS */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Validation Radius (meters)
              </label>
              <input
                type="number"
                value={radius}
                placeholder="50"
                onChange={(e) => setRadius(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
              />
            </div>

            {/* DATE */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
              />
            </div>

            {/* TIMES (SIDE BY SIDE) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  placeholder="08:00"
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  placeholder="17:00"
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea
                value={description}
                placeholder="Enter event details..."
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                rows="4"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-500 text-white py-3 rounded-md font-semibold hover:bg-yellow-600 transition"
            >
              Update Event
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default EditEvent;
