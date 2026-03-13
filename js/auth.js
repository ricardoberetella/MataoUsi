// ===============================================
// AUTH.JS - AUTENTICAÇÃO + CLIENTE SUPABASE
// ===============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================================
// VERIFICAR SE ESTÁ LOGADO
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
// PROTEGER PÁGINA
// ===============================================
export async function protegerPagina() {
  return await verificarLogin();
}

// ===============================================
// OBTER ROLE DO USUÁRIO
// ===============================================
export async function obterRole() {
  const user = await verificarLogin();
  if (!user) return null;
  return user.user_metadata?.role || "viewer";
}

// ===============================================
// LOGIN
// ===============================================
export async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) throw error;
  return data;
}

// ===============================================
// LOGOUT
// ===============================================
export async function fazerLogout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}
