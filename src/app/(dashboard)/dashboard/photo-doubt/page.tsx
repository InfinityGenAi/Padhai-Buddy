"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseIdToken } from "@/lib/auth-utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useDropzone } from "react-dropzone";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function PhotoDoubtPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerNotSaved, setAnswerNotSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleSaveAsNote = async () => {
    if (!user?.uid || !answer) return;
    setSavingNote(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Photo Doubt Solution",
          subject: "General",
          body: answer,
        }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      setError("Note saved!");
      setTimeout(() => setError(null), 3000);
    } catch {
      setError("Failed to save note. Please try again.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setSavingNote(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!user || !answer || !user.class || !user.board || generatingQuiz) return;
    setGeneratingQuiz(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: "General",
          class: user.class,
          board: user.board,
          difficulty: "medium",
          numberOfQuestions: 5,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate quiz");
      }
      const data = await res.json();
      router.push(`/dashboard/quiz?attempt=${data.attempt?.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
      setTimeout(() => setError(null), 4000);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleFollowUp = async () => {
    if (!user || !followUpQuestion.trim() || !user.class || !user.board || followUpLoading) return;
    setFollowUpLoading(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: `Follow-up to previous photo doubt explanation:\n\n${answer}\n\nQuestion: ${followUpQuestion}`,
          class: user.class,
          board: user.board,
          stream: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");
      // Append follow-up answer to the main answer
      setAnswer((prev) => (prev || "") + "\n\n---\n\n**Follow-up:** " + followUpQuestion + "\n\n" + data.answer);
      setFollowUpQuestion("");
      setShowFollowUp(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to get follow-up answer");
      setTimeout(() => setError(null), 4000);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    if (!ALLOWED_MIME_TYPES.has(f.type)) {
      setError("Please upload an image file (JPEG, PNG, or WebP).");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File size must be under 4MB.");
      return;
    }
    setFile(f);
    setError(null);
    setAnswer(null);
    setAnswerNotSaved(false);
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, [preview]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
  });

  const handleButtonClick = (capture?: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    if (capture) input.setAttribute("capture", capture);
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) onDrop(Array.from(target.files));
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!file || !user || loading) return;

    if (!user.class || !user.board) {
      setError("Please complete your profile by selecting your class and board in settings.");
      return;
    }

    setError(null);

    try {
      setLoading(true);
      const token = await getFirebaseIdToken();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("class", String(user.class));
      formData.append("board", String(user.board));

      const res = await fetch("/api/photo-doubt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      setAnswer(data.answer);
      setAnswerNotSaved(data.saved === false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setAnswer(null);
    setAnswerNotSaved(false);
    setError(null);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <PhotoIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Photo Doubt</h1>
        </div>
        {file && !answer && !loading && (
          <button
            onClick={resetUpload}
            className="text-sm text-foreground/60 hover:text-foreground underline"
          >
            Reset
          </button>
        )}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 mb-4 text-sm text-red-400"
        >
          {error}
        </motion.div>
      )}

      {fileRejections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-950/30 border border-red-800/50 text-red-400 rounded-xl p-4 mb-4 text-sm"
        >
          <p>{fileRejections[0].errors[0].message || "Invalid file"}</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {!preview && !answer && !loading && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all min-h-[200px] flex flex-col items-center justify-center ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <PhotoIcon className="w-12 h-12 text-foreground/30 mb-3" />
              <p className="text-foreground/60 mb-2">
                {isDragActive
                  ? "Drop your image here..."
                  : "Drag & drop an image, or click to browse"}
              </p>
              <p className="text-xs text-foreground/40">
                Supports: PNG, JPG, JPEG, WebP (max 4MB)
              </p>
            </div>

            <div className="flex gap-3 mt-4 justify-center">
              <button
                type="button"
                onClick={() => handleButtonClick()}
                className="px-5 py-2 bg-primary/10 border border-primary rounded-lg text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                Choose File
              </button>
              <button
                type="button"
                onClick={() => handleButtonClick("environment")}
                className="px-5 py-2 bg-primary/10 border border-primary rounded-lg text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                Camera
              </button>
            </div>
          </motion.div>
        )}

        {preview && !answer && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="relative rounded-xl overflow-hidden border border-border max-w-md mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Your doubt"
                className="w-full h-auto object-contain max-h-64"
              />
            </div>

            {!loading && (
              <motion.button
                onClick={handleSubmit}
                className="mt-4 w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <SparklesIcon className="w-5 h-5" />
                Solve with AI
              </motion.button>
            )}
          </motion.div>
        )}

        {loading && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-card border border-border rounded-xl p-8 text-center"
          >
            <div className="inline-flex items-center gap-2 text-foreground/70">
              <SparklesIcon className="w-5 h-5 text-primary animate-pulse" />
              <span>Analyzing your photo...</span>
            </div>
          </motion.div>
        )}

        {answer && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 glass card-subtle rounded-2xl p-6"
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {answer}
            </div>
            {answerNotSaved && (
              <p className="mt-3 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 rounded-lg px-3 py-2">
                Your answer couldn&apos;t be saved to history. It won&apos;t appear in Doubt History.
              </p>
            )}
            <div className="mt-4 space-y-2">
              <p className="text-xs text-foreground/50 font-medium">Actions</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSaveAsNote}
                  disabled={savingNote}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {savingNote ? "Saving..." : "Save as Note"}
                </button>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {generatingQuiz ? "Generating..." : "Generate Quiz"}
                </button>
                <button
                  onClick={() => setShowFollowUp(true)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium text-foreground/60 hover:bg-foreground/5 border border-border transition-colors"
                >
                  Ask Follow-up
                </button>
              </div>
            </div>
            <motion.button
              onClick={resetUpload}
              className="mt-6 w-full btn-primary py-2 rounded-xl font-medium"
              whileHover={{ scale: 1.02 }}
            >
              Ask Another
            </motion.button>
          </motion.div>
        )}

        {showFollowUp && (
          <motion.div
            key="followup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 glass card-subtle rounded-2xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground mb-3">Ask a Follow-up</h3>
            <textarea
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              placeholder="Ask a follow-up question about the explanation..."
              className="w-full min-h-[80px] p-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-3"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowFollowUp(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFollowUp}
                disabled={followUpLoading || !followUpQuestion.trim()}
                className="px-4 py-2 btn-primary rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {followUpLoading ? "Asking..." : "Ask"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
