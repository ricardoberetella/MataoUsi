import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// tempo de inatividade: 5 minutos
const INATIVIDADE_MS = 5 * 60 * 1000;
let timer = null;

function resetTimer() {
  clearTimeout(timer);

  timer = setTimeout(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Erro ao deslogar automaticamente:", e);
    }

    // volta para a tela de login
    window.location.href = "/index.html";
  }, INATIVIDADE_MS);
}

// Qualquer ação do usuário reseta o timer
["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt => {
  document.addEventListener(evt, resetTimer);
});

// inicia o timer na abertura da página
resetTimer();
