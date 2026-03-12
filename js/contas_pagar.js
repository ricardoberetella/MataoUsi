const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let globalLock = false;

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v || 0);

async function atualizarSaldoBanco(bancoId, valorDif) {
  const { data, error } = await _supabase
    .from("bancos")
    .select("saldo")
    .eq("id", bancoId)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar saldo do banco:", error);
    return;
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
  }
}

window.baixarPagamento = async (id) => {
  if (globalLock) return;
  globalLock = true;

  const botoes = document.querySelectorAll(".btn-tabela");
  botoes.forEach((b) => {
    b.disabled = true;
    b.style.opacity = "0.3";
    b.style.pointerEvents = "none";
  });

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

    if (item.status !== "PENDENTE") {
      return;
    }

    const { data: linhasAtualizadas, error: updateError } = await _supabase
      .from("contas_pagar")
      .update({ status: "PAGO" })
      .eq("id", id)
      .eq("status", "PENDENTE")
      .select();

    if (updateError) {
      console.error("Erro ao baixar pagamento:", updateError);
      return;
    }

    if (linhasAtualizadas && linhasAtualizadas.length === 1) {
      await atualizarSaldoBanco(item.banco_id, Number(item.valor));
    }
  } catch (e) {
    console.error(e);
  } finally {
    globalLock = false;
    carregarTudo();
  }
};

window.estornarPagamento = async (id) => {
  if (globalLock) return;
  globalLock = true;

  const botoes = document.querySelectorAll(".btn-tabela");
  botoes.forEach((b) => {
    b.disabled = true;
    b.style.opacity = "0.3";
    b.style.pointerEvents = "none";
  });

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

    if (item.status !== "PAGO") {
      return;
    }

    const { data: linhasAtualizadas, error: updateError } = await _supabase
      .from("contas_pagar")
      .update({ status: "PENDENTE" })
      .eq("id", id)
      .eq("status", "PAGO")
      .select();

    if (updateError) {
      console.error("Erro ao estornar pagamento:", updateError);
      return;
    }

    if (linhasAtualizadas && linhasAtualizadas.length === 1) {
      await atualizarSaldoBanco(item.banco_id, Number(item.valor) * -1);
    }
  } catch (e) {
    console.error(e);
  } finally {
    globalLock = false;
    carregarTudo();
  }
};

// FUNÇÃO PARA VOCÊ CORRIGIR O SALDO RAPIDAMENTE
window.ajusteRapidoSicoob = async () => {
  const { data: sicoob, error } = await _supabase
    .from("bancos")
    .select("*")
    .eq("nome", "SICOOB")
    .single();

  if (error || !sicoob) {
    console.error("Erro ao buscar SICOOB:", error);
    return;
  }

  const valorCorrecao = 108.0; // O que o sistema tirou a mais (3x R$ 36,00)
  const novoSaldo = Number((parseFloat(sicoob.saldo) + valorCorrecao).toFixed(2));

  const { error: updateError } = await _supabase
    .from("bancos")
    .update({ saldo: novoSaldo })
    .eq("id", sicoob.id);

  if (updateError) {
    console.error("Erro ao corrigir saldo do SICOOB:", updateError);
    return;
  }

  alert("Saldo do SICOOB corrigido em + R$ 108,00!");
  carregarTudo();
};

async function carregarTudo() {
  const { data: bancos, error: bancosError } = await _supabase.from("bancos").select("*");

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

      if (document.getElementById(id)) {
        document.getElementById(id).innerText = fmt(b.saldo);
      }
    });

    const campoBanco = document.getElementById("campoBanco");
    if (campoBanco) {
      campoBanco.innerHTML = bancos
        .map((b) => `<option value="${b.id}">${b.nome}</option>`)
        .join("");
    }
  }

  const { data: rcb, error: rcbError } = await _supabase
    .from("contas_receber")
    .select("valor")
    .eq("status", "ABERTO");

  if (!rcbError && document.getElementById("resumoReceber")) {
    document.getElementById("resumoReceber").innerText = fmt(
      rcb?.reduce((acc, c) => acc + Number(c.valor), 0) || 0
    );
  }

  const { data: pnd, error: pndError } = await _supabase
    .from("contas_pagar")
    .select("valor")
    .eq("status", "PENDENTE");

  if (!pndError && document.getElementById("resumoPagar")) {
    document.getElementById("resumoPagar").innerText = fmt(
      pnd?.reduce((acc, c) => acc + Math.abs(Number(c.valor)), 0) || 0
    );
  }

  const { data: lista, error: listaError } = await _supabase
    .from("contas_pagar")
    .select("*, bancos(nome)")
    .order("vencimento", { ascending: false });

  if (listaError) {
    console.error("Erro ao carregar lista financeira:", listaError);
    return;
  }

  const listaFinanceiro = document.getElementById("listaFinanceiro");
  if (listaFinanceiro) {
    listaFinanceiro.innerHTML =
      lista?.map(
        (item) => `
        <tr>
            <td>${new Date(item.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</td>
            <td>${item.bancos?.nome || "--"}</td>
            <td>${item.descricao}</td>
            <td style="color: ${item.valor < 0 ? "#ef4444" : "#22c55e"}">${fmt(item.valor)}</td>
            <td style="font-weight:bold; color: ${item.status === "PENDENTE" ? "#f59e0b" : "#38bdf8"}">${item.status}</td>
            <td style="text-align: center;">
                ${
                  item.status === "PENDENTE"
                    ? `<button onclick="baixarPagamento('${item.id}')" class="btn-tabela btn-pagar">Pagar</button>`
                    : `<button onclick="estornarPagamento('${item.id}')" class="btn-tabela btn-estornar">Estornar</button>`
                }
                <button onclick="editarRegistro('${item.id}')" class="btn-tabela btn-editar">✎</button>
                <button onclick="excluirRegistro('${item.id}')" class="btn-tabela btn-excluir">🗑</button>
            </td>
        </tr>
    `
      ).join("") || "";
  }
}

window.salvarLancamento = async () => {
  const id = document.getElementById("editId").value;
  const desc = document.getElementById("campoDescricao").value;
  const valorAbs = Math.abs(parseFloat(document.getElementById("campoValor").value || 0));
  const bancoId = document.getElementById("campoBanco").value;
  const dataVenc = document.getElementById("campoData").value;
  const valorFinal = document.getElementById("modalTitulo").innerText.includes("DEBITO")
    ? -valorAbs
    : valorAbs;

  if (!id) {
    await _supabase.from("contas_pagar").insert([
      {
        vencimento: dataVenc,
        banco_id: bancoId,
        descricao: desc,
        valor: valorFinal,
        status: "PENDENTE",
      },
    ]);
  } else {
    await _supabase
      .from("contas_pagar")
      .update({
        vencimento: dataVenc,
        banco_id: bancoId,
        descricao: desc,
        valor: valorFinal,
      })
      .eq("id", id);
  }

  fecharModais();
  carregarTudo();
};

window.excluirRegistro = async (id) => {
  if (confirm("Deseja excluir este registro?")) {
    const { data: item, error } = await _supabase
      .from("contas_pagar")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erro ao buscar item para excluir:", error);
      return;
    }

    if (item && item.status === "PAGO") {
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
  }
};

window.editarRegistro = async (id) => {
  const { data: item, error } = await _supabase
    .from("contas_pagar")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao carregar item para edição:", error);
    return;
  }

  if (item) {
    abrirModal("EDITAR");
    document.getElementById("editId").value = item.id;
    document.getElementById("campoData").value = item.vencimento;
    document.getElementById("campoBanco").value = item.banco_id;
    document.getElementById("campoDescricao").value = item.descricao;
    document.getElementById("campoValor").value = Math.abs(item.valor);
  }
};

window.abrirModal = (t) => {
  document.getElementById("modalFinanceiro").style.display = "block";
  document.getElementById("modalTitulo").innerText = t;

  if (t !== "EDITAR") {
    document.getElementById("editId").value = "";
    document.getElementById("campoValor").value = "";
    document.getElementById("campoData").value = new Date().toISOString().split("T")[0];
  }
};

window.fecharModais = () => {
  document.getElementById("modalFinanceiro").style.display = "none";
};

document.addEventListener("DOMContentLoaded", carregarTudo);
