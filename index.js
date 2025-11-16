import { supabase } from "../supabase.js";

const btn = document.getElementById("btnLogin");

btn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert("Erro ao entrar: " + error.message);
  } else {
    window.location.href = "dashboard.html";
  }
});
