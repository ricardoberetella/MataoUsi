import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {

    let session = null;

    // Coleta segura da sessão (SEM quebrar o Supabase)
    try {
        const result = await supabase.auth.getSession();
        session = result?.data?.session || null;
    } catch (e) {
        console.error("Erro ao obter sessão:", e);
    }

    // Se não estiver logado → volta ao login
    if (!session) {
        window.location.href = "index.html";
    }
});
