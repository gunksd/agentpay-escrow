import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { AppProvider } from "./ui/AppContext";
import Layout from "./ui/Layout";

const Home = lazy(() => import("./pages/Home"));
const Board = lazy(() => import("./pages/Board"));
const Post = lazy(() => import("./pages/Post"));
const Agent = lazy(() => import("./pages/Agent"));
const Docs = lazy(() => import("./pages/Docs"));
const Skill = lazy(() => import("./pages/Skill"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Suspense
          fallback={<div className="page-fallback" aria-hidden="true" />}
        >
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="board" element={<Board />} />
              <Route path="post" element={<Post />} />
              <Route path="agent" element={<Agent />} />
              <Route path="docs" element={<Docs />} />
              <Route path="skill" element={<Skill />} />
            </Route>
          </Routes>
        </Suspense>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
