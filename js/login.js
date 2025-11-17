import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./js/config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const erroBox = document.getElementById("erro");

  if (!email || !senha) {
    erroBox.innerText = "Preencha todos os campos!";
    erroBox.style.display = "block";
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    erroBox.innerText = "Usuário ou senha incorretos!";
    erroBox.style.display = "block";
    return;
  }

  // Login OK → painel
  window.location.href = "painel.html";
});
