// ===============================================
//  AUTH.JS - AUTENTICAÇÃO + CLIENTE SUPABASE
//  VERSÃO REFORÇADA COM PROTEÇÃO DE PERMISSÕES
// ===============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================================
//   VERIFICAR SE ESTÁ LOGADO
// ===============================================
export async function verificarLogin() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data?.session) {
        window.location.href = "login.html";
        return null;
    }

    return data.session.user;
}

// ===============================================
//   BUSCAR ROLE DO USUÁRIO LOGADO
// ===============================================
export async function obterRole() {
    const user = await verificarLogin();
    if (!user) return null;
    return user.user_metadata?.role || "viewer";
}

// ===============================================
//   PROTEGER PÁGINAS DE ADMIN
// ===============================================
// Chamar no início da página:
//   await protegerAdmin();
export async function protegerAdmin() {
    const role = await obterRole();

    if (role !== "admin") {
        alert("Acesso não permitido!");
        window.location.href = "dashboard.html";
    }
}

// ===============================================
//   PROTEGER PÁGINAS SOMENTE LOGADO
// ===============================================
export async function protegerPagina() {
    const user = await verificarLogin();
    if (!user) window.location.href = "login.html";
}

// ===============================================
//   LOGOUT
// ===============================================
export async function sair() {
    await supabase.auth.signOut();
    window.location.href = "login.html";
}
// ===============================================
// AUTO LOGOUT POR INATIVIDADE
// ===============================================

const TEMPO_MAXIMO = 30 * 60 * 1000; // 30 minutos
let timeoutLogout;

function iniciarTimeoutLogout() {
    clearTimeout(timeoutLogout);

    timeoutLogout = setTimeout(async () => {
        await supabase.auth.signOut();
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
    }, TEMPO_MAXIMO);
}

// Reinicia o tempo quando o usuário interagir
["click", "mousemove", "keydown", "scroll"].forEach(evento => {
    document.addEventListener(evento, iniciarTimeoutLogout);
});

// Inicia ao carregar a página
iniciarTimeoutLogout();
