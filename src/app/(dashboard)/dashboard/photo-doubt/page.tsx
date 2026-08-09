"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseIdToken } from "@/lib/auth-utils";
import { getFirestoreDb } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useDropzone } from "react-dropzone";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function PhotoDoubtPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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

      const db = getFirestoreDb();
      if (db) {
        await addDoc(collection(db, "users", user.uid, "doubts"), {
          question: "Photo Doubt",
          answer: data.answer,
          type: "photo",
          createdAt: serverTimestamp(),
        });
      }
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
          className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-4 text-sm"
        >
          {error}
        </motion.div>
      )}

      {fileRejections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-4 text-sm"
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
                className="px-5 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                Choose File
              </button>
              <button
                type="button"
                onClick={() => handleButtonClick("environment")}
                className="px-5 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-foreground/5 transition-colors"
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
                className="mt-4 w-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
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
            className="mt-4 bg-card border border-border rounded-xl p-6"
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {answer}
            </div>
            <motion.button
              onClick={resetUpload}
              className="mt-6 w-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white py-2 rounded-xl font-medium hover:shadow-lg transition-shadow"
              whileHover={{ scale: 1.02 }}
            >
              Ask Another
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
