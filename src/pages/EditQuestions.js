import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import Swal from "sweetalert2";

function EditQuestions() {
  const { eventId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");

  // Fetch questions for this event
  useEffect(() => {
    if (!eventId) return;
    const q = query(
      collection(db, "questions"),
      where("eventId", "==", eventId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [eventId]);

  // Add new question
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      await addDoc(collection(db, "questions"), {
        eventId,
        text: newQuestion.trim(),
        createdAt: new Date(),
      });

      setNewQuestion("");
      Swal.fire({
        icon: "success",
        title: "Added",
        text: "New question added successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to add question", "error");
    }
  };

  // Delete question
  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete this question?",
      text: "This cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
    });
    if (!confirm.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "questions", id));
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete question", "error");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-poppins">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 p-10 overflow-y-auto">
        {/* Header */}
        <h1 className="text-3xl font-semibold text-gray-800 mb-8">
          Edit Questions
        </h1>

        {/* Add New Question */}
        <form
          onSubmit={handleAdd}
          className="bg-white shadow-md rounded-xl p-6 mb-8 flex gap-4"
        >
          <input
            type="text"
            placeholder="Enter a new question..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md transition"
          >
            Add
          </button>
        </form>

        {/* Questions List */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <table className="min-w-full text-left text-gray-700">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-6 py-3 text-sm font-medium">Question</th>
                <th className="px-6 py-3 text-sm font-medium text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {questions.length ? (
                questions.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">{q.text}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="2"
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No questions yet. Add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EditQuestions;
