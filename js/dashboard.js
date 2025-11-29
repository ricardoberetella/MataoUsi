import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ⛔ Impede entrar no dashboard sem login
async function protegerDashboard() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = "index.html"; // volta ao login
    }
}

protegerDashboard();

// 🔘 BOTÃO DE LOGOUT
const btnLogout = document.getElementById("logout");

if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// Aqui você coloca o restante da lógica do dashboard...
