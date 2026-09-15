"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  ArrowRightIcon,
  KeyIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { getAllProviders, validateProviderConfig, fetchModels, AIProviderId, AIProviderConfig } from "@/lib/ai-providers";
import { getFirebaseIdToken } from "@/lib/auth-utils";
import { playSaveSuccess, playError } from "@/lib/sounds";
import { safeFetch } from "@/lib/api-client";

interface AIProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIProviderConfigModal({ isOpen, onClose }: AIProviderConfigModalProps) {
  const { preferences } = useAuth();
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>("groq");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [testingModel, setTestingModel] = useState<string | null>(null);

  const loadProviders = async () => {
    try {
      const allProviders = getAllProviders();
      setProviders(Object.values(allProviders));
      setSelectedProvider("groq");
      setModel(allProviders.groq.defaultModel);
    } catch {
      setError("Failed to load providers");
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedProvider) {
      const provider = providers.find(p => p.id === selectedProvider);
      if (provider) {
        setModel(provider.defaultModel);
        setModels(provider.availableModels || []);
      }
      setBaseUrl("");
    }
  }, [selectedProvider, providers]);

  const handleProviderChange = (providerId: AIProviderId) => {
    setSelectedProvider(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setModel(provider.defaultModel);
      setModels(provider.availableModels || []);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsTesting(true);
    setError(null);
    setSuccess(null);
    setTestingModel("Testing...");

    try {
      const token = await getFirebaseIdToken();
      if (!token) throw new Error("Not authenticated");

      const config = {
        provider: selectedProvider,
        apiKey,
        model,
        baseUrl: baseUrl.trim() || undefined,
        updatedAt: Date.now(),
      };

      const validation = await validateProviderConfig(config.provider, config);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid configuration");
      }

      // Also test by fetching models
      const fetchedModels = await fetchModels(selectedProvider, apiKey, baseUrl.trim() || undefined);
      if (fetchedModels.length > 0) {
        setModels(fetchedModels);
        if (!models.includes(model)) {
          setModel(fetchedModels[0]);
        }
      }

      setSuccess("Connection successful! Configuration is valid.");
      setTestingModel("Valid ✓");
      playSaveSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed. Please check your API key and settings.";
      setError(message);
      setTestingModel("Failed ✗");
      playError();
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestingModel(null), 3000);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getFirebaseIdToken();
      if (!token) throw new Error("Not authenticated");

      const config = {
        provider: selectedProvider,
        apiKey,
        model,
        baseUrl: baseUrl.trim() || undefined,
        updatedAt: Date.now(),
      };

      const validation = await validateProviderConfig(config.provider, config);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid configuration");
      }

      const result = await safeFetch("/api/ai-config", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });

      if (!result.success) throw new Error(result.error || "Failed to save");

      setSuccess("AI provider configured successfully!");
      playSaveSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save configuration";
      setError(message);
      playError();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getFirebaseIdToken();
      if (!token) throw new Error("Not authenticated");

      const result = await safeFetch("/api/ai-config", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!result.success) throw new Error(result.error || "Failed to remove");

      setSuccess("AI provider removed. Using default server configuration.");
      setApiKey("");
      setBaseUrl("");
      setSelectedProvider("groq");
      playSaveSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove configuration";
      setError(message);
      playError();
    } finally {
      setIsSaving(false);
    }
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const supportsBaseUrl = currentProvider?.supportsCustomBaseUrl;
  const requiresBaseUrl = supportsBaseUrl && currentProvider?.id === "openai-compatible";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">AI Provider Settings</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-green-950/30 border border-green-800/50 text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

              <div className="subtle-card rounded-xl p-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  Provider
                </h4>
                <div className="space-y-2">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderChange(provider.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors ${
                        selectedProvider === provider.id
                          ? "border-primary/30 bg-primary/5 text-foreground"
                          : "border-border bg-foreground/5 text-foreground/70 hover:bg-foreground/8"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <SparklesIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{provider.name}</p>
                        <p className="text-xs text-foreground/50 truncate">{provider.description}</p>
                      </div>
                      {selectedProvider === provider.id && (
                        <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="subtle-card rounded-xl p-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  API Key
                </h4>
                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-xs text-foreground/60 mb-1">API Key</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                        aria-label={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-foreground/60 mb-1">Model</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none pr-10"
                    >
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {supportsBaseUrl && (
                    <div>
                      <label className="block text-xs text-foreground/60 mb-1">
                        Base URL {requiresBaseUrl && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="url"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.example.com/v1"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-[10px] text-foreground/50 mt-1">
                        For OpenAI-compatible APIs (Ollama, LM Studio, LocalAI, etc.)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTestConnection}
                  disabled={isTesting || isSaving || !apiKey.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-border bg-foreground/5 text-foreground/70 hover:bg-foreground/8 transition-colors disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : testingModel ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-green-400" />
                      {testingModel}
                    </>
                  ) : (
                    <>
                      <KeyIcon className="w-4 h-4" />
                      Test Connection
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving || isTesting || !apiKey.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 btn-primary rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                  <ArrowRightIcon className="w-4 h-4" />
                </motion.button>
              </div>

              {apiKey && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRemove}
                  disabled={isSaving || isTesting}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/20 transition-colors disabled:opacity-50"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Remove Configuration
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}