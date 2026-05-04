import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { CanonicalHostRedirect } from "./components/CanonicalHostRedirect";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <CanonicalHostRedirect />
    <App />
  </HelmetProvider>,
);
