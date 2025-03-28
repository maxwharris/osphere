import { useEffect } from "react";
import { useRouter } from "next/router";
import api from "../utils/api";

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/api/auth/me");
        router.replace("/home");
      } catch (err) {
        router.replace("/login");
      }
    };

    checkAuth();
  }, []);

  return null; // Nothing to render while redirecting
}
