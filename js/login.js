import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Inicializa o Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnLogin");

  btn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (!email || !senha) {
      alert("Preencha e-mail e senha!");
      return;
    }

    // Login com Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (error) {
      alert("Erro ao fazer login: " + error.message);
      return;
    }

    // SUCESSO → REDIRECIONA PARA O DASHBOARD CERTO
    window.location.href = "dashboard.html";
  });
});
