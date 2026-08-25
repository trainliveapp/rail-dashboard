import { useEffect, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "../supabase";
import liveIcon from "./live-icon.png";


const TUBE_LINES = [
  "central",
  "jubilee",
  "northern",
  "piccadilly",
  "victoria",
  "district",
  "circle",
  "metropolitan",
  "bakerloo",
  "elizabeth"
];
export default function MapChat() {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("central");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");


  async function loadMessages() {

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("line", line)
      .order("created_at", { ascending: true });


    if (error) {
      console.error(error);
      return;
    }


    setMessages(data || []);

  }



  useEffect(() => {

    if (!open) return;


    loadMessages();


    const channel = supabase
      .channel("chat-" + line)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `line=eq.${line}`
        },
        (payload) => {

          setMessages(prev => [
            ...prev,
            payload.new
          ]);

        }
      )
      .subscribe();



    return () => {

      supabase.removeChannel(channel);

    };


  }, [open, line]);


async function sendMessage() {
  if (!text.trim()) {
    return;
  }

  const { error } = await supabase
    .from("chat_messages")
    .insert({
      username: "TrainLive User",
      message: text,
      line: line
    });

  if (error) {
    console.error(error);
    return;
  }

  setText("");
}

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open live chat"
          className="group flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-md shadow-slate-200/80 transition-transform hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-slate-200 overflow-hidden">
            <img src={liveIcon} alt="Live chat" className="h-6 w-6 object-contain" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <span>Live chat</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[2000] flex h-[min(520px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between bg-white px-4 py-4 text-slate-900 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                <img src={liveIcon} alt="Live chat" className="h-6 w-6 object-contain" />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
              </span>
              <div>
                <h3 className="text-sm font-bold">Live chat</h3>
                <p className="mt-0.5 text-xs capitalize text-slate-500">{line} line community</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close live chat"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={19} />
            </button>
          </div>

          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <label htmlFor="chat-line" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Chat channel
            </label>
            <select
              id="chat-line"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium capitalize text-slate-800 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {TUBE_LINES.map((item) => (
                <option key={item} value={item}>{item} line</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <MessageCircle size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-800">Start the conversation</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Share a delay, ask a question, or help another passenger.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id || index} className="mb-3 max-w-[88%] rounded-xl rounded-tl-sm bg-slate-100 px-3 py-2.5 last:mb-0">
                  <p className="mb-1 text-[11px] font-bold text-blue-700">{message.username}</p>
                  <p className="break-words text-sm leading-relaxed text-slate-700">{message.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
              <input
                aria-label="Chat message"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage() }}
                placeholder="Write a message..."
              />
              <button
                type="button"
                onClick={sendMessage}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
                disabled={!text.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>

  )

}