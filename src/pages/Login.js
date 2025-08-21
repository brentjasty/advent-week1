import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { collection, getDocs, query, where } from "firebase/firestore";

// Import images
import userIcon from "../assets/images/user.png";
import passwordIcon from "../assets/images/password.png";
import logo from "../assets/images/logo.png";

const MySwal = withReactContent(Swal);

function Login() {
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Hardcoded Admin
    if (idNumber === "admin" && password === "admin123") {
      MySwal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Admin login successful!",
        showConfirmButton: false,
        timer: 3000,
      });
      navigate("/admin/dashboard");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("idNumber", "==", idNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Details incorrect");
      }

      const userData = querySnapshot.docs[0].data();
      await signInWithEmailAndPassword(auth, userData.email, password);

      MySwal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Login successful!",
        showConfirmButton: false,
        timer: 3000,
      });

      navigate("/user/dashboard");
    } catch (error) {
      MySwal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: `Login Failed: ${error.message}`,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  return (
    <div className="flex h-screen font-poppins">
      {/* Left: Login Form (30%) */}
      <div className="w-[30%] bg-[#1c2239] flex justify-center items-center p-8">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          {/* ID Number */}
          <div className="relative">
            <img
              src={userIcon}
              alt="ID Icon"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-70"
            />
            <input
              type="text"
              placeholder="Admin Details"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
              className="w-full pl-10 p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <img
              src={passwordIcon}
              alt="Password Icon"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-70"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-md hover:bg-yellow-500 transition"
          >
            Login
          </button>
        </form>
      </div>

      {/* Right: Branding (70%) */}
      <div className="w-[70%] bg-[#0d1736] flex flex-col items-center justify-center text-[#55aaff]">
        {/* Bigger Logo */}
        <img src={logo} alt="ADVENT Logo" className="w-48 mb-0" />

        {/* Brand Name */}
        <h1 className="text-7xl font-bold font-cinzel">ADVENT</h1>

        {/* Shorter Line Under Brand */}
        <hr className="border-[#55aaff] w-1/3 my-1" />

        <p className="uppercase tracking-wide text-center mt-2">
          Your Presence and Voice Matters
        </p>
      </div>
    </div>
  );
}

export default Login;
