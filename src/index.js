import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CodeEditor from "./pages/CodeEditor";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/:id" element={<CodeEditor />} />
          <Route path="/" element={<Home />}>
          <Route path="*" element={<Home />} />
          </Route>
      </Routes>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
