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
  const [description, setDescription] = useState("");
  const [notification, setNotification] = useState(null); // ✅ toast notifications

  // ✅ Helper function to show toasts
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setTitle(data.title || "");
          setLocation(data.location || "");
          setLatitude(data.latitude?.toString() || "");
          setLongitude(data.longitude?.toString() || "");
          setRadius(data.radius?.toString() || "");
          setDate(data.date || "");
          setDescription(data.description || "");
        } else {
          showNotification("Event not found.", "error");
          navigate("/admin/manage-events");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        showNotification("Failed to fetch event data.", "error");
      }
    };

    if (id) fetchEvent();
  }, [id, navigate]);

  const handleUpdateEvent = async (e) => {
    e.preventDefault();

    try {
      await updateDoc(doc(db, "events", id), {
        title,
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        date,
        description,
      });

      showNotification("Event updated successfully!", "success");

      // Delay navigation slightly to let toast show
      setTimeout(() => {
        navigate("/admin/manage-events");
      }, 1200);
    } catch (error) {
      console.error("Error updating event:", error);
      showNotification("Failed to update event.", "error");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-poppins">
      <Sidebar />

      <div className="flex-1 flex items-center justify-center p-10 overflow-y-auto relative">
        {/* ✅ Toast Notification */}
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
            {/* Event Title */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Event Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Event Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter event location"
                required
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="e.g. 8.508802"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="e.g. 124.602974"
                  required
                />
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Validation Radius (in meters)
              </label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="e.g. 50"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                rows="4"
                placeholder="Enter event details..."
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
