import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchNetwork, clearAuthToken } from "../api/client";
import type {
  ConfirmConfig,
  NetworkInfo,
  OnboardingStep,
  Toast
} from "../types";

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const defaultNetwork: NetworkInfo = {
  host: "0.0.0.0",
  port: 3000,
  localIp: "127.0.0.1",
  joinUrl: "http://127.0.0.1:3000",
  note: "Students should connect from browser on same WiFi as lecturer laptop."
};

type AppState = {
  isAuthenticated: boolean;
  currentUserId: string | null;
  lecturerName: string;
  institution: string;
  department: string;
  onboardingStep: OnboardingStep;
  onboardingComplete: boolean;

  network: NetworkInfo;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  confirm: ConfirmConfig | null;
  toasts: Toast[];
  busy: boolean;

  setProfile: (name: string, institution: string, department: string) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;

  loadNetwork: () => Promise<void>;

  askConfirm: (cfg: ConfirmConfig) => void;
  closeConfirm: () => void;
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  removeToast: (id: string) => void;
  logOut: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUserId: null,
      lecturerName: "",
      institution: "",
      department: "",
      onboardingStep: 0,
      onboardingComplete: false,

      network: defaultNetwork,

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      confirm: null,
      toasts: [],
      busy: false,

      setProfile: (lecturerName, institution, department) => set({ lecturerName, institution, department }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      completeOnboarding: () => set({ onboardingComplete: true }),

      loadNetwork: async () => {
        const payload = await fetchNetwork();
        set({ network: payload });
      },

      askConfirm: (confirm) => set({ confirm }),
      closeConfirm: () => set({ confirm: null }),
      pushToast: (message, tone = "info") => {
        const toast: Toast = { id: makeId("toast"), message, tone };
        set((state) => ({ toasts: [...state.toasts.slice(-2), toast] }));
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      logOut: () => {
        clearAuthToken();
        set({
          isAuthenticated: false,
          currentUserId: null,
          lecturerName: "",
          institution: "",
          department: "",
          onboardingComplete: false,
          onboardingStep: 0
        });
      }
    }),
    {
      name: "mudu-app-state-v3",
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<AppState>) ?? {};
        return {
          ...currentState,
          lecturerName: typeof persisted.lecturerName === "string" ? persisted.lecturerName : currentState.lecturerName,
          isAuthenticated: typeof persisted.isAuthenticated === "boolean" ? persisted.isAuthenticated : currentState.isAuthenticated,
          currentUserId: typeof persisted.currentUserId === "string" || persisted.currentUserId === null
            ? persisted.currentUserId
            : currentState.currentUserId,
          institution: typeof persisted.institution === "string" ? persisted.institution : currentState.institution,
          department: typeof persisted.department === "string" ? persisted.department : currentState.department,
          onboardingComplete: typeof persisted.onboardingComplete === "boolean"
            ? persisted.onboardingComplete
            : currentState.onboardingComplete,
          onboardingStep: typeof persisted.onboardingStep === "number" ? persisted.onboardingStep : currentState.onboardingStep,
          sidebarCollapsed: typeof persisted.sidebarCollapsed === "boolean"
            ? persisted.sidebarCollapsed
            : currentState.sidebarCollapsed
        };
      },
      partialize: (state) => ({
        lecturerName: state.lecturerName,
        isAuthenticated: state.isAuthenticated,
        currentUserId: state.currentUserId,
        institution: state.institution,
        department: state.department,
        onboardingComplete: state.onboardingComplete,
        onboardingStep: state.onboardingStep,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
);
