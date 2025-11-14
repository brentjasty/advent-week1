import React, { useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import Sidebar from "../components/Sidebar";

function AddEvent() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const [modalType, setModalType] = useState(null); // "error" | "success"
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const closeModal = () => {
    setModalType(null);
    setModalMessage("");
    setModalTitle("");
  };

  const openModal = (type, title, message) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();

    if (!title || !location || !latitude || !longitude || !radius || !date) {
      openModal("error", "Missing Fields", "Please fill in all required fields.");
      return;
    }

    try {
      const eventRef = doc(collection(db, "events"));

      await setDoc(eventRef, {
        title,
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        date,
        description,
        feedbackOpen: false,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "event_questions", eventRef.id), {
        eventId: eventRef.id,
        questions: [],
        openEnded: [],
        createdAt: serverTimestamp(),
      });

      // Show success modal
      openModal("success", "Event Added", `${title} has been added successfully!`);

      // Reset input fields
      setTitle("");
      setLocation("");
      setLatitude("");
      setLongitude("");
      setRadius("");
      setDate("");
      setDescription("");
    } catch (error) {
      openModal("error", "Failed to Add Event", error.message);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-poppins">
      <Sidebar />

      <div className="flex-1 flex items-center justify-center p-10 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl border border-gray-200">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
            Add New Event
          </h2>

          <form onSubmit={handleAddEvent} className="space-y-5">
            {/* Event Title */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Event Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Event Location */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Event Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter event location"
                required
              />
            </div>

            {/* Latitude + Longitude */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="8.508802"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="124.602974"
                  required
                />
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Validation Radius (meters)
              </label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="50"
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
              <label className="block text-sm text-gray-600 mb-1">Description</label>
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
              className="w-full bg-gray-700 text-white py-3 rounded-md font-semibold hover:bg-gray-600 transition"
            >
              Add Event
            </button>
          </form>
        </div>
      </div>

      {/* MODAL ALERT */}
      {modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="bg-white w-96 p-6 rounded-xl shadow-2xl text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">{modalTitle}</h3>
            <p className="text-gray-600 mb-6">{modalMessage}</p>

            <button
              onClick={closeModal}
              className={`px-4 py-2 rounded-md font-medium text-white ${
                modalType === "success"
                  ? "bg-gray-700 hover:bg-gray-800"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddEvent;
