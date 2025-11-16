import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarProdutosNoSelect();
  carregarMovimentacoes();
});

/* CARREGAR LISTA DE PRODUTOS NO SELECT */
async function carregarProdutosNoSelect() {
  const select = document.getElementById("mov-produto");
  
  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    alert("Erro ao carregar produtos.");
    return;
  }

  select.innerHTML = "<option value=''>Selecione...</option>";

  produtos.forEach(p => {
    select.innerHTML += `
      <option value="${p.id}">
        ${p.sku} - ${p.nome}
      </option>
    `;
  });
}

/* BOTÃO SALVAR MOVIMENTAÇÃO */
document.addEventListener("click", async (e) => {
  if (!e.target.matches("#btn-salvar-mov")) return;

  const produto_id = document.getElementById("mov-produto").value;
  const tipo = document.getElementById("mov-tipo").value;
  const quantidade = Number(document.getElementById("mov-quantidade").value);
  const motivo = document.getElementById("mov-motivo").value;
  const referencia = document.getElementById("mov-ref").value;

  if (!produto_id || !quantidade) {
    alert("Selecione o produto e informe uma quantidade.");
    return;
  }

  // BUSCAR ESTOQUE ATUAL
  const { data: estoque, error: estoqueError } = await supabase
    .from("estoque")
    .select("*")
    .eq("produto_id", produto_id)
    .single();

  let novaQtde = 0;

  if (tipo === "entrada") {
    novaQtde = (estoque?.quantidade || 0) + quantidade;
  } else if (tipo === "saida") {
    novaQtde = (estoque?.quantidade || 0) - quantidade;

    if (novaQtde < 0) {
      alert("Erro: não há estoque suficiente para esta saída!");
      return;
    }
  }

  // ATUALIZAR OU INSERIR ESTOQUE
  if (estoque) {
    await supabase
      .from("estoque")
      .update({
        quantidade: novaQtde,
        ultima_atualizacao: new Date().toISOString()
      })
      .eq("produto_id", produto_id);
  } else {
    await supabase
      .from("estoque")
      .insert([
        {
          produto_id,
          quantidade: novaQtde,
          local: "Almoxarifado",
          ultima_atualizacao: new Date().toISOString()
        }
      ]);
  }

  // REGISTRAR MOVIMENTAÇÃO
  const { error: movError } = await supabase
    .from("movimentacoes")
    .insert([
      {
        produto_id,
        tipo,
        quantidade,
        motivo,
        referencia_id: referencia || null,
        usuario_id: null
      }
    ]);

  if (movError) {
    alert("Erro ao registrar movimentação: " + movError.message);
  } else {
    alert("Movimentação registrada com sucesso!");
  }

  carregarMovimentacoes();
}

/* CARREGAR HISTÓRICO DE MOVIMENTAÇÕES */
async function carregarMovimentacoes() {
  const tabela = document.querySelector("#movimentacoes tbody");
  tabela.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";

  const { data: movs, error } = await supabase
    .from("movimentacoes")
    .select(`
      id,
      tipo,
      quantidade,
      motivo,
      referencia_id,
      criado_em,
      produtos (
        nome,
        sku
      )
    `)
    .order("id", { ascending: false });

  if (error) {
    tabela.innerHTML = "<tr><td colspan='6'>Erro ao carregar dados.</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  movs.forEach(m => {
    tabela.innerHTML += `
      <tr>
        <td>${new Date(m.criado_em).toLocaleString()}</td>
        <td>${m.produtos?.nome || "Produto apagado"}</td>
        <td>${m.tipo.toUpperCase()}</td>
        <td>${m.quantidade}</td>
        <td>${m.motivo || "-"}</td>
        <td>${m.referencia_id || "-"}</td>
      </tr>
    `;
  });
}
