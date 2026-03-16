"use client";

import { useState } from "react";
import axios from "axios";
import { Search, Loader2, Gamepad2, ArrowRight, Check, X, LogOut, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Home() {
  const [user, userLoading] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    setSearchResults([]);
    setSelectedGame(null);
    try {
      const resp = await axios.get(`/api/steam/search?it=${encodeURIComponent(searchTerm)}`);
      setSearchResults(resp.data.items || []);
    } catch (err) {
      console.error(err);
      setMessage({ text: "Erreur de recherche Steam", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const selectGame = async (game: any) => {
    setLoading(true);
    try {
      const resp = await axios.get(`/api/steam/details?appId=${game.id}`);
      setSelectedGame({ ...resp.data, appId: game.id });
      setSearchResults([]);
      setSearchTerm("");
    } catch (err) {
      console.error(err);
      setMessage({ text: "Erreur lors de la récupération des détails", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedGame || !downloadLink) return;
    setIsUploading(true);
    try {
      const gameToUpload = {
        ...selectedGame,
        dl: [downloadLink],
        size: selectedGame.size || "Non spécifié",
      };
      delete gameToUpload.appId;

      await axios.post("/api/games/add", gameToUpload);
      setMessage({ text: "Jeu ajouté au catalogue.", type: "success" });
      setSelectedGame(null);
      setSearchTerm("");
      setDownloadLink("");
    } catch (err) {
      console.error(err);
      setMessage({ text: "Erreur d'ajout", type: "error" });
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin opacity-50" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center space-y-8"
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/10">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-white">Administration</h1>
            <p className="text-slate-500 text-sm">Identifiez-vous pour gérer le catalogue.</p>
          </div>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="btn-clean w-full">
            Connexion Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-300 pb-20">
      {/* Minimal Header */}
      <header className="max-w-3xl mx-auto px-6 h-24 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-black" />
          </div>
          <span className="font-semibold text-white tracking-tight">SROFF</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-400 hidden sm:block">{user.email}</span>
          <button onClick={() => signOut(auth)} className="text-slate-500 hover:text-white transition-colors" title="Déconnexion">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
          
          {/* Header Text */}
          <div>
            <h2 className="text-3xl font-semibold text-white mb-3">Ajouter une entrée</h2>
            <p className="text-slate-500">Renseignez le lien source et recherchez la fiche Steam correspondante.</p>
          </div>

          {!selectedGame && (
            <div className="space-y-8">
              {/* Input Section */}
              <div className="space-y-4">
                <div className="relative">
                  <Link2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="url" 
                    placeholder="Lien de téléchargement (ex: 1fichier, gofile...)" 
                    value={downloadLink}
                    onChange={(e) => setDownloadLink(e.target.value)}
                    className="input-clean w-full py-5 pr-6 pl-14 text-lg"
                  />
                </div>

                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Titre du jeu sur Steam..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-clean w-full py-5 pl-14 pr-32 text-lg"
                  />
                  <button 
                    type="submit" 
                    disabled={loading || !searchTerm}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn-clean py-2 px-6 text-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Chercher"}
                  </button>
                </form>
              </div>

              {/* Seamless Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-2 mb-4">Résultats Steam</p>
                    {searchResults.map((game) => (
                      <button 
                        key={game.id} 
                        onClick={() => selectGame(game)}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
                      >
                        <img src={game.tiny_image} className="w-16 h-12 object-cover rounded-lg bg-white/10" alt="" />
                        <div className="flex-1">
                          <p className="text-white font-medium group-hover:text-white transition-colors">{game.name}</p>
                          <p className="text-xs text-slate-500 mt-1">AppID: {game.id}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors mr-4" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Selected Game Preview */}
          <AnimatePresence>
             {selectedGame && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="card-clean overflow-hidden"
                >
                  <div className="relative h-[240px]">
                    <img src={selectedGame.image} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                    <button 
                      onClick={() => setSelectedGame(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                       <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-3xl font-bold text-white mb-2">{selectedGame.title}</h3>
                      <div className="flex gap-2">
                        {selectedGame.categories.slice(0, 3).map((c: string) => (
                          <span key={c} className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-medium text-white uppercase tracking-wider">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                     <div>
                       <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Synopsis</p>
                       <p className="text-slate-300 leading-relaxed text-sm">
                         {selectedGame.description || "Aucune description fournie par Steam."}
                       </p>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Taille Estimée</p>
                          <input 
                            type="text" 
                            className="bg-transparent text-white font-medium w-full outline-none"
                            placeholder="ex: 60 Go"
                            value={selectedGame.size}
                            onChange={(e) => setSelectedGame({...selectedGame, size: e.target.value})}
                          />
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl flex flex-col justify-center">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mode En Ligne</p>
                            <button 
                              onClick={() => setSelectedGame({...selectedGame, online: !selectedGame.online})}
                              className={`w-10 h-6 rounded-full relative transition-colors ${selectedGame.online ? 'bg-white' : 'bg-white/20'}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${selectedGame.online ? 'left-5' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>
                     </div>

                     <div className="pt-4 flex gap-4">
                        <button 
                          onClick={() => setSelectedGame(null)}
                          className="btn-ghost flex-1 py-4 text-center justify-center"
                        >
                          Annuler
                        </button>
                        <button 
                          onClick={handleUpload}
                          disabled={isUploading || !downloadLink}
                          className="btn-clean flex-[2] py-4 text-center justify-center text-lg"
                        >
                          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publier"}
                        </button>
                     </div>
                  </div>
                </motion.div>
             )}
          </AnimatePresence>

        </motion.div>
      </main>

      {/* Minimal Toast */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-10 left-1/2 flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium shadow-2xl ${
              message.type === 'success' ? 'bg-white text-black' : 'bg-red-500 text-white'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
