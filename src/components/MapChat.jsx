// import { useEffect, useRef, useState } from "react";
// import { MessageCircle, X, Send, Paperclip, Camera, Loader2, Share2 } from "lucide-react";
// import { siFacebook, siInstagram, siTiktok, siX } from "simple-icons";
// import { supabase } from "../supabase";
// import { lineTextColors } from "./lineColors";

// const CHAT_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;

// const TUBE_LINES = [
//   "central",
//   "jubilee",
//   "northern",
//   "piccadilly",
//   "victoria",
//   "district",
//   "circle",
//   "metropolitan",
//   "bakerloo",
//   "elizabeth",
//   "great western railway",
// ];

// const MAX_FILE_SIZE = 50 * 1024 * 1024;
// const CHAT_LINE_COLORS = {
//   ...lineTextColors,
//   "great western railway": "#4b1f4f",
// };
// const CHAT_EMOJIS = ["\u2764\ufe0f", "\ud83d\ude02", "\ud83d\ude21", "\ud83d\ude2e", "\ud83d\udc4d", "\ud83d\ude80"];
// const LINKEDIN_ICON = {
//   hex: "0A66C2",
//   path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V8.97h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.316zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM3.555 20.452h3.564V8.97H3.555v11.482zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
// };
// const SOCIAL_SHARE_OPTIONS = [
//   ["X", siX, "https://twitter.com/intent/tweet?text=Join%20TrainLive%20live%20chat&url="],
//   ["Instagram", siInstagram, "https://www.instagram.com/?url="],
//   ["TikTok", siTiktok, "https://www.tiktok.com/upload?lang=en"],
//   ["Facebook", siFacebook, "https://www.facebook.com/sharer/sharer.php?u="],
//   ["LinkedIn", LINKEDIN_ICON, "https://www.linkedin.com/sharing/share-offsite/?url="],
// ];

// export default function MapChat() {
//   const [open, setOpen] = useState(false);
//   const [line, setLine] = useState("central");
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");
//   const [selectedImage, setSelectedImage] = useState(null);
//   const [imagePreview, setImagePreview] = useState("");
//   const [imageError, setImageError] = useState("");
//   const [selectedIsVideo, setSelectedIsVideo] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [shareOpen, setShareOpen] = useState(false);
//   const [flyingEmojis, setFlyingEmojis] = useState([]);
//   const fileInputRef = useRef(null);
//   const cameraInputRef = useRef(null);

//   const handleImageSelection = (event) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
//     const isVideo = file.type.startsWith("video/");

//     if (!isImage && !isVideo) {
//       setImageError("Please select a JPG, PNG, WEBP or video file.");
//       event.target.value = "";
//       return;
//     }

//     if (file.size > MAX_FILE_SIZE) {
//       setImageError("File must be under 50MB.");
//       event.target.value = "";
//       return;
//     }

//     setImageError("");
//     setSelectedImage(file);
//     setSelectedIsVideo(isVideo);
//     setImagePreview(isVideo ? "" : URL.createObjectURL(file));
//     event.target.value = "";
//   };

//   const clearSelectedImage = () => {
//     setSelectedImage(null);
//     setImagePreview("");
//     setImageError("");
//     setSelectedIsVideo(false);
//     if (fileInputRef.current) {
//       fileInputRef.current.value = "";
//     }
//   };

//   const useEmoji = (emoji) => {
//     setText((current) => `${current}${emoji}`);
//     const id = `${Date.now()}-${Math.random()}`;
//     setFlyingEmojis((current) => [...current, { id, emoji, left: 12 + Math.random() * 72 }]);
//     window.setTimeout(() => {
//       setFlyingEmojis((current) => current.filter((item) => item.id !== id));
//     }, 1800);
//   };

//   async function loadMessages() {

//     const { data, error } = await supabase
//       .from("chat_messages")
//       .select("*")
//       .eq("line", line)
//       .gte("created_at", new Date(Date.now() - CHAT_VISIBILITY_WINDOW_MS).toISOString())
//       .order("created_at", { ascending: true });


//     if (error) {
//       console.error(error);
//       return;
//     }


//     setMessages(data || []);

//   }



// useEffect(() => {
//   if (!open) return;

//   loadMessages();
// }, [open, line]);


//    async function sendMessage() {
//     if (sending) return;
//     if (!text.trim() && !selectedImage) return;

//     setSending(true);
//     setImageError("");

//     try {
//       let imageUrl = null;
//       let videoUrl = null;

//     if (selectedImage) {
//         const fileName = `${Date.now()}_${selectedImage.name.replace(/\s+/g, "-")}`;

//         const bucket = selectedImage.type.startsWith("video/")
//           ? "chat-videos"
//           : "chat-images";

//         const { error: uploadError } = await supabase.storage
//           .from(bucket)
//           .upload(fileName, selectedImage, {
//             contentType: selectedImage.type,
//             upsert: false,
//           });

//         if (uploadError) {
//           throw uploadError;
//         }

//         const { data: publicUrlData } = supabase.storage
//           .from(bucket)
//           .getPublicUrl(fileName);

//         if (selectedImage.type.startsWith("video/")) {
//           videoUrl = publicUrlData?.publicUrl || null;
//         } else {
//           imageUrl = publicUrlData?.publicUrl || null;
//         }
//       }

//       const payload = {
//         username: "TrainLive User",
//         message: text.trim(),
//         line,
//         image_url: imageUrl,
//         ...(videoUrl ? { video_url: videoUrl } : {}),
//       };

//       const { data, error } = await supabase
//         .from("chat_messages")
//         .insert(payload)
//         .select()
//         .single();

//       if (error) {
//         throw error;
//       }

//       if (data) {
//         setMessages((prev) => [...prev, data]);
//       }

//       setText("");
//       clearSelectedImage();

//     } catch (error) {
//       console.error("Chat upload/send error:", error);
//       setImageError(error?.message || "Could not send your message.");

//     } finally {
//       setSending(false);
//     }
//   }

//   return (
//     <>
//       {!open && (
//         <button
//           type="button"
//           onClick={() => setOpen(true)}
//           aria-label="Open chatter"
//           className="group flex h-20 w-20 items-center justify-center rounded-full p-1 transition-transform hover:-translate-y-0.5 active:translate-y-0"
//         >
//           <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden">
//             <span className="chatter-icon" aria-hidden="true"><span className="chatter-icon__core">chatter</span></span>
//           </span>
//         </button>
//       )}

//       {open && (
//         <div className="relative fixed bottom-5 right-5 z-[2000] flex h-[min(520px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
//           <div className="flex items-center justify-between bg-white px-4 py-4 text-slate-900 border-b border-slate-200">
//             <div className="flex items-center gap-3">
//               <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden">
//                 <span className="chatter-icon" aria-hidden="true"><span className="chatter-icon__core">chatter</span></span>
//               </span>
//               <div>
//                 <h3 className="text-sm font-bold">chatter</h3>
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={() => setOpen(false)}
//               aria-label="Close chatter"
//               className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
//             >
//               <X size={19} />
//             </button>
//           </div>

//           <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
//             <label htmlFor="chat-line" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
//               Chat channel
//             </label>
//             <select
//               id="chat-line"
//               value={line}
//               onChange={(e) => setLine(e.target.value)}
//               className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium capitalize text-white outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
//               style={{ backgroundColor: CHAT_LINE_COLORS[line] || "#334155" }}
//             >
//               {TUBE_LINES.map((item) => (
//                 <option
//                   key={item}
//                   value={item}
//                   style={{ backgroundColor: CHAT_LINE_COLORS[item] || "#334155", color: "#fff" }}
//                 >
//                   {item} line
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
//             {messages.length === 0 ? (
//               <div className="flex h-full flex-col items-center justify-center px-6 text-center">
//                 <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800">
//                   <MessageCircle size={22} />
//                 </span>
//                 <p className="text-sm font-semibold text-slate-800">Start the conversation</p>
//                 <p className="mt-1 text-xs leading-relaxed text-slate-400">Share a delay, ask a question, or help another passenger.</p>
//               </div>
//             ) : (
//               messages.map((message, index) => (
//                 <div key={message.id || index} className="mb-3 max-w-[88%] rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2.5 last:mb-0">
//                   <p className="mb-1 text-[11px] font-bold text-brand-ink">{message.username}</p>
//                   {message.message && (
//                     <p className="break-words text-sm leading-relaxed text-slate-700">{message.message}</p>
//                   )}
//                   {message.image_url && (
//                     <img
//                       src={message.image_url}
//                       alt="Shared in chat"
//                       className="mt-2 max-h-40 w-full rounded-lg object-cover"
//                       loading="lazy"
//                     />
//                   )}
//                   {message.video_url && (
//                     <video
//                       src={message.video_url}
//                       controls
//                       className="mt-2 max-h-52 w-full rounded-lg"
//                     />
//                   )}
//                 </div>
//               ))
//             )}
//           </div>

//           <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 h-64 overflow-hidden" aria-hidden="true">
//             {flyingEmojis.map((item) => (
//               <span
//                 key={item.id}
//                 className="chat-flying-emoji absolute bottom-0 text-3xl"
//                 style={{ left: `${item.left}%` }}
//               >
//                 {item.emoji}
//               </span>
//             ))}
//           </div>

//           {selectedImage && (
//             <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2">
//               {selectedIsVideo ? (
//                 <video
//                   src={URL.createObjectURL(selectedImage)}
//                   className="h-12 w-16 rounded-lg object-cover"
//                   muted
//                 />
//               ) : (
//                 <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
//               )}
//               <div className="min-w-0 flex-1 text-xs text-slate-500 truncate">{selectedImage.name}</div>
//               <button type="button" onClick={clearSelectedImage} className="text-slate-400 hover:text-brand-live" aria-label="Remove attachment">
//                 <X size={16} />
//               </button>
//             </div>
//           )}

//           {imageError && (
//             <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{imageError}</div>
//           )}

//           <div className="border-t border-slate-100 bg-slate-50 p-3">
//             <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5 py-1" aria-label="Add an emoji to your message">
//               {CHAT_EMOJIS.map((emoji) => (
//                 <button
//                   key={emoji}
//                   type="button"
//                   onClick={() => useEmoji(emoji)}
//                   aria-label={`Use ${emoji} emoji`}
//                   className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg transition-transform hover:bg-amber-50 hover:scale-110"
//                 >
//                   {emoji}
//                 </button>
//               ))}
//             </div>
//             <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
//                 className="hidden"
//                 onChange={handleImageSelection}
//               />
//               <input
//                 ref={cameraInputRef}
//                 type="file"
//                 accept="image/*"
//                 capture="environment"
//                 className="hidden"
//                 onChange={handleImageSelection}
//               />
//               <button
//                 type="button"
//                 aria-label="Attach image or video"
//                 onClick={() => fileInputRef.current?.click()}
//                 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <Paperclip size={16} />
//               </button>
//               <button
//                 type="button"
//                 aria-label="Take a photo or video"
//                 title="Take a photo or video"
//                 onClick={() => cameraInputRef.current?.click()}
//                 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <Camera size={16} />
//               </button>
//               <button
//                 type="button"
//                 aria-label="Share TrainLive"
//                 aria-expanded={shareOpen}
//                 onClick={() => setShareOpen((open) => !open)}
//                 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
//               >
//                 <Share2 size={16} />
//               </button>
//               <input
//                 aria-label="Chat message"
//                 className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
//                 value={text}
//                 onChange={(e) => setText(e.target.value)}
//                 onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
//                 placeholder="Write a message..."
//               />
//               <button
//                 type="button"
//                 onClick={sendMessage}
//                 aria-label="Send message"
//                 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-amber text-brand-ink transition-colors hover:bg-yellow-300 disabled:bg-slate-300 disabled:text-slate-500"
//                 disabled={sending || (!text.trim() && !selectedImage)}
//               >
//                 {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
//               </button>
//             </div>
//             {shareOpen && (
//               <div className="mt-2 flex items-center justify-center gap-2" role="menu" aria-label="Share on social media">
//                 {SOCIAL_SHARE_OPTIONS.map(([label, icon, base]) => (
//                   <button
//                     key={label}
//                     type="button"
//                     role="menuitem"
//                     aria-label={`Share on ${label}`}
//                     title={`Share on ${label}`}
//                     onClick={() => window.open(`${base}${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer')}
//                     className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
//                     style={{ backgroundColor: `#${icon.hex}` }}
//                   >
//                     <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-current">
//                       <path d={icon.path} />
//                     </svg>
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </>

//   )

// }



// import { useEffect, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import {
//   MessageCircle,
//   X,
//   Send,
//   Paperclip,
//   Camera,
//   Loader2,
//   Share2,
//   Smile,
// } from "lucide-react";
// import { siFacebook, siInstagram, siTiktok, siX } from "simple-icons";
// import { supabase } from "../supabase";
// import { lineTextColors } from "./lineColors";

// const CHAT_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;
// const MAX_FILE_SIZE = 50 * 1024 * 1024;
// // Change this if your app uses a different authentication route.
// const DEFAULT_SIGN_IN_URL = "/login";

// const TUBE_LINES = [
//   "central",
//   "jubilee",
//   "northern",
//   "piccadilly",
//   "victoria",
//   "district",
//   "circle",
//   "metropolitan",
//   "bakerloo",
//   "elizabeth",
//   "great western railway",
// ];

// const CHAT_LINE_COLORS = {
//   ...lineTextColors,
//   "great western railway": "#4b1f4f",
// };

// const CHAT_EMOJIS = ["❤️", "😂", "😡", "😮", "👍", "🚀"];
// const REACTION_EMOJIS = ["❤️", "😂", "😡", "😮", "👍", "🚀"];

// const LINKEDIN_ICON = {
//   hex: "0A66C2",
//   path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V8.97h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.316zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM3.555 20.452h3.564V8.97H3.555v11.482zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
// };

// const SOCIAL_SHARE_OPTIONS = [
//   ["X", siX, "https://twitter.com/intent/tweet?text=Join%20TrainLive%20live%20chat&url="],
//   ["Instagram", siInstagram, "https://www.instagram.com/?url="],
//   ["TikTok", siTiktok, "https://www.tiktok.com/upload?lang=en"],
//   ["Facebook", siFacebook, "https://www.facebook.com/sharer/sharer.php?u="],
//   ["LinkedIn", LINKEDIN_ICON, "https://www.linkedin.com/sharing/share-offsite/?url="],
// ];

// function formatMessageTime(value) {
//   if (!value) return "";
//   try {
//     return new Intl.DateTimeFormat([], {
//       hour: "numeric",
//       minute: "2-digit",
//     }).format(new Date(value));
//   } catch {
//     return "";
//   }
// }

// function totalReactionCount(reactionState) {
//   return Object.values(reactionState?.counts || {}).reduce(
//     (total, value) => total + value,
//     0
//   );
// }

// export default function MapChat({ signInUrl = DEFAULT_SIGN_IN_URL }) {
//   const [open, setOpen] = useState(false);
//   const [line, setLine] = useState("central");
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");
//   const [selectedImage, setSelectedImage] = useState(null);
//   const [imagePreview, setImagePreview] = useState("");
//   const [imageError, setImageError] = useState("");
//   const [selectedIsVideo, setSelectedIsVideo] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [authLoading, setAuthLoading] = useState(true);
//   const [emojiOpen, setEmojiOpen] = useState(false);
//   const [shareOpen, setShareOpen] = useState(false);
//   const [flyingEmojis, setFlyingEmojis] = useState([]);
//   const [reactions, setReactions] = useState({});
//   const [activeReactionMessage, setActiveReactionMessage] = useState(null);
//   const [reactionPickerStyle, setReactionPickerStyle] = useState(null);

//   const fileInputRef = useRef(null);
//   const cameraInputRef = useRef(null);
//   const currentUserRef = useRef(null);
//   const messagesRef = useRef([]);
//   const reactionButtonRefs = useRef({});
//   const chatPanelRef = useRef(null);

//   async function getCurrentUser() {
//     const {
//       data: { user },
//       error,
//     } = await supabase.auth.getUser();

//     if (error) {
//       console.error("Could not get current user:", error);
//       return null;
//     }

//     currentUserRef.current = user || null;
//     setIsAuthenticated(Boolean(user));
//     setAuthLoading(false);
//     return user || null;
//   }

//   useEffect(() => {
//     let mounted = true;

//     supabase.auth.getSession().then(({ data, error }) => {
//       if (!mounted) return;
//       if (error) console.error("Could not read auth session:", error);
//       const user = data?.session?.user || null;
//       currentUserRef.current = user;
//       setIsAuthenticated(Boolean(user));
//       setAuthLoading(false);
//     });

//     const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
//       const user = session?.user || null;
//       currentUserRef.current = user;
//       setIsAuthenticated(Boolean(user));
//       setAuthLoading(false);
//     });

//     return () => {
//       mounted = false;
//       authSubscription?.subscription?.unsubscribe();
//     };
//   }, []);

//   const handleImageSelection = (event) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
//     const isVideo = file.type.startsWith("video/");

//     if (!isImage && !isVideo) {
//       setImageError("Please select a JPG, PNG, WEBP or video file.");
//       event.target.value = "";
//       return;
//     }

//     if (file.size > MAX_FILE_SIZE) {
//       setImageError("File must be under 50MB.");
//       event.target.value = "";
//       return;
//     }

//     setImageError("");
//     setSelectedImage(file);
//     setSelectedIsVideo(isVideo);

//     if (isVideo) setImagePreview("");
//     else setImagePreview(URL.createObjectURL(file));

//     event.target.value = "";
//   };

//   const clearSelectedImage = () => {
//     if (imagePreview) URL.revokeObjectURL(imagePreview);
//     setSelectedImage(null);
//     setImagePreview("");
//     setImageError("");
//     setSelectedIsVideo(false);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   useEffect(() => {
//     return () => {
//       if (imagePreview) URL.revokeObjectURL(imagePreview);
//     };
//   }, [imagePreview]);

//   const useEmoji = (emoji) => {
//     setText((current) => `${current}${emoji}`);
//     const id = `${Date.now()}-${Math.random()}`;
//     setFlyingEmojis((current) => [
//       ...current,
//       { id, emoji, left: 12 + Math.random() * 72 },
//     ]);
//     window.setTimeout(() => {
//       setFlyingEmojis((current) => current.filter((item) => item.id !== id));
//     }, 1800);
//   };

//   async function loadMessages() {
//     const { data, error } = await supabase
//       .from("chat_messages")
//       .select("*")
//       .eq("line", line)
//       .gte(
//         "created_at",
//         new Date(Date.now() - CHAT_VISIBILITY_WINDOW_MS).toISOString()
//       )
//       .order("created_at", { ascending: true });

//     if (error) {
//       console.error("Could not load chat messages:", error);
//       return [];
//     }

//     const nextMessages = data || [];
//     setMessages(nextMessages);
//     messagesRef.current = nextMessages;
//     await loadReactions(nextMessages.map((message) => message.id));
//     return nextMessages;
//   }

//   async function loadReactions(messageIds) {
//     if (!messageIds.length) {
//       setReactions({});
//       return;
//     }

//     const user = currentUserRef.current || (await getCurrentUser());

//     const { data, error } = await supabase
//       .from("chat_message_reactions")
//       .select("message_id, user_id, reaction")
//       .in("message_id", messageIds);

//     if (error) {
//       console.error("Could not load reactions:", error);
//       return;
//     }

//     const next = {};

//     for (const item of data || []) {
//       if (!next[item.message_id]) {
//         next[item.message_id] = { counts: {}, myReaction: null };
//       }

//       next[item.message_id].counts[item.reaction] =
//         (next[item.message_id].counts[item.reaction] || 0) + 1;

//       if (user && item.user_id === user.id) {
//         next[item.message_id].myReaction = item.reaction;
//       }
//     }

//     setReactions(next);
//   }

//   function positionReactionPicker(messageId) {
//     const button = reactionButtonRefs.current[messageId];
//     if (!button) return;

//     const rect = button.getBoundingClientRect();
//     const pickerWidth = 292;
//     const horizontalPadding = 10;
//     const left = Math.max(
//       horizontalPadding,
//       Math.min(
//         rect.right - pickerWidth,
//         window.innerWidth - pickerWidth - horizontalPadding
//       )
//     );

//     const spaceAbove = rect.top;
//     const pickerHeight = 52;
//     const top =
//       spaceAbove >= pickerHeight + 10
//         ? rect.top - pickerHeight - 10
//         : Math.min(window.innerHeight - pickerHeight - 10, rect.bottom + 10);

//     setReactionPickerStyle({
//       position: "fixed",
//       left,
//       top,
//       width: pickerWidth,
//     });
//   }

//   function openReactionPicker(messageId) {
//     const next = activeReactionMessage === messageId ? null : messageId;
//     setActiveReactionMessage(next);
//     if (next) requestAnimationFrame(() => positionReactionPicker(next));
//   }

//   useEffect(() => {
//     if (!activeReactionMessage) return undefined;

//     const update = () => positionReactionPicker(activeReactionMessage);
//     window.addEventListener("resize", update);
//     window.addEventListener("scroll", update, true);

//     const onPointerDown = (event) => {
//       const picker = document.getElementById("trainlive-reaction-picker");
//       const button = reactionButtonRefs.current[activeReactionMessage];
//       if (picker?.contains(event.target) || button?.contains(event.target)) return;
//       setActiveReactionMessage(null);
//     };

//     document.addEventListener("pointerdown", onPointerDown);
//     requestAnimationFrame(update);

//     return () => {
//       window.removeEventListener("resize", update);
//       window.removeEventListener("scroll", update, true);
//       document.removeEventListener("pointerdown", onPointerDown);
//     };
//   }, [activeReactionMessage]);

//   async function toggleReaction(messageId, reaction) {
//     const user = currentUserRef.current || (await getCurrentUser());

//     if (!user) {
//       setImageError("Please sign in before reacting to a message.");
//       setActiveReactionMessage(null);
//       return;
//     }

//     const current = reactions[messageId] || { counts: {}, myReaction: null };
//     const oldReaction = current.myReaction;
//     const nextReaction = oldReaction === reaction ? null : reaction;

//     // Optimistic update.
//     setReactions((state) => {
//       const previous = state[messageId] || { counts: {}, myReaction: null };
//       const counts = { ...previous.counts };

//       if (oldReaction) {
//         counts[oldReaction] = Math.max(0, (counts[oldReaction] || 0) - 1);
//         if (counts[oldReaction] === 0) delete counts[oldReaction];
//       }

//       if (nextReaction) {
//         counts[nextReaction] = (counts[nextReaction] || 0) + 1;
//       }

//       return {
//         ...state,
//         [messageId]: { counts, myReaction: nextReaction },
//       };
//     });

//     setActiveReactionMessage(null);

//     let error = null;

//     if (nextReaction) {
//       const result = await supabase
//         .from("chat_message_reactions")
//         .upsert(
//           {
//             message_id: messageId,
//             user_id: user.id,
//             reaction: nextReaction,
//           },
//           { onConflict: "message_id,user_id" }
//         );
//       error = result.error;
//     } else {
//       const result = await supabase
//         .from("chat_message_reactions")
//         .delete()
//         .eq("message_id", messageId)
//         .eq("user_id", user.id);
//       error = result.error;
//     }

//     if (error) {
//       console.error("Reaction update failed:", error);
//       await loadReactions(messagesRef.current.map((message) => message.id));
//     }
//   }

//   useEffect(() => {
//     if (!open) return undefined;

//     let cancelled = false;

//     const messagesChannel = supabase
//       .channel(`chat-messages-${line}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "chat_messages",
//           filter: `line=eq.${line}`,
//         },
//         async (payload) => {
//           if (cancelled) return;
//           const changedMessage = payload.new || payload.old;
//           if (!changedMessage || changedMessage.line !== line) return;
//           await loadMessages();
//         }
//       )
//       .subscribe();

//     const reactionsChannel = supabase
//       .channel(`chat-reactions-${line}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "chat_message_reactions",
//         },
//         async (payload) => {
//           if (cancelled) return;
//           const changedReaction = payload.new || payload.old;
//           if (!changedReaction?.message_id) return;
//           const ids = messagesRef.current.map((message) => message.id);
//           if (ids.includes(changedReaction.message_id)) await loadReactions(ids);
//         }
//       )
//       .subscribe();

//     loadMessages();

//     return () => {
//       cancelled = true;
//       setActiveReactionMessage(null);
//       supabase.removeChannel(messagesChannel);
//       supabase.removeChannel(reactionsChannel);
//     };
//   }, [open, line]);

//   async function sendMessage() {
//     if (!isAuthenticated) {
//       window.location.href = signInUrl;
//       return;
//     }
//     if (sending) return;
//     if (!text.trim() && !selectedImage) return;

//     setSending(true);
//     setImageError("");

//     try {
//       let imageUrl = null;
//       let videoUrl = null;

//       if (selectedImage) {
//         const safeName = selectedImage.name
//           .replace(/\s+/g, "-")
//           .replace(/[^a-zA-Z0-9._-]/g, "");

//         const fileName = `${Date.now()}_${safeName}`;
//         const bucket = selectedImage.type.startsWith("video/")
//           ? "chat-videos"
//           : "chat-images";

//         const { error: uploadError } = await supabase.storage
//           .from(bucket)
//           .upload(fileName, selectedImage, {
//             contentType: selectedImage.type,
//             upsert: false,
//           });

//         if (uploadError) throw uploadError;

//         const { data: publicUrlData } = supabase.storage
//           .from(bucket)
//           .getPublicUrl(fileName);

//         if (selectedImage.type.startsWith("video/")) {
//           videoUrl = publicUrlData?.publicUrl || null;
//         } else {
//           imageUrl = publicUrlData?.publicUrl || null;
//         }
//       }

//       const user = await getCurrentUser();
//       const payload = {
//         username: "TrainLive User",
//         message: text.trim(),
//         line,
//         image_url: imageUrl,
//         ...(videoUrl ? { video_url: videoUrl } : {}),
//       };

//       const { data, error } = await supabase
//         .from("chat_messages")
//         .insert(payload)
//         .select()
//         .single();

//       if (error) throw error;

//       if (data) {
//         setMessages((prev) => {
//           if (prev.some((message) => message.id === data.id)) return prev;
//           const next = [...prev, data];
//           messagesRef.current = next;
//           return next;
//         });
//       }

//       setText("");
//       clearSelectedImage();
//     } catch (error) {
//       console.error("Chat upload/send error:", error);
//       setImageError(error?.message || "Could not send your message.");
//     } finally {
//       setSending(false);
//     }
//   }

//   const panel = (
//     <div
//       ref={chatPanelRef}
//       className="fixed inset-y-0 left-0 z-[2147483000] flex w-[min(440px,100vw)] flex-col border-r border-slate-200 bg-white shadow-[8px_0_30px_rgba(15,23,42,0.16)]"
//       style={{ isolation: "isolate" }}
//     >
//       <div className="relative z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
//         <div className="flex min-w-0 items-center gap-3">
//           {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff6b16] text-[11px] font-black text-white shadow-sm">
//             chatter
//           </div> */}
//           <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
//   {/* Pulsing rings */}
//   <span className="absolute inset-0 rounded-full bg-[#ff6b16]/35 animate-ping" />

//   <span
//     className="absolute inset-[-3px] rounded-full  animate-pulse"
//   />

//   {/* Chatter button */}
//   <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#ff6b16] text-[11px] font-black text-white shadow-sm">
//     chatter
//   </div>
// </div>
          
//         </div>
//         <button
//           type="button"
//           onClick={() => {
//             setOpen(false);
//             setActiveReactionMessage(null);
//           }}
//           aria-label="Close chatter"
//           className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
//         >
//           <X size={20} />
//         </button>
//       </div>

//       <div className="relative z-20 shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-3">
//         <label
//           htmlFor="chat-line"
//           className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
//         >
//           Chat channel
//         </label>
//         <select
//           id="chat-line"
//           value={line}
//           onChange={(e) => setLine(e.target.value)}
//           className="h-11 w-full rounded-xl border-0 px-3.5 text-sm font-semibold capitalize text-white outline-none ring-0"
//           style={{ backgroundColor: CHAT_LINE_COLORS[line] || "#334155" }}
//         >
//           {TUBE_LINES.map((item) => (
//             <option
//               key={item}
//               value={item}
//               style={{
//                 backgroundColor: CHAT_LINE_COLORS[item] || "#334155",
//                 color: "#fff",
//               }}
//             >
//               {item} line
//             </option>
//           ))}
//         </select>
//       </div>

//       {!authLoading && !isAuthenticated && (
//         <div className="relative z-[25] shrink-0 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-amber-50 px-3 py-2.5">
//           <div className="flex items-center gap-2.5">
//             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
//               <MessageCircle size={16} />
//             </div>
//             <div className="min-w-0 flex-1">
//               <p className="text-[12px] font-bold text-slate-800">Sign in to unlock the full chat</p>
//               <p className="text-[10px] leading-4 text-slate-500">Some messages are blurred until you sign in.</p>
//             </div>
//             <button
//               type="button"
//               onClick={() => { window.location.href = signInUrl; }}
//               className="shrink-0 rounded-full bg-[#168cff] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0b7fe6]"
//             >
//               Sign in
//             </button>
//           </div>
//         </div>
//       )}

//       <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#efeae2] px-3 py-4 [scrollbar-width:thin]">
//         {messages.length === 0 ? (
//           <div className="flex h-full flex-col items-center justify-center px-8 text-center">
//             <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
//               <MessageCircle size={24} />
//             </div>
//             <p className="text-sm font-bold text-slate-800">Start the conversation</p>
//             <p className="mt-1 max-w-[270px] text-xs leading-5 text-slate-500">
//               Share a delay, ask a question, or help another passenger.
//             </p>
//           </div>
//         ) : (
//           messages.map((message, index) => {
//             const reactionState = reactions[message.id] || { counts: {}, myReaction: null };
//             const myReaction = reactionState.myReaction;
//             const summary = Object.entries(reactionState.counts)
//               .sort((a, b) => b[1] - a[1])
//               .slice(0, 3);
//             const pickerOpen = activeReactionMessage === message.id;
//             // Guests can preview the conversation; selected messages are softly blurred until sign-in.
//             const guestLocked = !isAuthenticated && !authLoading && index % 3 === 2;

//             return (
//               <div key={message.id || index} className="mb-3 flex w-full justify-start">
//                 <div className="group relative min-w-0 w-full max-w-[94%]">
//                   <div className="relative rounded-[14px] rounded-tl-[4px] bg-white px-3 py-2 text-slate-800 shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
//                     <p className="mb-1 text-[11px] font-bold text-slate-700">
//                       {message.username || "TrainLive User"}
//                     </p>

//                     <div className={guestLocked ? "relative overflow-hidden rounded-lg" : "relative"}>
//                       <div className={guestLocked ? "pointer-events-none select-none blur-[8px] scale-[1.01] transition-all duration-300" : ""} aria-hidden={guestLocked}>
//                         {message.message && (
//                           <p className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap pr-1 text-[13.5px] leading-[1.22rem] text-slate-700">
//                             {message.message}
//                           </p>
//                         )}

//                         {message.image_url && (
//                           <div className="mt-1.5 overflow-hidden rounded-lg">
//                             <img
//                               src={message.image_url}
//                               alt="Shared in chat"
//                               className="max-h-64 w-full object-cover"
//                               loading="lazy"
//                             />
//                           </div>
//                         )}

//                         {message.video_url && (
//                           <video
//                             src={message.video_url}
//                             controls
//                             className="mt-1.5 max-h-64 w-full rounded-lg"
//                           />
//                         )}
//                       </div>
//                     </div>

//                     <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-slate-400">
//                       {formatMessageTime(message.created_at)}
//                     </div>

//                     {totalReactionCount(reactionState) > 0 && (
//                       <button
//                         type="button"
//                         onClick={() => {
//                           if (!isAuthenticated) {
//                             window.location.href = signInUrl;
//                             return;
//                           }
//                           openReactionPicker(message.id);
//                         }}
//                         className="absolute -bottom-3 left-3 flex h-7 items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 shadow-sm transition hover:scale-[1.03]"
//                         aria-label="Change reaction"
//                       >
//                         {summary.map(([emoji]) => (
//                           <span key={emoji} className="text-[15px] leading-none">{emoji}</span>
//                         ))}
//                         <span className="ml-0.5 text-[10px] font-semibold text-slate-500">
//                           {totalReactionCount(reactionState)}
//                         </span>
//                       </button>
//                     )}
//                   </div>

//                   <button
//                     ref={(element) => {
//                       reactionButtonRefs.current[message.id] = element;
//                     }}
//                     type="button"
//                     onClick={() => {
//                       if (!isAuthenticated) {
//                         window.location.href = signInUrl;
//                         return;
//                       }
//                       openReactionPicker(message.id);
//                     }}
//                     aria-label={isAuthenticated ? "Add reaction" : "Sign in to react"}
//                     aria-expanded={pickerOpen}
//                     className={`absolute -right-3 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:scale-105 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 sm:opacity-0 sm:group-hover:opacity-100 ${
//                       pickerOpen ? "opacity-100" : ""
//                     }`}
//                   >
//                     <Smile size={16} />
//                   </button>
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       <div className="pointer-events-none absolute inset-x-0 bottom-[76px] z-40 h-56 overflow-hidden" aria-hidden="true">
//         {flyingEmojis.map((item) => (
//           <span
//             key={item.id}
//             className="chat-flying-emoji absolute bottom-0 text-3xl"
//             style={{ left: `${item.left}%` }}
//           >
//             {item.emoji}
//           </span>
//         ))}
//       </div>

//       {selectedImage && (
//         <div className="relative z-50 flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-3 py-2.5">
//           {selectedIsVideo ? (
//             <video
//               src={URL.createObjectURL(selectedImage)}
//               className="h-12 w-16 rounded-lg object-cover"
//               muted
//             />
//           ) : (
//             <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
//           )}
//           <div className="min-w-0 flex-1 truncate text-xs text-slate-500">{selectedImage.name}</div>
//           <button
//             type="button"
//             onClick={clearSelectedImage}
//             className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
//             aria-label="Remove attachment"
//           >
//             <X size={16} />
//           </button>
//         </div>
//       )}

//       {imageError && (
//         <div className="relative z-50 shrink-0 border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
//           {imageError}
//         </div>
//       )}

//       <div className="chat-composer relative z-50 shrink-0 border-t border-slate-200 bg-[#f7f8fa] p-3">
//         <>

//         <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white p-1.5 pl-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/10">
//           <div className="relative shrink-0">
//             <button
//               type="button"
//               aria-label="Add emoji"
//               onClick={() => {
//                 setEmojiOpen((value) => !value);
//                 setShareOpen(false);
//               }}
//               className={`flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 ${emojiOpen ? "bg-slate-100 text-slate-800" : ""}`}
//             >
//               <Smile size={19} />
//             </button>
//           </div>

//           <input
//             ref={fileInputRef}
//             type="file"
//             accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
//             className="hidden"
//             onChange={handleImageSelection}
//           />
//           <input
//             ref={cameraInputRef}
//             type="file"
//             accept="image/*"
//             capture="environment"
//             className="hidden"
//             onChange={handleImageSelection}
//           />

//           <button
//             type="button"
//             aria-label="Attach image or video"
//             onClick={() => fileInputRef.current?.click()}
//             className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
//           >
//             <Paperclip size={18} />
//           </button>

//           <button
//             type="button"
//             aria-label="Take a photo"
//             onClick={() => cameraInputRef.current?.click()}
//             className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
//           >
//             <Camera size={18} />
//           </button>

//           <input
//             aria-label="Chat message"
//             className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400"
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 sendMessage();
//               }
//             }}
//             placeholder="Type a message"
//           />

//           {text.trim() || selectedImage ? (
//             <button
//               type="button"
//               onClick={sendMessage}
//               aria-label="Send message"
//               disabled={sending}
//               className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#168cff] text-white shadow-sm transition hover:bg-[#0b7fe6] disabled:bg-slate-300"
//             >
//               {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
//             </button>
//           ) : (
//             <button
//               type="button"
//               aria-label="Share TrainLive"
//               onClick={() => {
//                 setShareOpen((value) => !value);
//                 setEmojiOpen(false);
//               }}
//               className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 ${shareOpen ? "bg-slate-100 text-slate-800" : ""}`}
//             >
//               <Share2 size={18} />
//             </button>
//           )}
//         </div>

//         {emojiOpen && (
//           <div className="mt-2 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
//             {CHAT_EMOJIS.map((emoji) => (
//               <button
//                 key={emoji}
//                 type="button"
//                 onClick={() => {
//                   useEmoji(emoji);
//                   setEmojiOpen(false);
//                 }}
//                 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl hover:bg-slate-100"
//                 aria-label={`Use ${emoji}`}
//               >
//                 {emoji}
//               </button>
//             ))}
//           </div>
//         )}

//         {shareOpen && (
//           <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
//             <span className="px-2 text-xs font-semibold text-slate-500">Share</span>
//             <div className="flex flex-1 items-center gap-1 overflow-x-auto">
//               {SOCIAL_SHARE_OPTIONS.map(([label, icon, base]) => (
//                 <button
//                   key={label}
//                   type="button"
//                   onClick={() =>
//                     window.open(
//                       `${base}${encodeURIComponent(window.location.href)}`,
//                       "_blank",
//                       "noopener,noreferrer"
//                     )
//                   }
//                   className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
//                   style={{ backgroundColor: `#${icon.hex}` }}
//                   aria-label={`Share on ${label}`}
//                   title={label}
//                 >
//                   <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
//                     <path d={icon.path} />
//                   </svg>
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}
//         </>
//       </div>
//     </div>
//   );

//   const reactionPicker = activeReactionMessage && reactionPickerStyle
//     ? createPortal(
//         <div
//           id="trainlive-reaction-picker"
//           className="z-[2147483647] rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_10px_35px_rgba(15,23,42,0.22)]"
//           style={reactionPickerStyle}
//           role="dialog"
//           aria-label="Message reactions"
//         >
//           <div className="flex items-center justify-center gap-0.5">
//             {REACTION_EMOJIS.map((emoji) => {
//               const messageReaction = reactions[activeReactionMessage]?.myReaction;
//               return (
//                 <button
//                   key={emoji}
//                   type="button"
//                   onClick={() => toggleReaction(activeReactionMessage, emoji)}
//                   className={`flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:scale-125 hover:bg-slate-100 active:scale-95 ${
//                     messageReaction === emoji ? "bg-blue-50 ring-2 ring-blue-200" : ""
//                   }`}
//                   aria-label={`React ${emoji}`}
//                 >
//                   {emoji}
//                 </button>
//               );
//             })}
//           </div>
//         </div>,
//         document.body
//       )
//     : null;


//   return (
//     <>
//       <style>{`
//         .chatter-launcher {
//           isolation: isolate;
//         }
//         .chatter-pulse-ring {
//           position: absolute;
//           inset: 4px;
//           border-radius: 9999px;
//           border: 2px solid rgba(255, 107, 22, 0.42);
//           pointer-events: none;
//           animation: trainlive-chatter-pulse 2.2s ease-out infinite;
//         }
//         .chatter-pulse-ring--two {
//           animation-delay: 1.1s;
//         }
//         @keyframes trainlive-chatter-pulse {
//           0% { transform: scale(0.92); opacity: 0.8; }
//           70%, 100% { transform: scale(1.55); opacity: 0; }
//         }
//         @media (prefers-reduced-motion: reduce) {
//           .chatter-pulse-ring { animation: none; opacity: 0; }
//         }
//       `}</style>
//       {!open &&
//         createPortal(
//           <button
//             type="button"
//             onClick={() => setOpen(true)}
//             aria-label="Open chatter"
//             className="chatter-launcher fixed bottom-5 left-5 z-[2147483000] flex h-16 w-16 items-center justify-center rounded-full text-[10px] font-black text-white transition hover:-translate-y-0.5"
//           >
//             <span className="chatter-pulse-ring chatter-pulse-ring--one" aria-hidden="true" />
//             <span className="chatter-pulse-ring chatter-pulse-ring--two" aria-hidden="true" />
//             <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff6b16] shadow-[0_8px_24px_rgba(255,107,22,0.38)]">chatter</span>
//           </button>,
//           document.body
//         )}

//       {open && createPortal(panel, document.body)}
//       {reactionPicker}
//     </>
//   );
// }


import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  X,
  SendHorizontal,
  TriangleAlert,
  Paperclip,
  Camera,
  Loader2,
  Share2,
  Smile,
  Heart,
  Bookmark,
  UserRound,
} from "lucide-react";
import { supabase } from "../supabase";
import { readChatSelection, saveChatSelection } from "../lib/chatSelection";
import { getChatVisitorId } from "../lib/chatIdentity";
import { images } from "../data/optimizedImages";
import ImageBackground from "./ImageBackground";
import jubileeFullResolution from "../assets/jubilee-line.webp";
import northernFullResolution from "../assets/northern-line.webp";
import circleCleanPortrait from "../assets/circle-line-clean-portrait.webp";
import SmoothImage from "./SmoothImage";
import { getChannelReportBreakdown, getChannelReportSummary, subscribeToCanonicalReports } from "../lib/canonicalReports";
import {
  MAIN_CHAT_CHANNELS,
  NATIONAL_RAIL_CHANNELS,
  getChatChannel,
  searchChatChannels,
  normalizeChannelSearch,
} from "../data/chatChannels";

const CHAT_LINE_BACKGROUNDS = {
  central: images.chatCentral,
  bakerloo: images.chatBakerloo,
  elizabeth: images.chatElizabeth,
  circle: { src: circleCleanPortrait, width: 853, height: 1844 },
  district: images.chatDistrict,
  "hammersmith & city": images.chatHammersmith,
  jubilee: { src: jubileeFullResolution, width: 1080, height: 1920 },
  metropolitan: images.chatMetropolitan,
  northern: { src: northernFullResolution, width: 1080, height: 1920 },
  piccadilly: images.chatPiccadilly,
  victoria: images.chatVictoria,
  "waterloo & city": images.chatWaterloo,
  "great western railway": images.chatGreatWestern,
};

// Fill the panel with the sharp photo region instead of its blurred padding.
const PORTRAIT_PHOTO_BACKGROUND_STYLE = { transform: "scale(3.2)", transformOrigin: "center" };

const CHAT_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000;
const HEART_REACTION = "\u2764\ufe0f";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const CHAT_EMOJIS = ["❤️", "😂", "😡", "😮", "👍", "🚀"];

function formatMessageTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat([], {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}


export default function MapChat({ launcherTarget = null }) {
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState(() => {
    try { return readChatSelection(window.localStorage); } catch { return null; }
  });
  const [channelMenuOpen, setChannelMenuOpen] = useState(() => !channelId);
  const [channelView, setChannelView] = useState("main");
  const [channelQuery, setChannelQuery] = useState("");
  const [channelListHeight, setChannelListHeight] = useState(0);
  const [channelViewport, setChannelViewport] = useState(null);
  const [reportCount, setReportCount] = useState(0);
  const [reportBreakdown, setReportBreakdown] = useState([]);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [selectedIsVideo, setSelectedIsVideo] = useState(false);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [flyingEmojis, setFlyingEmojis] = useState([]);
  const [reactions, setReactions] = useState({});
  const [savedMessages, setSavedMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("trainlive-saved-chat-messages") || "[]");
      return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
    } catch { return []; }
  });
  const [actionNotice, setActionNotice] = useState("");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const currentUserRef = useRef(null);
  const messagesRef = useRef([]);
  const messageInputRef = useRef(null);
  const chatPanelRef = useRef(null);
  const mainChannelListRef = useRef(null);
  const channelMenuRef = useRef(null);
  const chatComposerRef = useRef(null);
  const channelTriggerRef = useRef(null);
  const channelSearchRef = useRef(null);
  const messageGenerationRef = useRef(0);
  const mainChannelScrollTopRef = useRef(0);
  const selectedChannel = channelId ? getChatChannel(channelId) : { displayName: "Choose a channel", themeColour: "#29292e" };
  const searchingChannels = Boolean(normalizeChannelSearch(channelQuery));
  const visibleChannels = searchingChannels
    ? searchChatChannels(channelQuery, channelView === "nationalRail" ? NATIONAL_RAIL_CHANNELS : undefined)
    : channelView === "nationalRail" ? NATIONAL_RAIL_CHANNELS : MAIN_CHAT_CHANNELS;

  useEffect(() => {
    if (!open || !channelMenuOpen) return;
    const list = mainChannelListRef.current;
    if (list) list.scrollTop = !searchingChannels && channelView === "main" ? mainChannelScrollTopRef.current : 0;
  }, [open, channelMenuOpen, channelView, channelQuery, searchingChannels]);

  useEffect(() => {
    if (open && channelMenuOpen) channelSearchRef.current?.focus({ preventScroll: true });
  }, [open, channelMenuOpen]);

  useEffect(() => {
    if (!open || !channelMenuOpen) {
      setChannelViewport(null);
      return undefined;
    }
    const resizeList = () => {
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      if (viewport) {
        setChannelViewport({
          maxHeight: Math.max(0, viewport.height - 24),
          bottom: Math.max(12, window.innerHeight - viewportTop - viewport.height + 12),
        });
      }
      // Layout offsets stay accurate during the panel's scale-in animation.
      // Allow the dropdown to overlay the composer down to the panel edge.
      const panel = chatPanelRef.current;
      const offsetWithinPanel = (element) => {
        let top = 0;
        while (element && element !== panel) {
          top += element.offsetTop;
          element = element.offsetParent;
        }
        return top;
      };
      if (panel && channelMenuRef.current) {
        setChannelListHeight(Math.max(0,
          panel.clientHeight - offsetWithinPanel(channelMenuRef.current) - 8
        ));
      }
    };
    resizeList();
    const observer = new ResizeObserver(resizeList);
    if (chatPanelRef.current) observer.observe(chatPanelRef.current);
    if (chatComposerRef.current) observer.observe(chatComposerRef.current);
    window.addEventListener("resize", resizeList);
    window.visualViewport?.addEventListener("resize", resizeList);
    window.visualViewport?.addEventListener("scroll", resizeList);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeList);
      window.visualViewport?.removeEventListener("resize", resizeList);
      window.visualViewport?.removeEventListener("scroll", resizeList);
    };
  }, [open, channelMenuOpen]);

  useEffect(() => {
    if (!open || !channelMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleMenuDismiss = (event) => {
      if (event.key === "Escape") {
        if (!channelId) setOpen(false);
        setChannelMenuOpen(false);
        channelTriggerRef.current?.focus();
        return;
      }

      if (event.type === "pointerdown" && !channelMenuRef.current?.contains(event.target) && !channelTriggerRef.current?.contains(event.target)) {
        if (channelId) setChannelMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleMenuDismiss);
    window.addEventListener("pointerdown", handleMenuDismiss);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleMenuDismiss);
      window.removeEventListener("pointerdown", handleMenuDismiss);
    };
  }, [open, channelMenuOpen, channelId]);

  useEffect(() => {
    if (!open || !channelId) return undefined;
    setBreakdownOpen(false);
    setReportBreakdown([]);
    let cancelled = false;
    const refreshReportCount = () => {
      getChannelReportSummary(channelId)
        .then((count) => { if (!cancelled) setReportCount(count) })
        .catch((error) => {
          if (!cancelled) {
            setReportCount(0);
            console.error("Could not load line report count:", error);
          }
        });
    };
    refreshReportCount();
    const unsubscribe = subscribeToCanonicalReports(refreshReportCount);
    const timer = window.setInterval(refreshReportCount, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [open, channelId]);
  async function getCurrentUser() {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user || null;
    currentUserRef.current = user;
    return user;
  }

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      currentUserRef.current = session?.user || null;
    });
    return () => data?.subscription?.unsubscribe();
  }, []);

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setImageError("Please select a JPG, PNG, WEBP or video file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageError("File must be under 50MB.");
      event.target.value = "";
      return;
    }

    setImageError("");
    setSelectedImage(file);
    setSelectedIsVideo(isVideo);

    if (isVideo) setImagePreview("");
    else setImagePreview(URL.createObjectURL(file));

    event.target.value = "";
  };

  const clearSelectedImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview("");
    setImageError("");
    setSelectedIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const insertEmoji = (emoji) => {
    setText((current) => `${current}${emoji}`);
    const id = `${Date.now()}-${Math.random()}`;
    setFlyingEmojis((current) => [
      ...current,
      { id, emoji, left: 12 + Math.random() * 72 },
    ]);
    window.setTimeout(() => {
      setFlyingEmojis((current) => current.filter((item) => item.id !== id));
    }, 1800);
  };

  async function loadMessages() {
    const generation = messageGenerationRef.current;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", channelId)
      .gte(
        "created_at",
        new Date(Date.now() - CHAT_VISIBILITY_WINDOW_MS).toISOString()
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Could not load chat messages:", error);
      return [];
    }

    if (generation !== messageGenerationRef.current) return [];
    const nextMessages = data || [];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    await loadReactions(nextMessages.map((message) => message.id));
    return nextMessages;
  }

  async function loadReactions(messageIds) {
    const generation = messageGenerationRef.current;
    if (!messageIds.length) {
      setReactions({});
      return;
    }

    const user = currentUserRef.current || (await getCurrentUser());

    const { data, error } = await supabase
      .from("chat_message_reactions")
      .select("message_id, user_id, visitor_id, reaction")
      .in("message_id", messageIds);

    if (error) {
      console.error("Could not load reactions:", error);
      return;
    }

    const next = {};

    for (const item of data || []) {
      if (!next[item.message_id]) {
        next[item.message_id] = { counts: {}, myReaction: null };
      }

      next[item.message_id].counts[item.reaction] =
        (next[item.message_id].counts[item.reaction] || 0) + 1;

      if (user ? item.user_id === user.id : item.visitor_id === getChatVisitorId()) {
        next[item.message_id].myReaction = item.reaction;
      }
    }

    if (generation === messageGenerationRef.current) setReactions(next);
  }

  function toggleSavedMessage(messageId) {
    const next = savedMessages.includes(messageId)
      ? savedMessages.filter((id) => id !== messageId)
      : [...savedMessages, messageId].slice(-500);
    setSavedMessages(next);
    try {
      localStorage.setItem("trainlive-saved-chat-messages", JSON.stringify(next));
    } catch {
      setActionNotice("Bookmark updated for this session.");
    }
  }

  function commentOnMessage(message) {
    const mention = `@${message.username || "TrainLive User"} `;
    setText((current) => current.startsWith(mention) ? current : `${mention}${current}`);
    messageInputRef.current?.focus();
  }

  async function shareMessage(message) {
    const shareData = {
      title: `TrainLive ? ${selectedChannel.displayName}`,
      text: [message.username || "TrainLive User", message.message, message.image_url, message.video_url].filter(Boolean).join("\n"),
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setActionNotice("Message copied. You can paste it to share.");
      }
    } catch (error) {
      if (error.name !== "AbortError") setActionNotice("Could not share this message. Please try again.");
    }
  }

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  async function toggleReaction(messageId, reaction) {
    const user = currentUserRef.current || (await getCurrentUser());

    const identity = user ? { user_id: user.id } : { visitor_id: getChatVisitorId() };
    const identityKey = user ? 'user_id' : 'visitor_id';

    const current = reactions[messageId] || { counts: {}, myReaction: null };
    const oldReaction = current.myReaction;
    const nextReaction = oldReaction === reaction ? null : reaction;

    // Optimistic update.
    setReactions((state) => {
      const previous = state[messageId] || { counts: {}, myReaction: null };
      const counts = { ...previous.counts };

      if (oldReaction) {
        counts[oldReaction] = Math.max(0, (counts[oldReaction] || 0) - 1);
        if (counts[oldReaction] === 0) delete counts[oldReaction];
      }

      if (nextReaction) {
        counts[nextReaction] = (counts[nextReaction] || 0) + 1;
      }

      return {
        ...state,
        [messageId]: { counts, myReaction: nextReaction },
      };
    });


    let error = null;

    if (nextReaction) {
      const result = await supabase
        .from("chat_message_reactions")
        .upsert(
          {
            message_id: messageId,
            ...identity,
            reaction: nextReaction,
          },
          { onConflict: `message_id,${identityKey}` }
        );
      error = result.error;
    } else {
      const result = await supabase
        .from("chat_message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq(identityKey, identity[identityKey]);
      error = result.error;
    }

    if (error) {
      console.error("Reaction update failed:", error);
      setImageError("Could not save your reaction. Please try again.");
      await loadReactions(messagesRef.current.map((message) => message.id));
    }
  }

  useEffect(() => {
    if (!open || !channelId) return undefined;

    let cancelled = false;

    const messagesChannel = supabase
      .channel(`chat-messages-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          if (cancelled) return;
          const changedMessage = payload.new || payload.old;
          if (!changedMessage || changedMessage.channel_id !== channelId) return;
          await loadMessages();
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`chat-reactions-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_message_reactions",
        },
        async (payload) => {
          if (cancelled) return;
          const ids = messagesRef.current.map((message) => message.id);
          if (payload.eventType === "DELETE" || ids.includes(payload.new?.message_id)) await loadReactions(ids);
        }
      )
      .subscribe();

    loadMessages();

    return () => {
      cancelled = true;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [open, channelId]);

  async function sendMessage() {
    if (!channelId) return;
    if (sending) return;
    if (!text.trim() && !selectedImage) return;

    const generation = messageGenerationRef.current;
    setSending(true);
    setImageError("");

    try {
      let imageUrl = null;
      let videoUrl = null;

      if (selectedImage) {
        const safeName = selectedImage.name
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9._-]/g, "");

        const fileName = `${Date.now()}_${safeName}`;
        const bucket = selectedImage.type.startsWith("video/")
          ? "chat-videos"
          : "chat-images";

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, selectedImage, {
            contentType: selectedImage.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        if (selectedImage.type.startsWith("video/")) {
          videoUrl = publicUrlData?.publicUrl || null;
        } else {
          imageUrl = publicUrlData?.publicUrl || null;
        }
      }

      const user = await getCurrentUser();
      const payload = {
        username: user ? "TrainLive User" : "TrainLive Guest",
        message: text.trim(),
        line: channelId,
        channel_id: channelId,
        image_url: imageUrl,
        ...(videoUrl ? { video_url: videoUrl } : {}),
      };

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      if (data && generation === messageGenerationRef.current) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === data.id)) return prev;
          const next = [...prev, data];
          messagesRef.current = next;
          return next;
        });
      }

      setText("");
      clearSelectedImage();
    } catch (error) {
      console.error("Chat upload/send error:", error);
      setImageError(error?.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  const panel = (
    <div
      ref={chatPanelRef}
      className="trainlive-chat-panel fixed z-[2147483000] flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#29292e] bg-cover bg-center text-white shadow-[0_20px_60px_rgba(15,23,42,0.28)]
        left-3 right-3 bottom-3 h-[min(680px,calc(100dvh-24px))]
        sm:left-5 sm:right-auto sm:bottom-5 sm:w-[400px] sm:h-[min(680px,calc(100dvh-40px))]"
      style={{
        isolation: "isolate",
        ...(channelMenuOpen && channelViewport ? {
          maxHeight: `${channelViewport.maxHeight}px`,
          bottom: `${channelViewport.bottom}px`,
        } : {}),
      }}
    >
      {channelId && !channelMenuOpen && CHAT_LINE_BACKGROUNDS[selectedChannel.backgroundKey] && <ImageBackground {...CHAT_LINE_BACKGROUNDS[selectedChannel.backgroundKey]} sizes="(max-width: 639px) calc(100vw - 24px), 400px" imageStyle={["piccadilly", "jubilee", "northern"].includes(selectedChannel.backgroundKey) ? PORTRAIT_PHOTO_BACKGROUND_STYLE : undefined} shaded />}
      <div className="chat-panel-header relative z-30 m-2 mb-0 flex h-[52px] shrink-0 items-center justify-between rounded-xl bg-yellow-400 px-4 text-brand-ink">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-xl font-black text-brand-ink">chatter</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setChannelMenuOpen(false);
            setChannelQuery("");
            setChannelView("main");
          }}
          aria-label="Close chatter"
          className="flex h-11 w-11 items-center justify-center rounded-full text-brand-ink/70 transition hover:bg-black/10 hover:text-brand-ink"
        >
          <X size={20} />
        </button>
      </div>

      <div className="chat-channel relative z-[80] shrink-0 px-0 py-3">
        <label
          htmlFor="chat-channel"
          className="sr-only"
        >
          Chat channel
        </label>
        <div className="relative">
          <button
            style={{ display: channelId ? undefined : "none", backgroundColor: selectedChannel.themeColour, outlineColor: selectedChannel.themeColour, color: channelId === "underground_circle" ? "#111827" : "#ffffff" }}
            ref={channelTriggerRef}
            id="chat-channel"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={channelMenuOpen}
            onClick={() => {
              setChannelMenuOpen((isOpen) => {
                if (isOpen) return false;
                setChannelView("main");
                setChannelQuery("");
                return true;
              });
            }}
            className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 pr-24 text-left text-base font-semibold text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="min-w-0 truncate">{selectedChannel.displayName}</span>
            <span aria-hidden="true" className="absolute right-3 text-lg leading-none">⌄</span>
          </button>

          {channelMenuOpen && (
            <div
              ref={channelMenuRef}
              role="dialog"
              aria-label="Chatter channels"
              style={{ boxSizing: "border-box", maxHeight: `min(80dvh, 760px, ${channelListHeight}px)`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              className={`absolute left-0 right-0 ${channelId ? "top-[calc(100%+8px)]" : "top-0"} z-[60] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#29292e] text-white shadow-2xl`}
            >
              <div className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#29292e] p-2">
                <label htmlFor="chat-channel-search" className="sr-only">Search all Chatter channels</label>
                <input
                  ref={channelSearchRef}
                  id="chat-channel-search"
                  type="search"
                  value={channelQuery}
                  onChange={(event) => {
                    setChannelQuery(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      mainChannelListRef.current?.querySelector("button")?.focus();
                    }
                  }}
                  placeholder="Search channels"
                  autoComplete="off"
                  className="min-h-12 w-full min-w-0 rounded-lg border border-white/15 bg-white/10 px-3 text-[17px] text-white outline-none placeholder:text-white/60 focus:border-white/50 focus:ring-2 focus:ring-white/20"
                />
                <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {visibleChannels.length} channel{visibleChannels.length === 1 ? "" : "s"} found
                </p>
              </div>
              <div className="shrink-0 bg-[#29292e]">
                {channelView === "nationalRail" && (
                  <button
                    type="button"
                    onClick={() => {
                      setChannelView("main");
                      setChannelQuery("");
                      channelSearchRef.current?.focus({ preventScroll: true });
                    }}
                    className="flex min-h-14 w-full items-center border-b border-white/10 px-3 text-left text-[18px] font-semibold hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                  >
                    <span aria-hidden="true" className="mr-2 text-lg">‹</span> Back to London channels
                  </button>
                )}
              </div>
              <div ref={mainChannelListRef} className="chat-channel-list min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain py-1"
                onKeyDown={(event) => {
                  const buttons = [...event.currentTarget.querySelectorAll("button")];
                  const index = buttons.indexOf(document.activeElement);
                  let next;
                  if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
                  if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
                  if (event.key === "Home") next = 0;
                  if (event.key === "End") next = buttons.length - 1;
                  if (next !== undefined) { event.preventDefault(); buttons[next]?.focus(); }
                }}>
                {!searchingChannels && channelView === "main" && (
                  <button
                    type="button"
                    onClick={() => {
                      mainChannelScrollTopRef.current = mainChannelListRef.current?.scrollTop || 0;
                      setChannelView("nationalRail");
                      window.requestAnimationFrame(() => mainChannelListRef.current?.querySelector("button")?.focus({ preventScroll: true }));
                    }}
                    className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-3 text-left text-[18px] font-semibold hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                  >
                    <span>Browse National Rail operators</span>
                    <span aria-hidden="true" className="text-lg">›</span>
                  </button>
                )}
                <div role="group" aria-label={searchingChannels ? "Channel search results" : channelView === "main" ? "London channels" : "National Rail operators"}>
                {visibleChannels.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      aria-pressed={channel.id === channelId}
                      onClick={() => {
                        try {
                          if (!saveChatSelection(window.localStorage, channel.id)) return;
                        } catch { /* Storage may be unavailable; keep the in-memory selection. */ }
                        if (channel.id !== channelId) {
                          messageGenerationRef.current += 1;
                          setMessages([]);
                          messagesRef.current = [];
                          setReactions({});
                          setReportCount(0);
                          setChannelId(channel.id);
                        }
                        channelTriggerRef.current?.focus();
                        setChannelMenuOpen(false);

                        setChannelView("main");
                      }}
                      className="flex min-h-14 w-full items-center gap-3 border-b border-white/10 px-3 py-3 text-left text-[18px] font-medium leading-6 transition last:border-b-0 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                    >
                      <span aria-hidden="true" className="h-7 w-1 shrink-0 rounded-sm ring-1 ring-white/25" style={{ backgroundColor: channel.themeColour }} />
                      <span className="min-w-0 break-words">{channel.displayName}</span>
                    </button>
                ))}

                </div>
                {!visibleChannels.length && <p className="px-3 py-5 text-sm text-white/70">No channels found.</p>}
              </div>
            </div>
          )}
        </div>
        {channelId && <button type="button" className="absolute right-10 top-[2.125rem] z-10 flex min-h-9 min-w-[52px] -translate-y-1/2 items-center justify-center gap-1 rounded-md px-1 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={`View ${reportCount} active reports for ${selectedChannel.displayName}`} aria-expanded={breakdownOpen} onClick={async () => {
          if (!breakdownOpen) {
            try { setReportBreakdown(await getChannelReportBreakdown(channelId)) } catch (error) { console.error("Could not load report breakdown:", error); setReportBreakdown([]) }
          }
          setBreakdownOpen((value) => !value)
        }}>
          <TriangleAlert className="h-5 w-5 text-yellow-300" fill="currentColor" stroke="#111827" strokeWidth={2.5} aria-hidden="true" />
          <span className="text-sm font-bold tabular-nums" style={{ color: channelId === "underground_circle" ? "#111827" : "#ffffff" }}>{reportCount}</span>
        </button>
        }
        {breakdownOpen && <div role="dialog" aria-label={`${selectedChannel.displayName} active report breakdown`} className="absolute right-4 top-[3.875rem] z-30 w-[min(224px,calc(100vw-48px))] rounded-lg bg-white p-3 text-slate-800 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-xs">Relevant reports</strong><button type="button" aria-label="Close report breakdown" onClick={() => setBreakdownOpen(false)} className="text-lg leading-none">×</button></div>
          <p className="mb-2 text-[11px] text-slate-500">Active reports relevant to this channel; not confirmed disruptions.</p>
          {reportBreakdown.length ? reportBreakdown.map((item) => <div key={`${item.category}-${item.scope}`} className="flex justify-between gap-3 text-xs"><span>{item.category} <em className="text-[10px] not-italic text-slate-500">({item.scope === 'station_wide' ? 'station-wide' : 'line-specific'})</em></span><strong>{item.reportCount}</strong></div>) : <p className="text-xs text-slate-500">No active reports.</p>}
        </div>}
      </div>

      <div
        inert={!channelId || channelMenuOpen}
        className="chat-messages relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:thin]"
      >
        {messages.map((message, index) => {
            const reactionState = reactions[message.id] || { counts: {}, myReaction: null };
            const heartCount = (reactionState.counts[HEART_REACTION] || 0) + (reactionState.counts["\u2764"] || 0);
            const liked = reactionState.myReaction === HEART_REACTION || reactionState.myReaction === "\u2764";
            const saved = savedMessages.includes(message.id);

            return (
              <div key={message.id || index} className="mb-5 flex w-full items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white backdrop-blur-sm" aria-hidden="true">
                  <UserRound size={25} fill="currentColor" strokeWidth={1.5} />
                </span>
                <div className="group relative min-w-0 flex-1">
                  <div className="chat-message relative text-white">
                    <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2">
                      <p className="text-xs font-bold">{message.username || "TrainLive Guest"}</p>
                      <span className="text-[11px] text-white/75">{formatMessageTime(message.created_at)}</span>
                    </div>

                    <div className="relative">
                      <div>
                        {message.message && (
                          <p className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap pr-1 text-[15px] leading-6 text-white">
                            {message.message}
                          </p>
                        )}

                        {message.image_url && (
                          <div className="mt-1.5 overflow-hidden rounded-lg">
                            <SmoothImage
                              src={message.image_url}
                              alt="Shared in chat"
                              width={640}
                              height={480}
                              className="max-h-64 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {message.video_url && (
                          <video
                            src={message.video_url}
                            controls
                            className="mt-1.5 max-h-64 w-full rounded-lg"
                          />
                        )}
                      </div>
                    </div>

                    <div className="chat-message-actions mt-1 flex max-w-[200px] items-center justify-between gap-1" role="group" aria-label="Message actions">
                      <button
                        type="button"
                        onClick={() => toggleReaction(message.id, liked ? reactionState.myReaction : HEART_REACTION)}
                        aria-label={liked ? "Unlike message" : "Like message"}
                        aria-pressed={liked}
                        className={`flex h-9 shrink-0 items-center gap-1 rounded-lg transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-rose-300 ${liked ? 'text-red-400' : 'text-white'}`}
                      >
                        <Heart size={22} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
                        <span className="text-xs text-white/90">{heartCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => commentOnMessage(message)}
                        aria-label="Comment on message"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        <MessageCircle size={18} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSavedMessage(message.id)}
                        aria-label={saved ? "Remove bookmark" : "Bookmark message on this device"}
                        aria-pressed={saved}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        <Bookmark size={18} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => shareMessage(message)}
                        aria-label="Share message"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        <Share2 size={18} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[76px] z-40 h-56 overflow-hidden" aria-hidden="true">
        {flyingEmojis.map((item) => (
          <span
            key={item.id}
            className="chat-flying-emoji absolute bottom-0 text-3xl"
            style={{ left: `${item.left}%` }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      {selectedImage && (
        <div className="relative z-50 flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-3 py-2.5">
          {selectedIsVideo ? (
            <video
              src={URL.createObjectURL(selectedImage)}
              className="h-12 w-16 rounded-lg object-cover"
              muted
            />
          ) : (
            <img src={imagePreview} alt="Selected preview" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1 truncate text-xs text-slate-500">{selectedImage.name}</div>
          <button
            type="button"
            onClick={clearSelectedImage}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Remove attachment"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {actionNotice && (
        <p role="status" className="relative z-50 shrink-0 border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{actionNotice}</p>
      )}

      {imageError && (
        <div className="relative z-50 shrink-0 border-t border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {imageError}
        </div>
      )}

      <div inert={!channelId || channelMenuOpen} ref={chatComposerRef} className="chat-composer relative z-[70] shrink-0 p-3">

        <>
          <div className="flex items-center gap-2">
          <div className="chat-compose-field flex min-w-0 flex-1 items-center gap-0.5 rounded-full border border-white/50 bg-black/30 p-1 pl-1.5 backdrop-blur-sm focus-within:border-yellow-300 focus-within:ring-2 focus-within:ring-yellow-300/25">
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Add emoji"
                onClick={() => {
                  setEmojiOpen((value) => !value);
                }}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 ${emojiOpen ? "bg-slate-100 text-slate-800" : ""}`}
              >
                <Smile size={23} strokeWidth={1.8} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleImageSelection}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelection}
            />

            <button
              type="button"
              aria-label="Attach image or video"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Paperclip size={23} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              aria-label="Take a photo"
              onClick={() => cameraInputRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Camera size={23} strokeWidth={1.8} />
            </button>

            <input
              ref={messageInputRef}
              aria-label="Chat message"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[13px] text-slate-800 caret-blue-600 outline-none placeholder:text-slate-400 sm:text-[14px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
            />

          </div>
          <button
            type="button"
            onClick={sendMessage}
            aria-label="Send message"
            disabled={sending || (!text.trim() && !selectedImage)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffe620] text-white shadow-sm transition hover:bg-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-default disabled:hover:bg-[#ffe620]"
          >
            {sending ? <Loader2 size={23} className="animate-spin" /> : <SendHorizontal size={25} fill="currentColor" strokeWidth={1.5} />}
          </button>
          </div>

          {emojiOpen && (
            <div className="mt-2 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {CHAT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    insertEmoji(emoji);
                    setEmojiOpen(false);
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl hover:bg-slate-100"
                  aria-label={`Use ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}


        </>
      </div>
    </div>
  );


  return (
    <>
      <style>{`
        .chat-channel-list {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .chat-channel-list::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .chatter-launcher {
          isolation: isolate;
        }
        .trainlive-chat-panel {
          transform-origin: bottom left;
          animation: trainlive-chat-pop 0.22s ease-out;
        }
        @keyframes trainlive-chat-pop {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .trainlive-chat-panel { animation: none; }
        }
      `}</style>
      {!open &&
        createPortal(
          <button
            type="button"
            onClick={() => { if (!channelId) setChannelMenuOpen(true); setOpen(true); }}
            aria-label="Open chatter"
            className="chatter-launcher"
          >
            <span>Chatter</span>
          </button>,
          launcherTarget || document.body
        )}

      {open && createPortal(panel, document.body)}
    </>
  );
}
