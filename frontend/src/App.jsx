
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Issues from "./pages/Issues";
import Team from "./pages/Team";
import api from "./services/api";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  return token ? children : <Navigate to="/" replace />;
}

function AppLayout() {
  const location = useLocation();
  const token = localStorage.getItem("access_token");
  const [role, setRole] = useState("");

  useEffect(() => {
    let active = true;

    const getRole = async () => {
      if (!token || location.pathname === "/" || location.pathname === "/register") {
        setRole("");
        return;
      }

      try {
        const response = await api.get("/auth/me");

        if (active) {
          setRole(String(response.data.role || "").toLowerCase());
        }
      } catch {
        if (active) setRole("");
      }
    };

    getRole();

    return () => {
      active = false;
    };
  }, [token, location.pathname]);

  const theme =
    location.pathname === "/" || location.pathname === "/register" || !token
      ? "theme-login"
      : ["admin", "developer", "viewer"].includes(role)
        ? `theme-${role}`
        : "theme-loading";

  return (
    <div className={theme} style={{ minHeight: "100vh" }}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />

        <Route
          path="/projects"
          element={<ProtectedRoute><Projects /></ProtectedRoute>}
        />

        <Route
          path="/issues"
          element={<ProtectedRoute><Issues /></ProtectedRoute>}
        />

        <Route
          path="/team"
          element={<ProtectedRoute><Team /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
