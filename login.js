import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function entrar() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const msg = document.getElementById("msg");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      msg.textContent = error.message;
      msg.style.color = "red";
    } else {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "red";
  }
}

document.getElementById("btnLogin").onclick = entrar;
