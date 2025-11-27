// src/components/admin/NotesTab.jsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getPortalUser } from '../../firebase/firestore'; 
import { Send, MessageSquare, Clock, Loader2 } from 'lucide-react';

export function NotesTab({ companyId, applicationId, collectionName = 'applications' }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function init() {
        setLoading(true);
        try {
            // 1. Fetch Notes from correct collection
            const notesRef = collection(db, "companies", companyId, collectionName, applicationId, "internal_notes");
            const q = query(notesRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            const fetchedNotes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotes(fetchedNotes);

            // 2. Get Author Name
            if (auth.currentUser) {
                const userProfile = await getPortalUser(auth.currentUser.uid);
                setCurrentUser(userProfile ? userProfile.name : 'Admin');
            }
        } catch (e) {
            console.error("Error loading notes:", e);
        } finally {
            setLoading(false);
        }
    }
    init();
  }, [companyId, applicationId, collectionName]);

  const handleSend = async (e) => {
      e.preventDefault();
      if (!newNote.trim()) return;

      setSending(true);
      try {
          const notesRef = collection(db, "companies", companyId, collectionName, applicationId, "internal_notes");
          await addDoc(notesRef, {
              text: newNote,
              author: currentUser,
              createdAt: serverTimestamp(),
              type: 'note'
          });
          
          // Optimistic update
          const optimisticNote = {
              id: Date.now().toString(),
              text: newNote,
              author: currentUser,
              createdAt: { seconds: Date.now() / 1000 }, 
              type: 'note'
          };
          setNotes([optimisticNote, ...notes]);
          setNewNote('');
      } catch (error) {
          console.error("Failed to add note:", error);
          alert("Failed to save note.");
      } finally {
          setSending(false);
      }
  };

  return (
    <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Internal Note (Private)</label>
            <form onSubmit={handleSend}>
                <textarea 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows="3"
                    placeholder="Log a call, interview notes, or reason for rejection..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                ></textarea>
                <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                        <ShieldIcon size={12} /> Visible only to team
                    </p>
                    <button 
                        type="submit" 
                        disabled={!newNote.trim() || sending}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                        {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        Add Note
                    </button>
                </div>
            </form>
        </div>

        <div className="space-y-4">
            {loading ? (
                <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-gray-400"/></div>
            ) : notes.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <MessageSquare className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-gray-500 text-sm">No notes yet.</p>
                </div>
            ) : (
                notes.map(note => (
                    <div key={note.id} className="flex gap-3">
                        <div className="mt-1 flex-shrink-0">
                             <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                 {note.author ? note.author.charAt(0).toUpperCase() : 'A'}
                             </div>
                        </div>
                        <div className="flex-1 bg-gray-50 p-3 rounded-lg rounded-tl-none border border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-gray-700">{note.author || 'Unknown'}</span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Clock size={10} />
                                    {note.createdAt?.seconds 
                                        ? new Date(note.createdAt.seconds * 1000).toLocaleString() 
                                        : 'Just now'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}

function ShieldIcon({size}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 11h.01"/></svg>
    )
}