import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("btnRecuperar").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const msgBox = document.getElementById("msg");

  if (!email) {
    msgBox.className = "msg error";
    msgBox.innerText = "Informe seu e-mail!";
    msgBox.style.display = "block";
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://matao-usi.vercel.app/reset"
  });

  if (error) {
    msgBox.className = "msg error";
    msgBox.innerText = "Erro: " + error.message;
    msgBox.style.display = "block";
    return;
  }

  msgBox.className = "msg success";
  msgBox.innerText = "Link enviado! Verifique seu e-mail.";
  msgBox.style.display = "block";
});
