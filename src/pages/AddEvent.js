import React, { useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Swal from "sweetalert2";

function AddEvent() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "events"), {
        title,
        location,
        date,
        description,
        createdAt: new Date(),
      });

      Swal.fire({
        icon: "success",
        title: "Event added successfully!",
        timer: 2000,
        showConfirmButton: false,
      });

      setTitle("");
      setLocation("");
      setDate("");
      setDescription("");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to add event",
        text: error.message,
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Add New Event
          </h2>

          <form onSubmit={handleAddEvent} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Event Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Enter event details..."
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition"
            >
              Add Event
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddEvent;
