import { supabase, protegerPagina, obterRole } from "./auth.js";

const _supabase = supabase;

let globalLock = false;
let roleUsuario = "viewer";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v || 0));

function usuarioEhAdmin() {
  return roleUsuario === "admin";
}

function aplicarPermissoesUI() {
  const acoesTopo = document.getElementById("containerAcoesTopo");
  const thAcoes = document.getElementById("thAcoes");
  const colunaAcoes = document.getElementById("colunaAcoes");

  if (!usuarioEhAdmin()) {
    if (acoesTopo) acoesTopo.style.display = "none";
    if (thAcoes) thAcoes.style.display = "none";
    if (colunaAcoes) colunaAcoes.style.display = "none";
  } else {
    if (acoesTopo) acoesTopo.style.display = "flex";
    if (thAcoes) thAcoes.style.display = "table-cell";
    if (colunaAcoes) colunaAcoes.style.display = "table-cell";
  }
}

function travarBotoesTabela(travar) {
  document.querySelectorAll(".btn-tabela").forEach((b) => {
    b.disabled = travar;
    b.style.opacity = travar ? "0.3" : "1";
    b.style.pointerEvents = travar ? "none" : "auto";
  });
}

function preencherFiltroAno() {
  const selectAno = document.getElementById("filtroAno");
  if (!selectAno) return;

  const anoAtual = new Date().getFullYear();
  let options = "";

  for (let ano = anoAtual - 3; ano <= anoAtual + 3; ano++) {
    options += `<option value="${ano}">${ano}</option>`;
  }

  selectAno.innerHTML = options;
}

function definirFiltroMesAtual() {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const filtroMes = document.getElementById("filtroMes");
  const filtroAno = document.getElementById("filtroAno");

  if (filtroMes) filtroMes.value = String(mesAtual);
  if (filtroAno) filtroAno.value = String(anoAtual);
}

window.limparFiltroMesAno = () => {
  definirFiltroMesAtual();
  carregarTudo();
};

function obterPeriodoFiltro() {
  const filtroMes = document.getElementById("filtroMes");
  const filtroAno = document.getElementById("filtroAno");

  const mes = Number(filtroMes?.value || new Date().getMonth() + 1);
  const ano = Number(filtroAno?.value || new Date().getFullYear());

  const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;

  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const dataFim = `${proximoAno}-${String(proximoMes).padStart(2, "0")}-01`;

  return { dataInicio, dataFim };
}

function isTransferencia(item) {
  return (item?.descricao || "").startsWith("[TRANSFERÊNCIA]");
}

async function atualizarSaldoBanco(bancoId, valorDif) {
  const { data, error } = await _supabase
    .from("bancos")
    .select("saldo")
    .eq("id", bancoId)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar saldo do banco:", error);
    return false;
  }

  const saldoAtual = Number(data.saldo || 0);
  const diferenca = Number(valorDif || 0);
  const novoSaldo = Number((saldoAtual + diferenca).toFixed(2));

  const { error: updateError } = await _supabase
    .from("bancos")
    .update({ saldo: novoSaldo })
    .eq("id", bancoId);

  if (updateError) {
    console.error("Erro ao atualizar saldo do banco:", updateError);
    return false;
  }

  return true;
}

window.baixarPagamento = async (id) => {
  if (!usuarioEhAdmin()) return;
  if (globalLock) return;

  globalLock = true;
  travarBotoesTabela(true);

  try {
    const { data: item, error: itemError } = await _supabase
      .from("contas_pagar")
      .select("*")
      .eq("id", id)
      .single();

    if (itemError || !item) {
      console.error("Erro ao buscar conta:", itemError);
      return;
    }

    if (isTransferencia(item)) {
      alert("Transferências não podem ser pagas manualmente.");
      return;
    }

    if (item.status !== "PENDENTE") return;

    const { data: linhasAtualizadas, error: updateError } = await _supabase
      .from("contas_pagar")
      .update({ status: "PAGO" })
      .eq("id", id)
      .eq("status", "PENDENTE")
      .select("id");

    if (updateError) {
      console.error("Erro ao baixar pagamento:", updateError);
      return;
    }

    if (linhasAtualizadas && linhasAtualizadas.length === 1) {
      await atualizarSaldoBanco(item.banco_id, Number(item.valor));
    }
  } catch (e) {
    console.error("Erro inesperado ao baixar pagamento:", e);
  } finally {
    globalLock = false;
    travarBotoesTabela(false);
    carregarTudo();
  }
};

window.estornarPagamento = async (id) => {
  if (!usuarioEhAdmin()) return;
  if (globalLock) return;

  globalLock = true;
  travarBotoesTabela(true);

  try {
    const { data: item, error: itemError } = await _supabase
      .from("contas_pagar")
      .select("*")
      .eq("id", id)
      .single();

    if (itemError || !item) {
      console.error("Erro ao buscar conta:", itemError);
      return;
    }

    if (isTransferencia(item)) {
      alert("Transferências não podem ser estornadas por este botão.");
      return;
    }

    if (item.status !== "PAGO") return;

    const { data: linhasAtualizadas, error: updateError } = await _supabase
      .from("contas_pagar")
      .update({ status: "PENDENTE" })
      .eq("id", id)
      .eq("status", "PAGO")
      .select("id");

    if (updateError) {
      console.error("Erro ao estornar pagamento:", updateError);
      return;
    }

    if (linhasAtualizadas && linhasAtualizadas.length === 1) {
      await atualizarSaldoBanco(item.banco_id, Number(item.valor) * -1);
    }
  } catch (e) {
    console.error("Erro inesperado ao estornar pagamento:", e);
  } finally {
    globalLock = false;
    travarBotoesTabela(false);
    carregarTudo();
  }
};

async function carregarTudo() {
  const { dataInicio, dataFim } = obterPeriodoFiltro();

  aplicarPermissoesUI();

  const { data: bancos, error: bancosError } = await _supabase
    .from("bancos")
    .select("*")
    .order("nome", { ascending: true });

  if (bancosError) {
    console.error("Erro ao carregar bancos:", bancosError);
    return;
  }

  if (bancos) {
    bancos.forEach((b) => {
      let id =
        b.nome === "SICOOB"
          ? "resumoSicoob"
          : b.nome === "CAIXA FEDERAL"
          ? "resumoCaixa"
          : "resumoAplicacao";

      const el = document.getElementById(id);
      if (el) el.innerText = fmt(b.saldo);
    });

    const campoBanco = document.getElementById("campoBanco");
    if (campoBanco) {
      campoBanco.innerHTML = bancos
        .map((b) => `<option value="${b.id}">${b.nome}</option>`)
        .join("");
    }

    const transferOrigem = document.getElementById("transferOrigem");
    const transferDestino = document.getElementById("transferDestino");
    const bancosTransferencia = bancos.filter(
      (b) =>
        b.nome === "SICOOB" ||
        b.nome === "CAIXA FEDERAL" ||
        b.nome === "APLICAÇÃO"
    );

    const optionsTransfer = bancosTransferencia
      .map((b) => `<option value="${b.id}">${b.nome}</option>`)
      .join("");

    if (transferOrigem) transferOrigem.innerHTML = optionsTransfer;
    if (transferDestino) transferDestino.innerHTML = optionsTransfer;
  }

  const { data: rcb, error: rcbError } = await _supabase
    .from("contas_receber")
    .select("valor")
    .eq("status", "ABERTO");

  if (!rcbError) {
    const totalReceber = (rcb || []).reduce(
      (acc, c) => acc + Number(c.valor || 0),
      0
    );
    const elReceber = document.getElementById("resumoReceber");
    if (elReceber) elReceber.innerText = fmt(totalReceber);
  }

  const { data: pnd, error: pndError } = await _supabase
    .from("contas_pagar")
    .select("valor")
    .eq("status", "PENDENTE")
    .gte("vencimento", dataInicio)
    .lt("vencimento", dataFim);

  if (!pndError) {
    const totalPagar = (pnd || []).reduce(
      (acc, c) => acc + Math.abs(Number(c.valor || 0)),
      0
    );
    const elPagar = document.getElementById("resumoPagar");
    if (elPagar) elPagar.innerText = fmt(totalPagar);
  }

  const { data: lista, error: listaError } = await _supabase
    .from("contas_pagar")
    .select("*, bancos(nome)")
    .gte("vencimento", dataInicio)
    .lt("vencimento", dataFim)
    .order("vencimento", { ascending: false });

  if (listaError) {
    console.error("Erro ao carregar lista financeira:", listaError);
    return;
  }

  const listaFinanceiro = document.getElementById("listaFinanceiro");
  if (!listaFinanceiro) return;

  if (!lista || lista.length === 0) {
    listaFinanceiro.innerHTML = `
      <tr>
        <td colspan="${usuarioEhAdmin() ? 6 : 5}" style="text-align:center;color:#94a3b8;">
          Nenhum lançamento encontrado para este período.
        </td>
      </tr>
    `;
    return;
  }

  listaFinanceiro.innerHTML = (lista || [])
    .map((item) => {
      const transferencia = isTransferencia(item);

      let colAcoes = "";
      if (usuarioEhAdmin()) {
        colAcoes = `
          <td style="text-align:center;">
            ${
              transferencia
                ? `<span style="color:#94a3b8;">—</span>`
                : item.status === "PENDENTE"
                ? `<button onclick="baixarPagamento('${item.id}')" class="btn-tabela btn-pagar">Pagar</button>`
                : `<button onclick="estornarPagamento('${item.id}')" class="btn-tabela btn-estornar">Estornar</button>`
            }
            ${
              transferencia
                ? ""
                : `<button onclick="editarRegistro('${item.id}')" class="btn-tabela btn-editar">✎</button>`
            }
            ${
              transferencia
                ? ""
                : `<button onclick="excluirRegistro('${item.id}')" class="btn-tabela btn-excluir">🗑</button>`
            }
          </td>
        `;
      }

      return `
        <tr>
          <td>${new Date(item.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</td>
          <td>${item.bancos?.nome || "--"}</td>
          <td>${item.descricao || ""}</td>
          <td style="color: ${Number(item.valor) < 0 ? "#ef4444" : "#22c55e"}">${fmt(item.valor)}</td>
          <td style="font-weight:bold; color: ${item.status === "PENDENTE" ? "#f59e0b" : "#38bdf8"}">${item.status}</td>
          ${colAcoes}
        </tr>
      `;
    })
    .join("");
}

window.carregarLancamentos = () => {
  carregarTudo();
};

window.salvarLancamento = async () => {
  if (!usuarioEhAdmin()) return;

  const id = document.getElementById("editId")?.value || "";
  const desc = document.getElementById("campoDescricao")?.value.trim() || "";
  const valorAbs = Math.abs(
    parseFloat(document.getElementById("campoValor")?.value || 0)
  );
  const bancoId = document.getElementById("campoBanco")?.value || "";
  const dataVenc = document.getElementById("campoData")?.value || "";
  const titulo = document.getElementById("modalTitulo")?.innerText || "";
  const valorFinal = titulo.includes("DEBITO") ? -valorAbs : valorAbs;

  if (!desc || !bancoId || !dataVenc || !valorAbs) {
    alert("Preencha data, banco, descrição e valor.");
    return;
  }

  if (!id) {
    const { error } = await _supabase.from("contas_pagar").insert([
      {
        vencimento: dataVenc,
        banco_id: bancoId,
        descricao: desc,
        valor: valorFinal,
        status: "PENDENTE",
      },
    ]);

    if (error) {
      console.error("Erro ao inserir lançamento:", error);
      return;
    }
  } else {
    const { data: atual, error: erroAtual } = await _supabase
      .from("contas_pagar")
      .select("*")
      .eq("id", id)
      .single();

    if (erroAtual || !atual) {
      console.error("Erro ao carregar lançamento para editar:", erroAtual);
      return;
    }

    if (isTransferencia(atual)) {
      alert("Transferências não podem ser editadas por aqui.");
      return;
    }

    const { error } = await _supabase
      .from("contas_pagar")
      .update({
        vencimento: dataVenc,
        banco_id: bancoId,
        descricao: desc,
        valor: valorFinal,
      })
      .eq("id", id);

    if (error) {
      console.error("Erro ao editar lançamento:", error);
      return;
    }
  }

  fecharModais();
  carregarTudo();
};

window.excluirRegistro = async (id) => {
  if (!usuarioEhAdmin()) return;
  if (!confirm("Deseja excluir este registro?")) return;

  const { data: item, error } = await _supabase
    .from("contas_pagar")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    console.error("Erro ao buscar item para excluir:", error);
    return;
  }

  if (isTransferencia(item)) {
    alert("Transferências não podem ser excluídas por este botão.");
    return;
  }

  if (item.status === "PAGO") {
    await atualizarSaldoBanco(item.banco_id, Number(item.valor) * -1);
  }

  const { error: deleteError } = await _supabase
    .from("contas_pagar")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Erro ao excluir registro:", deleteError);
    return;
  }

  carregarTudo();
};

window.editarRegistro = async (id) => {
  if (!usuarioEhAdmin()) return;

  const { data: item, error } = await _supabase
    .from("contas_pagar")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    console.error("Erro ao carregar item para edição:", error);
    return;
  }

  if (isTransferencia(item)) {
    alert("Transferências não podem ser editadas por aqui.");
    return;
  }

  abrirModal("EDITAR");
  document.getElementById("editId").value = item.id;
  document.getElementById("campoData").value = item.vencimento;
  document.getElementById("campoBanco").value = item.banco_id;
  document.getElementById("campoDescricao").value = item.descricao || "";
  document.getElementById("campoValor").value = Math.abs(Number(item.valor || 0));
};

window.abrirModal = (t) => {
  if (!usuarioEhAdmin()) return;

  const modal = document.getElementById("modalFinanceiro");
  const titulo = document.getElementById("modalTitulo");

  if (modal) modal.style.display = "block";
  if (titulo) titulo.innerText = t;

  if (t !== "EDITAR") {
    const editId = document.getElementById("editId");
    const campoValor = document.getElementById("campoValor");
    const campoDescricao = document.getElementById("campoDescricao");
    const campoData = document.getElementById("campoData");

    if (editId) editId.value = "";
    if (campoValor) campoValor.value = "";
    if (campoDescricao) campoDescricao.value = "";
    if (campoData) campoData.value = new Date().toISOString().split("T")[0];
  }
};

window.fecharModais = () => {
  const modal = document.getElementById("modalFinanceiro");
  if (modal) modal.style.display = "none";
};

window.abrirModalTransferencia = () => {
  if (!usuarioEhAdmin()) return;

  const hoje = new Date().toISOString().split("T")[0];

  const transferData = document.getElementById("transferData");
  const transferValor = document.getElementById("transferValor");
  const transferDescricao = document.getElementById("transferDescricao");
  const origem = document.getElementById("transferOrigem");
  const destino = document.getElementById("transferDestino");
  const modal = document.getElementById("modalTransferencia");

  if (transferData) transferData.value = hoje;
  if (transferValor) transferValor.value = "";
  if (transferDescricao) transferDescricao.value = "";

  if (origem && destino && origem.options.length > 1) {
    origem.selectedIndex = 0;
    destino.selectedIndex = 1;
  }

  if (modal) modal.style.display = "block";
};

window.fecharModalTransferencia = () => {
  const modal = document.getElementById("modalTransferencia");
  if (modal) modal.style.display = "none";
};

window.salvarTransferencia = async () => {
  if (!usuarioEhAdmin()) return;
  if (globalLock) return;

  globalLock = true;

  try {
    const data = document.getElementById("transferData")?.value || "";
    const origemId = document.getElementById("transferOrigem")?.value || "";
    const destinoId = document.getElementById("transferDestino")?.value || "";
    const valor = Math.abs(
      parseFloat(document.getElementById("transferValor")?.value || 0)
    );
    const descricaoLivre =
      document.getElementById("transferDescricao")?.value.trim() || "";

    if (!data || !origemId || !destinoId || !valor) {
      alert("Preencha data, origem, destino e valor.");
      return;
    }

    if (origemId === destinoId) {
      alert("Selecione contas diferentes para origem e destino.");
      return;
    }

    const { data: bancosSelecionados, error: erroBancos } = await _supabase
      .from("bancos")
      .select("id, nome")
      .in("id", [origemId, destinoId]);

    if (erroBancos || !bancosSelecionados || bancosSelecionados.length < 2) {
      console.error("Erro ao buscar bancos da transferência:", erroBancos);
      alert("Não foi possível localizar as contas da transferência.");
      return;
    }

    const bancoOrigem = bancosSelecionados.find(
      (b) => String(b.id) === String(origemId)
    );
    const bancoDestino = bancosSelecionados.find(
      (b) => String(b.id) === String(destinoId)
    );

    const complemento = descricaoLivre ? ` - ${descricaoLivre}` : "";
    const descricaoSaida = `[TRANSFERÊNCIA] PARA ${bancoDestino.nome}${complemento}`;
    const descricaoEntrada = `[TRANSFERÊNCIA] DE ${bancoOrigem.nome}${complemento}`;

    const { error: insertError } = await _supabase.from("contas_pagar").insert([
      {
        vencimento: data,
        banco_id: origemId,
        descricao: descricaoSaida,
        valor: -valor,
        status: "PAGO",
      },
      {
        vencimento: data,
        banco_id: destinoId,
        descricao: descricaoEntrada,
        valor: valor,
        status: "PAGO",
      },
    ]);

    if (insertError) {
      console.error("Erro ao registrar transferência:", insertError);
      alert("Erro ao salvar transferência.");
      return;
    }

    const okOrigem = await atualizarSaldoBanco(origemId, -valor);
    const okDestino = await atualizarSaldoBanco(destinoId, valor);

    if (!okOrigem || !okDestino) {
      alert("Transferência registrada, mas houve erro ao atualizar algum saldo.");
      return;
    }

    fecharModalTransferencia();
    carregarTudo();
  } catch (e) {
    console.error("Erro inesperado na transferência:", e);
    alert("Erro inesperado ao salvar transferência.");
  } finally {
    globalLock = false;
  }
};

async function iniciarPagina() {
  try {
    await protegerPagina();
    roleUsuario = (await obterRole()) || "viewer";
  } catch (e) {
    console.error("Erro ao iniciar página:", e);
    roleUsuario = "viewer";
  }

  preencherFiltroAno();
  definirFiltroMesAtual();
  aplicarPermissoesUI();
  carregarTudo();
}

document.addEventListener("DOMContentLoaded", iniciarPagina);
