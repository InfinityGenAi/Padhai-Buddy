"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseIdToken } from "@/lib/auth-utils";
import { getFirestoreDb } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, orderBy, query, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { PaperAirplaneIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { ChatMessage, Doubt } from "@/types";

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const q = query(
      collection(db, "users", user.uid, "doubts"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const doubts: Doubt[] = [];
      snapshot.forEach((doc) => {
        doubts.push({ id: doc.id, ...(doc.data() as Omit<Doubt, "id">) });
      });
      doubts.reverse();

      const msgs: ChatMessage[] = [];
      doubts.forEach((d) => {
        msgs.push({ role: "user", content: d.question });
        msgs.push({ role: "assistant", content: d.answer });
      });
      setMessages(msgs);
      setHistoryLoaded(true);
    });

    return () => unsub();
  }, [user?.uid]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping || !user) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
          class: user.class,
          board: user.board,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to get response");

      const aiMessage: ChatMessage = { role: "assistant", content: data.answer };
      setMessages((prev) => [...prev, aiMessage]);

      const db = getFirestoreDb();
      if (db) {
        await addDoc(collection(db, "users", user.uid, "doubts"), {
          question: input,
          answer: data.answer,
          type: "text",
          createdAt: serverTimestamp(),
        });
      }
    } catch {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content:
          "Sorry, I couldn't connect to the AI service. Please check your connection and try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center gap-2"
      >
        <SparklesIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Chat Doubt</h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {!historyLoaded && messages.length === 0 && (
          <div className="text-center py-8 text-foreground/50">
            Ask any study question, and Padhai Buddy will help you understand it step by step.
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-xl text-sm whitespace-pre-wrap
                  ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
                      : "bg-card border border-border text-foreground"
                  }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-card border border-border px-4 py-3 rounded-xl">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"></span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question here..."
            className="flex-1 resize-none bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={1}
            maxLength={1000}
            disabled={isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
