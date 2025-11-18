import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRecuperar");

  btn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();

    if (!email) {
      alert("Digite um e-mail válido!");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://matao-usi.vercel.app/reset.html"
    });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      alert("Link enviado! Verifique seu e-mail.");
    }
  });
});
