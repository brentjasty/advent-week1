import React from "react";
import Sidebar from "../components/Sidebar";

function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto">
        {/* Header */}
        <h1 className="text-3xl font-semibold mb-10 text-gray-800">
          Welcome back, <span className="text-blue-600">Admin!</span>
        </h1>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Current Event */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              Current Event
            </h2>
            <p className="text-gray-500">General Assembly</p>
            <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
              View Event Analytics
            </button>
          </div>

          {/* Total Feedback */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              Total Feedback
            </h2>
            <p className="text-4xl font-bold text-blue-600">43</p>
          </div>

          {/* Total Check-in */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              Total Check-in
            </h2>
            <p className="text-4xl font-bold text-blue-600">213</p>
            <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
              View Attendance Logs
            </button>
          </div>

          {/* Valid Check-ins */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              Valid Check-ins
            </h2>
            <p className="text-4xl font-bold text-blue-600">204</p>
          </div>

          {/* Invalid Check-ins */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              Invalid Check-ins
            </h2>
            <p className="text-4xl font-bold text-blue-600">9</p>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              Notifications
            </h2>
            <button className="mt-2 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
              Add Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
