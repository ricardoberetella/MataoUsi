import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exemplo de função futura para checagem de login
async function checarLogin() {
    const usuario = supabase.auth.getUser();
    if (!usuario) {
        alert("Você não está logado! Redirecionando para login...");
        window.location.href = 'index.html';
    }
}

// Inicialização do dashboard
window.addEventListener('load', () => {
    checarLogin();
    console.log("Dashboard carregado com sucesso!");
});
