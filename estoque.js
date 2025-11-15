// === CARREGAR PRODUTOS AO ABRIR ===
document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
});

// === FUNÇÃO: SALVAR PRODUTO ===
async function salvarProduto() {
  const nome = document.getElementById("nome").value;
  const sku = document.getElementById("sku").value;
  const unidade = document.getElementById("unidade").value;
  const quantidade = parseInt(document.getElementById("quantidade").value || 0);

  if (!nome || !sku || !unidade) {
    alert("Preencha todos os campos.");
    return;
  }

  const { error } = await supabase
    .from("produtos")
    .insert([{ nome, sku, unidade, quantidade }]);

  if (error) {
    alert("Erro ao salvar: " + error.message);
    return;
  }

  alert("Produto salvo com sucesso!");
  carregarProdutos();
}

// === FUNÇÃO: CARREGAR PRODUTOS ===
async function carregarProdutos() {
  const tabela = document.querySelector("#tabela tbody");
  tabela.innerHTML = "";

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    alert("Erro ao carregar produtos.");
    return;
  }

  data.forEach((item) => {
    tabela.innerHTML += `
      <tr>
        <td>${item.sku}</td>
        <td>${item.nome}</td>
        <td>${item.unidade}</td>
        <td>${item.quantidade}</td>
      </tr>
    `;
  });
}
