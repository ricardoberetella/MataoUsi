import { supabase } from "./supabase.js";

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnLogin");

  btn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    if (!email || !senha) {
      alert("Preencha o e-mail e a senha.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: senha,
    });

    if (error) {
      alert("Erro ao entrar: " + error.message);
    } else {
      window.location.href = "dashboard.html";
    }
  });
});
