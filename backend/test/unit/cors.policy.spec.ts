import {
  isOriginAllowed,
  parseAllowedOrigins
} from "../../src/common/http/cors";

describe("cors policy", () => {
  it("parses comma-separated allowlist and removes duplicates", () => {
    const parsed = parseAllowedOrigins(
      "http://localhost:5173, http://localhost:5173,https://aurora.local"
    );

    expect(parsed).toEqual([
      "http://localhost:5173",
      "https://aurora.local"
    ]);
  });

  it("allows requests with no origin header", () => {
    const allowed = ["http://localhost:5173"];
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
  });

  it("allows configured origin", () => {
    const allowed = ["http://localhost:5173"];
    expect(isOriginAllowed("http://localhost:5173", allowed)).toBe(true);
  });

  it("blocks origin that is not on allowlist", () => {
    const allowed = ["http://localhost:5173"];
    expect(isOriginAllowed("http://evil.example", allowed)).toBe(false);
  });
});
