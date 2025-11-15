import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para mostrar toast de feedback
function showToast(message, type="success") {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = type === "error" ? "toast error" : "toast";
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

export async function entrar() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  if(!email || !senha) {
    showToast("Preencha email e senha!", "error");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if(error) {
      showToast("Email ou senha incorretos!", "error");
      console.log(error);
      return;
    }

    showToast("Login realizado com sucesso!");
    // Redirecionar para dashboard após 1 segundo
    setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);

  } catch(err) {
    showToast("Erro ao tentar logar!", "error");
    console.log(err);
  }
}

// Adicionar toast container no HTML se não existir
document.addEventListener("DOMContentLoaded", () => {
  if(!document.getElementById("toast")) {
    const div = document.createElement("div");
    div.id = "toast";
    div.className = "toast";
    document.body.appendChild(div);
  }
});
