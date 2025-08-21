import React from "react";
import { useNavigate } from "react-router-dom";

// Import icons
import logo from "../assets/images/logo.png";
import dashboardIcon from "../assets/images/dashboard.png";
import manageEventsIcon from "../assets/images/manage_events.png";
import archiveIcon from "../assets/images/archive.png";
import addEventsIcon from "../assets/images/add_events.png";

function Sidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 h-screen bg-sidebar text-white flex flex-col">
      {/* Logo Section */}
      <div className="flex flex-col items-center mt-12 mb-6">
        <img src={logo} alt="Logo" className="w-41 h-41 mb-4" />
        <h2 className="text-4xl font-bold uppercase font-cinzel tracking-wide">
          ADVENT
        </h2>
      </div>

      {/* Menu Section */}
      <ul className="flex-1 w-full mt-6 font-poppins">
        <li
          className="flex items-center gap-3 px-6 py-3 cursor-pointer transition hover:bg-gray-700/50"
          onClick={() => navigate("/admin/dashboard")}
        >
          <img src={dashboardIcon} alt="Dashboard" className="w-6 h-6" />
          <span>Dashboard</span>
        </li>

        <li
          className="flex items-center gap-3 px-6 py-3 cursor-pointer transition hover:bg-gray-700/50"
          onClick={() => navigate("/admin/manage-events")}
        >
          <img src={manageEventsIcon} alt="Manage Events" className="w-6 h-6" />
          <span>Manage Events</span>
        </li>

        <li
          className="flex items-center gap-3 px-6 py-3 cursor-pointer transition hover:bg-gray-700/50"
          onClick={() => navigate("/admin/archived-events")}
        >
          <img src={archiveIcon} alt="Archived Events" className="w-6 h-6" />
          <span>Archived Events</span>
        </li>

        <li
          className="flex items-center gap-3 px-6 py-3 cursor-pointer transition hover:bg-gray-700/50"
          onClick={() => navigate("/admin/add-event")}
        >
          <img src={addEventsIcon} alt="Add Event" className="w-6 h-6" />
          <span>Add Event</span>
        </li>
      </ul>

      {/* Logout Button */}
      <div className="w-full p-6">
        <button
          className="w-full bg-white text-black py-2 rounded-md font-bold hover:bg-gray-200 font-poppins"
          onClick={() => navigate("/login")}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
