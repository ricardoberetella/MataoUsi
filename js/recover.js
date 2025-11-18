// Importando config.js corretamente
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Quando o documento carregar
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const btn = document.getElementById("btnRecuperar");
  const msg = document.getElementById("msg");

  btn.addEventListener("click", async () => {
    const email = emailInput.value.trim();

    if (!email) {
      mostrarMensagem("Digite um e-mail válido.", "error");
      return;
    }

    // Enviar solicitação ao Supabase
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://matao-usi.vercel.app/reset.html",
    });

    if (error) {
      mostrarMensagem("Erro: " + error.message, "error");
    } else {
      mostrarMensagem("E-mail de recuperação enviado! Verifique sua caixa de entrada.", "success");
    }
  });

  function mostrarMensagem(texto, tipo) {
    msg.innerText = texto;
    msg.className = "msg " + tipo;
    msg.style.display = "block";
  }
});
