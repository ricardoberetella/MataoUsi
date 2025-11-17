import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Carrega conteúdo da página de peças
window.carregarFormularioPecas = async function () {
  document.getElementById("conteudo").innerHTML = `
    <h1>Cadastro de Peças</h1>

    <div class="form-box">
        <label>SKU</label>
        <input type="text" id="sku">

        <label>Nome</label>
        <input type="text" id="nome">

        <label>Descrição</label>
        <input type="text" id="descricao">

        <label>Unidade</label>
        <select id="unidade">
            <option value="UN">UN</option>
            <option value="KG">KG</option>
            <option value="PC">PC</option>
        </select>

        <label>Preço de Custo</label>
        <input type="number" id="preco_custo" step="0.01">

        <label>Preço de Venda</label>
        <input type="number" id="preco_venda" step="0.01">

        <button onclick="salvarPeca()">Salvar</button>
    </div>

    <h3>Peças</h3>
    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Venda</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody id="tabelaPecas"></tbody>
    </table>
  `;

  listarPecas();
};

// Salvar
window.salvarPeca = async function () {
  const { error } = await supabase.from("produtos").insert([
    {
      sku: document.getElementById("sku").value,
      nome: document.getElementById("nome").value,
      descricao: document.getElementById("descricao").value,
      unidade: document.getElementById("unidade").value,
      preco_custo: document.getElementById("preco_custo").value,
      preco_venda: document.getElementById("preco_venda").value,
    },
  ]);

  if (error) alert(error.message);

  listarPecas();
};

// Listar
async function listarPecas() {
  const tabela = document.getElementById("tabelaPecas");

  const { data } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  tabela.innerHTML = "";

  data.forEach((p) => {
    tabela.innerHTML += `
      <tr>
        <td>${p.sku}</td>
        <td>${p.nome}</td>
        <td>${p.unidade}</td>
        <td>R$ ${p.preco_venda}</td>
        <td><button onclick="excluirPeca(${p.id})">Excluir</button></td>
      </tr>
    `;
  });
}

// Excluir
window.excluirPeca = async function (id) {
  await supabase.from("produtos").delete().eq("id", id);
  listarPecas();
};
