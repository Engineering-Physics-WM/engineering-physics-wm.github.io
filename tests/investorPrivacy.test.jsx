import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvestorGamePage,
  InvestorTotalsPage,
  InvestorGameDashboardView,
} from "../js/investorGame.jsx";

const state = vi.hoisted(() => ({
  player: {
    token: "synthetic-token",
    name: "Test Angel",
    teamProjectId: "smr-heat-load",
    isPractice: false,
    isInstructor: false,
    budget: 1000000,
    allocations: {},
    savedAt: null,
  },
  feedback: [
    {
      id: 1,
      event_id: "event",
      event_label: "Pitch Perfect II",
      player_name: "Hidden Author",
      project_id: "smr-heat-load",
      body: "A clear and useful pitch.",
      updated_at: "2026-09-14T17:10:00Z",
      is_mine: false,
    },
  ],
}));
vi.mock("../js/supabaseClient.js", () => ({ isSupabaseConfigured: true }));
vi.mock("../js/motion.jsx", () => ({
  Reveal: ({ as: Tag = "div", children, ...props }) => <Tag {...props}>{children}</Tag>,
}));
vi.mock("../src/lib/investorGame", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchGameStatus: vi.fn(async () => ({
    game: {
      is_open: true,
      accepting: false,
      totals_visible: true,
      current_event: "Pitch Perfect II",
      event_id: "event",
      starts_at: "2026-09-14T17:00:00Z",
      ends_at: "2026-09-14T18:00:00Z",
      server_now: "2026-09-14T19:00:00Z",
    },
    error: null,
  })),
  fetchSession: vi.fn(async () => ({ player: state.player, error: null })),
  fetchFeedback: vi.fn(async () => ({ data: state.feedback, error: null })),
  fetchMyResults: vi.fn(async () => ({ data: [], error: null })),
  fetchEvents: vi.fn(async () => ({ data: [], error: null })),
  fetchPlayers: vi.fn(async () => ({ rows: [], error: null })),
  fetchActivity: vi.fn(async () => ({ rows: [], error: null })),
  fetchPublicTotals: vi.fn(async () => ({
    totals: [{ projectId: "smr-heat-load", total: 100000 }],
    error: null,
  })),
  fetchAdminArchive: vi.fn(async () => ({ comments: state.feedback, results: [], error: null })),
}));

let container;
let root;
beforeEach(() => {
  const storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T19:00:00Z"));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  window.localStorage.setItem(
    "ep-investor-game-ep-investor-2026-2027",
    JSON.stringify({ token: state.player.token })
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("feedback privacy in each view", () => {
  it("shows received quotations without author names, keeps viewing available after closing, and clears them on logout", async () => {
    await act(async () => root.render(<InvestorGamePage onNavigate={() => {}} />));
    expect(container.textContent).toContain("“A clear and useful pitch.”");
    expect(container.textContent).not.toContain("Hidden Author");
    expect(
      [...container.querySelectorAll('input[type="range"]')].every((input) => input.disabled)
    ).toBe(true);
    expect([...container.querySelectorAll("textarea")].every((input) => input.disabled)).toBe(true);
    const logout = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Log out"
    );
    await act(async () => logout.click());
    expect(container.textContent).not.toContain("A clear and useful pitch.");
  });
  it("keeps all comments and names off the public totals page", async () => {
    await act(async () => root.render(<InvestorTotalsPage onNavigate={() => {}} />));
    expect(container.textContent).toContain("$100K");
    expect(container.textContent).not.toContain("Hidden Author");
    expect(container.textContent).not.toContain("A clear and useful pitch.");
  });
  it("shows attribution in the protected instructor dashboard", async () => {
    await act(async () => root.render(<InvestorGameDashboardView onNavigate={() => {}} />));
    expect(container.textContent).toContain("Hidden Author");
    expect(container.textContent).toContain("“A clear and useful pitch.”");
  });
});
