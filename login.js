async function entrar() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const msg = document.getElementById("msg");

  msg.textContent = "";

  if (!email || !senha) {
    msg.textContent = "Preencha todos os campos.";
    return;
  }

  // LOGIN SUPABASE AUTH
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    msg.textContent = "Erro: " + error.message;
    return;
  }

  // LOGIN OK
  msg.style.color = "green";
  msg.textContent = "Login realizado! Redirecionando...";

  setTimeout(() => {
    window.location.href = "estoque.html";
  }, 800);
}
