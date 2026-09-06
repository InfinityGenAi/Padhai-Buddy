"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, PlayIcon, PauseIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEMO_STEPS = [
  { title: "Ask a Question", description: "Type or speak your doubt naturally", icon: "💬" },
  { title: "AI Tutor Responds", description: "Get step-by-step explanations tailored to your class & board", icon: "🤖" },
  { title: "Explain Mode", description: "Clear, simple breakdown of concepts", icon: "📖" },
  { title: "Teach Me Mode", description: "Interactive step-by-step teaching with questions", icon: "🎓" },
  { title: "Give Hint", description: "Gentle clues to guide your thinking", icon: "🔍" },
  { title: "Simplify", description: "Simple analogies & everyday examples", icon: "✨" },
  { title: "Quiz Me", description: "Interactive quiz on the topic", icon: "❓" },
  { title: "Photo Doubt", description: "Snap a photo, get instant solutions", icon: "📸" },
  { title: "Practice Quizzes", description: "Board-aligned practice with explanations", icon: "📝" },
  { title: "Study Planner", description: "Organize your schedule & track progress", icon: "📅" },
  { title: "Progress Tracking", description: "Real insights on your learning journey", icon: "📊" },
  { title: "Start Learning Free", description: "Join thousands of students today", icon: "🚀" },
];

export function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalSteps = DEMO_STEPS.length;
  const stepDuration = 4000; // 4 seconds per step
  const totalDuration = stepDuration * totalSteps;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setProgress(0);
      setIsMuted(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPlaying(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (!isPlaying || !isOpen) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / (totalDuration / 100));
        if (next >= 100) {
          setIsPlaying(false);
          clearInterval(intervalRef.current!);
          return 100;
        }
        return next;
      });

      setCurrentStep((prev) => {
        const stepProgress = (progress + (100 / (totalDuration / 100))) / 100;
        const nextStep = Math.min(Math.floor(stepProgress * totalSteps), totalSteps - 1);
        return nextStep;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isOpen, progress]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) videoRef.current.muted = !isMuted;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    setCurrentStep(Math.min(Math.floor((value / 100) * totalSteps), totalSteps - 1));
  };

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
    if (e.key === " ") {
      e.preventDefault();
      handlePlayPause();
    }
    if (e.key === "ArrowLeft") {
      setCurrentStep(Math.max(0, currentStep - 1));
      setProgress((currentStep - 1) / totalSteps * 100);
    }
    if (e.key === "ArrowRight") {
      setCurrentStep(Math.min(totalSteps - 1, currentStep + 1));
      setProgress((currentStep + 1) / totalSteps * 100);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const currentDemoStep = DEMO_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-card-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center text-primary">
                  <PlayIcon className="w-5 h-5" />
                </div>
                <h2 id="demo-modal-title" className="text-lg font-semibold text-foreground">
                  Padhai Buddy in Action
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-foreground/5 text-foreground-muted transition-colors"
                aria-label="Close demo"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Video/Animation Area */}
            <div className="relative flex-1 overflow-hidden bg-background-tertiary">
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="w-full max-w-2xl mx-auto">
                  {/* Animated Demo Simulation */}
                  <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg">
                    {/* Mock Chat Header */}
                    <div className="flex items-center justify-between p-4 border-b border-card-border bg-background-secondary">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                          <span className="text-2xl">✨</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Padhai Buddy AI</p>
                          <p className="text-xs text-foreground-muted">Online · Class 10 CBSE</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-primary bg-primary-soft px-2 py-1 rounded-lg">AI Tutor</span>
                    </div>

                    {/* Chat Messages - Animated based on current step */}
                    <div className="p-4 h-80 overflow-y-auto space-y-4">
                      {DEMO_STEPS.slice(0, currentStep + 1).map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.15 }}
                          className={`flex gap-3 ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
                        >
                          {index % 2 === 0 ? (
                            <>
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md flex-shrink-0">
                                <span className="text-xl">{step.icon}</span>
                              </div>
                              <div className="max-w-[70%]">
                                <div className="glass card-subtle rounded-2xl rounded-tl-sm px-4 py-3">
                                  <p className="text-sm text-foreground">{step.title}</p>
                                  <p className="text-xs text-foreground-muted mt-0.5">{step.description}</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="max-w-[70%]">
                                <div className="bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-3">
                                  <p className="text-sm font-medium">{step.title}</p>
                                  <p className="text-xs text-primary-light mt-0.5">{step.description}</p>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md flex-shrink-0">
                                <span className="text-xl">{step.icon}</span>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))}
                      {currentStep === DEMO_STEPS.length - 1 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex justify-center"
                        >
                          <Button variant="primary" size="lg" className="w-full max-w-xs">
                            Start Learning Free
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-card-border bg-background-secondary">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Type your question here..."
                            className="w-full bg-input-bg border border-input-border rounded-2xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            disabled
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle">✨</span>
                        </div>
                        <button className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors">
                          <span className="text-xl">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/95 to-transparent">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center text-primary flex-shrink-0">
                      <span className="text-xl">{currentDemoStep.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{currentDemoStep.title}</p>
                      <p className="text-sm text-foreground-muted">{currentDemoStep.description}</p>
                    </div>
                    <div className="text-right text-sm text-foreground-muted">
                      Step {currentStep + 1} of {totalSteps}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between p-4 border-t border-card-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMuted}
                    onChange={handleMuteToggle}
                    className="w-4 h-4 rounded border-card-border text-primary focus:ring-primary/30"
                  />
                  <span>{isMuted ? "Muted" : "Sound On"}</span>
                </label>
              </div>

              <div className="flex items-center gap-4 flex-1 justify-center">
                <button
                  onClick={() => {
                    setCurrentStep(Math.max(0, currentStep - 1));
                    setProgress(Math.max(0, progress - 100 / totalSteps));
                  }}
                  disabled={currentStep === 0}
                  className="p-2 rounded-lg hover:bg-foreground/5 text-foreground-muted transition-colors disabled:opacity-50"
                  aria-label="Previous step"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </button>

                <button
                  onClick={() => {
                    setCurrentStep(Math.min(totalSteps - 1, currentStep + 1));
                    setProgress(Math.min(100, progress + 100 / totalSteps));
                  }}
                  disabled={currentStep === totalSteps - 1}
                  className="p-2 rounded-lg hover:bg-foreground/5 text-foreground-muted transition-colors disabled:opacity-50"
                  aria-label="Next step"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-32 h-1.5 bg-primary-soft rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                    [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                  aria-label="Seek demo"
                />
                <span className="text-xs text-foreground-muted w-10 text-right">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}