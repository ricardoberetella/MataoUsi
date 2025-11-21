/* CARREGAR LISTA */
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social, cpf_cnpj")
    .order("razao_social", { ascending: true });

  if (error) {
    alert("Erro ao carregar clientes");
    return;
  }

  listaContainer.innerHTML = "";

  data.forEach(cli => {
    const div = document.createElement("div");
    div.className = "item-cliente";
    div.textContent = `${cli.razao_social} — ${cli.cpf_cnpj}`;
    div.onclick = () => abrirDetalhes(cli.id);
    listaContainer.appendChild(div);
  });
}

/* DETALHES DO CLIENTE */
async function abrirDetalhes(id) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar detalhes");
    return;
  }

  detalhesContainer.classList.remove("hidden");

  detalhesContainer.innerHTML = `
    <h2>Dados do Cliente</h2>
    <p><strong>Razão Social:</strong> ${data.razao_social}</p>
    <p><strong>CNPJ:</strong> ${data.cpf_cnpj}</p>
    <p><strong>Telefone:</strong> ${data.telefone || ""}</p>
    <p><strong>E-mail:</strong> ${data.email || ""}</p>
    <p><strong>Endereço:</strong> ${data.endereco || ""}</p>

    <button class="btn-editar" onclick="window.location='clientes_editar.html?id=${id}'">
      Editar
    </button>

    <button class="btn-excluir" onclick="excluirCliente(${id})">
      Excluir
    </button>
  `;
}
