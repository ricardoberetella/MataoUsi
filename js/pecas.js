import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Carrega conteúdo da página de peças
export async function carregarFormularioPecas() {
  document.getElementById("conteudo").innerHTML = `
        <h1>Cadastro de Peças</h1>

        <div class="form-box">
            <h3>Nova Peça</h3>

            <label>SKU</label>
            <input type="text" id="sku">

            <label>Nome</label>
            <input type="text" id="nome">

            <label>Descrição</label>
            <input type="text" id="descricao">

            <label>Unidade</label>
            <select id="unidade">
                <option value="UN">UN - Unidade</option>
                <option value="KG">KG - Quilo</option>
                <option value="PC">PC - Peça</option>
            </select>

            <label>Preço de Custo</label>
            <input type="number" id="preco_custo" step="0.01">

            <label>Preço de Venda</label>
            <input type="number" id="preco_venda" step="0.01">

            <button onclick="salvarPeca()">Salvar Peça</button>
        </div>

        <h3>Peças Cadastradas</h3>

        <table>
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Nome</th>
                    <th>Unidade</th>
                    <th>Preço Venda</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="tabelaPecas"></tbody>
        </table>
    `;

  listarPecas();
}

// Salva nova peça no Supabase
window.salvarPeca = async function () {
  const sku = document.getElementById("sku").value;
  const nome = document.getElementById("nome").value;
  const descricao = document.getElementById("descricao").value;
  const unidade = document.getElementById("unidade").value;
  const preco_custo = document.getElementById("preco_custo").value;
  const preco_venda = document.getElementById("preco_venda").value;

  const { error } = await supabase.from("produtos").insert([
    {
      sku,
      nome,
      descricao,
      unidade,
      preco_custo,
      preco_venda,
    },
  ]);

  if (error) {
    alert("Erro ao salvar: " + error.message);
  } else {
    alert("Peça salva com sucesso!");
    listarPecas();
  }
};

// Lista peças do banco
async function listarPecas() {
  const tabela = document.getElementById("tabelaPecas");
  tabela.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar.</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  data.forEach((produto) => {
    tabela.innerHTML += `
            <tr>
                <td>${produto.sku}</td>
                <td>${produto.nome}</td>
                <td>${produto.unidade}</td>
                <td>R$ ${produto.preco_venda}</td>
                <td>
                    <button onclick="excluirPeca(${produto.id})">Excluir</button>
                </td>
            </tr>
        `;
  });
}

// Excluir peça
window.excluirPeca = async function (id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    alert("Erro ao excluir: " + error.message);
  } else {
    listarPecas();
  }
};
