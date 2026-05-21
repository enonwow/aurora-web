import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders workspace ready message", () => {
    render(<App />);
    expect(screen.getByText("Frontend Workspace Ready")).toBeInTheDocument();
  });
});
