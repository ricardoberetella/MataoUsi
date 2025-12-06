import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnLogin");

  btn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      alert("Erro ao fazer login: " + error.message);
    } else {
      window.location.href = "/dashboard.html";
    }
  });
});
