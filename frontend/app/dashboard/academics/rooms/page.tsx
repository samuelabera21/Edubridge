"use client";
import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Plus, Edit2, Trash2, Building, AlertCircle } from "lucide-react";

export default function RoomsPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<any | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const [roomForm, setRoomForm] = useState({
        name: "",
        type: "CLASSROOM",
        capacity: "",
        status: "AVAILABLE",
        description: ""
    });

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        try {
            const res = await fetchApi("/vice-principal/academic/rooms");
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            } else {
                throw new Error("Failed to fetch rooms");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            const url = editingRoom ? `/vice-principal/academic/rooms/${editingRoom.id}` : "/vice-principal/academic/rooms";
            const method = editingRoom ? "PUT" : "POST";
            const res = await fetchApi(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: roomForm.name,
                    type: roomForm.type,
                    capacity: roomForm.capacity ? Number(roomForm.capacity) : null,
                    status: roomForm.status,
                    description: roomForm.description
                })
            });

            if (!res.ok) throw new Error("Failed to save room details");
            
            setIsRoomModalOpen(false);
            setEditingRoom(null);
            setRoomForm({ name: "", type: "CLASSROOM", capacity: "", status: "AVAILABLE", description: "" });
            loadRooms();
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    const handleDeleteRoom = async (id: string) => {
        if (!confirm("Are you sure you want to delete this room?")) return;
        try {
            const res = await fetchApi(`/vice-principal/academic/rooms/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete room");
            loadRooms();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openEditModal = (room: any) => {
        setEditingRoom(room);
        setRoomForm({
            name: room.name,
            type: room.type,
            capacity: room.capacity?.toString() || "",
            status: room.status,
            description: room.description || ""
        });
        setIsRoomModalOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Rooms & Facilities</h1>
                    <p className="text-gray-500 mt-1">Manage classrooms, labs, and other physical spaces.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRoom(null);
                        setRoomForm({ name: "", type: "CLASSROOM", capacity: "", status: "AVAILABLE", description: "" });
                        setIsRoomModalOpen(true);
                    }}
                    className="flex items-center space-x-2 bg-[#006b3f] hover:bg-[#005a34] text-white px-4 py-2 rounded-md transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Room</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading rooms...</div>
                ) : rooms.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <Building className="w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No rooms found</h3>
                        <p>Add classrooms or facilities to start scheduling.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-medium text-gray-600">Name</th>
                                <th className="p-4 font-medium text-gray-600">Type</th>
                                <th className="p-4 font-medium text-gray-600">Capacity</th>
                                <th className="p-4 font-medium text-gray-600">Status</th>
                                <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.map((room) => (
                                <tr key={room.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{room.name}</td>
                                    <td className="p-4 text-gray-600 text-sm">{room.type}</td>
                                    <td className="p-4 text-gray-600 text-sm">{room.capacity || "N/A"}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            room.status === "AVAILABLE" ? "bg-green-100 text-green-800" :
                                            room.status === "MAINTENANCE" ? "bg-yellow-100 text-yellow-800" :
                                            "bg-red-100 text-red-800"
                                        }`}>
                                            {room.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => openEditModal(room)}
                                                className="p-1.5 text-gray-400 hover:text-[#006b3f] hover:bg-green-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRoom(room.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Room Modal */}
            {isRoomModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingRoom ? "Edit Room" : "Add Room"}
                            </h2>
                            <button onClick={() => setIsRoomModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {formError && (
                                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                                    {formError}
                                </div>
                            )}
                            
                            <form id="roomForm" onSubmit={handleSaveRoom} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Name / Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={roomForm.name}
                                        onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                                        placeholder="e.g. Room 101, Science Lab A"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                    <select
                                        value={roomForm.type}
                                        onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                                    >
                                        <option value="CLASSROOM">Regular Classroom</option>
                                        <option value="LAB">Laboratory</option>
                                        <option value="LIBRARY">Library</option>
                                        <option value="SPORTS_FACILITY">Sports Facility</option>
                                        <option value="OTHER">Other Space</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Students)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={roomForm.capacity}
                                        onChange={e => setRoomForm({ ...roomForm, capacity: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                                        placeholder="e.g. 30"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={roomForm.status}
                                        onChange={e => setRoomForm({ ...roomForm, status: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                                    >
                                        <option value="AVAILABLE">Available</option>
                                        <option value="MAINTENANCE">Under Maintenance</option>
                                        <option value="OFFLINE">Offline</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={roomForm.description}
                                        onChange={e => setRoomForm({ ...roomForm, description: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006b3f]"
                                        rows={2}
                                        placeholder="Optional details..."
                                    />
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50 shrink-0 rounded-b-lg">
                            <button
                                type="button"
                                onClick={() => setIsRoomModalOpen(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="roomForm"
                                className="px-4 py-2 text-sm bg-[#006b3f] text-white hover:bg-[#005a34] rounded-md font-medium transition-colors"
                            >
                                Save Room
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
