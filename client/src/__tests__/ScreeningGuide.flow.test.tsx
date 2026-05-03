import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScreeningGuide from "../pages/parent/ScreeningGuide";

const getScreeningPlanMock = vi.fn();
const getCasesMock = vi.fn();

vi.mock("../api", () => ({
  screeningAPI: {
    getScreeningPlan: (...args: unknown[]) => getScreeningPlanMock(...args),
  },
  parentAPI: {
    getCases: (...args: unknown[]) => getCasesMock(...args),
  },
}));

function makeChild(overrides: Record<string, unknown> = {}) {
  return {
    id: "child-1",
    firstName: "Ava",
    lastName: "Khan",
    dateOfBirth: "2024-06-01",
    ...overrides,
  };
}

describe("ScreeningGuide selection-first routing", () => {
  beforeEach(() => {
    getScreeningPlanMock.mockReset();
    getCasesMock.mockReset();
    getScreeningPlanMock.mockResolvedValue({ data: { data: { plan: { mchatAllowed: true } } } });
    getCasesMock.mockResolvedValue({ data: { data: [] } });
  });

  it("starts M-CHAT-R when selectedType is MCHAT-R and age allows both", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();

    render(
      <ScreeningGuide
        child={makeChild({ dateOfBirth: "2024-06-01" })}
        selectedType="MCHAT-R"
        onBack={() => {}}
        onStart={onStart}
      />,
    );

    await waitFor(() => {
      expect(getScreeningPlanMock).toHaveBeenCalled();
      expect(getCasesMock).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /^Start M-CHAT-R$/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(
      "MCHAT-R",
      expect.objectContaining({ origin: "guide", flow: "guided", skippedMchat: false, orderFollowed: true }),
    );
  });

  it("starts ASQ-3 when selectedType is ASQ-3", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();

    render(
      <ScreeningGuide
        child={makeChild({ dateOfBirth: "2024-06-01" })}
        selectedType="ASQ-3"
        onBack={() => {}}
        onStart={onStart}
      />,
    );

    await waitFor(() => {
      expect(getScreeningPlanMock).toHaveBeenCalled();
      expect(getCasesMock).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /^Start ASQ-3$/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(
      "ASQ-3",
      expect.objectContaining({ origin: "guide", flow: "guided" }),
    );
  });

  it("still starts selected M-CHAT-R when explicitly chosen", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    getScreeningPlanMock.mockResolvedValueOnce({ data: { data: { plan: { mchatAllowed: false } } } });

    render(
      <ScreeningGuide
        child={makeChild({ dateOfBirth: "2022-01-01" })}
        selectedType="MCHAT-R"
        onBack={() => {}}
        onStart={onStart}
      />,
    );

    await waitFor(() => {
      expect(getScreeningPlanMock).toHaveBeenCalled();
      expect(getCasesMock).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /^Start M-CHAT-R$/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(
      "MCHAT-R",
      expect.objectContaining({ origin: "guide", flow: "guided", skippedMchat: false, orderFollowed: true }),
    );
  });
});
