// Inicializa o Supabase
const supabase = supabase.createClient(
  "https://nfdinjmjofvqmjnfquiy.supabase.co", // sua URL Supabase
  "SUA_ANON_KEY"                              // sua chave pública (anon key)
);

// Função de login
async function entrar() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const msg = document.getElementById("msg");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    msg.textContent = error.message;
  } else {
    msg.style.color = "green";
    msg.textContent = "Login realizado com sucesso!";
    console.log(data);
    // Aqui você pode redirecionar para a página principal
    // window.location.href = "dashboard.html";
  }
}

// Adiciona o evento ao botão
document.getElementById("btnLogin").onclick = entrar;
