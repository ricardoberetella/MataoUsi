import { SUPABASE_URL, SUPABASE_ANON_KEY } from "/js/config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Criar cliente do Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Evento do botão
document.getElementById("btnRecuperar").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const msgBox = document.getElementById("msg");

  if (!email) {
    msgBox.className = "msg error";
    msgBox.innerText = "Informe seu e-mail!";
    msgBox.style.display = "block";
    return;
  }

  // Enviar link de recuperação
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://matao-usi.vercel.app/reset.html"
  });

  if (error) {
    msgBox.className = "msg error";
    msgBox.innerText = "Erro: " + error.message;
    msgBox.style.display = "block";
    return;
  }

  msgBox.className = "msg success";
  msgBox.innerText = "Enviamos um link para seu e-mail!";
  msgBox.style.display = "block";
});
