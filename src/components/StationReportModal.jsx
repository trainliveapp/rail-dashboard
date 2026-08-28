import { useState } from "react";
import { AlertTriangle, X, Send } from "lucide-react";
import { supabase } from "../supabase";

const REPORT_TYPES = [
  { value: "crowded", label: " overcrowded" },
  { value: "delay", label: " train delays" },
  { value: "cleanliness", label: " cleanliness issues" },
  { value: "safety", label: " safety concern" },
  { value: "other", label: " other" },
];

export default function StationReportModal({ stationName, isOpen, onClose }) {
  const [type, setType] = useState("crowded");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("station_updates").insert({
      station_name: stationName,
      kind: "report",
      category: type,
      label: type.toUpperCase(),
      tone: "blue",
      message: message.trim() || `${type} reported at ${stationName}.`,
      status: "ACTIVE",
      author_initial: "A",
    });

    if (!error) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setMessage("");
        onClose();
      }, 1500);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-500" />
            <h2 className="text-white font-bold text-sm">Report: {stationName}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          {/* Report Type Selector */}
          <div>
            <p className="text-gray-400 text-xs mb-2">What is the issue?</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    type === t.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional details..."
              rows={3}
              className="w-full bg-gray-800 text-white placeholder-gray-500 p-3 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Submit / Success */}
          {success ? (
            <div className="w-full bg-green-600 text-white text-center py-3 rounded-lg font-semibold text-sm">
              Report Submitted!
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={16} />
              {submitting ? "Sending..." : "Submit Report"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}