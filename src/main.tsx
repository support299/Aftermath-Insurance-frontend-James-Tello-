import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { clearChunkReloadFlag, registerChunkReloadHandler } from "./chunk-reload";
import { getRouter } from "./router";
import "./styles.css";

registerChunkReloadHandler();

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

clearChunkReloadFlag();
