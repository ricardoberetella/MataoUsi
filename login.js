// Inicializa o Supabase
const supabase = supabase.createClient(
  "https://nfdinjmjofvqmjnfquiy.supabase.co", // sua URL Supabase
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGluam1qb2Z2cW1qbmZxdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI1NjEsImV4cCI6MjA3ODc1ODU2MX0.K6dojizNG0oFZaGU9DHZkcbqC8yH--wFDEoaOJGbVYE"                              // sua chave pública (anon key)
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
