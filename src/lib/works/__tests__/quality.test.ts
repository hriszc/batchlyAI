import { describe, expect, it } from "vitest";

import {
  buildWorkSeoDescription,
  getWorkNoindexReason,
  isIndexableWork,
  parseVariableGroups,
  parseWorkResultUrls,
} from "@/lib/works/quality";

const baseWork = {
  title: "Anime Couple Portrait Variations",
  description: "A polished image set for exploring anime couple cosplay concepts from one photo.",
  category: "art",
  promptTemplate: "Make the person in the image cosplay as romantic anime couple",
  originalPromptTemplate: "Make the person in the image cosplay as {*anime couples*}",
  coverUrl: "/api/generation-files/works/work-1/0.png",
  resultUrls: JSON.stringify(["/api/generation-files/works/work-1/0.png"]),
  model: "z-image-pro",
  isPublished: 1,
};

describe("work quality helpers", () => {
  it("marks complete safe works as indexable", () => {
    expect(isIndexableWork(baseWork)).toBe(true);
    expect(getWorkNoindexReason(baseWork)).toBeNull();
  });

  it("noindexes thin, empty, or risky works", () => {
    expect(getWorkNoindexReason({ ...baseWork, description: "" })).toBe("thin-description");
    expect(getWorkNoindexReason({ ...baseWork, resultUrls: "[]" })).toBe("missing-results");
    expect(getWorkNoindexReason({ ...baseWork, promptTemplate: "nsfw nude portrait" })).toBe(
      "content-risk",
    );
  });

  it("parses persisted JSON fields safely", () => {
    expect(parseWorkResultUrls(baseWork.resultUrls)).toEqual([
      "/api/generation-files/works/work-1/0.png",
    ]);
    expect(parseWorkResultUrls("not-json")).toEqual([]);
    expect(
      parseVariableGroups(JSON.stringify([{ id: "var_0", values: ["anime couple", "duo"] }])),
    ).toEqual([{ id: "var_0", values: ["anime couple", "duo"] }]);
  });

  it("builds a search-friendly description from model, category, and original prompt", () => {
    expect(buildWorkSeoDescription({ ...baseWork, description: "Short" })).toContain("Image Pro");
    expect(buildWorkSeoDescription({ ...baseWork, description: "Short" })).toContain("art");
    expect(buildWorkSeoDescription({ ...baseWork, description: "Short" })).toContain(
      "anime couples",
    );
  });
});
