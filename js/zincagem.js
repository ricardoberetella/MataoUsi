/* =====================================================
   SUPABASE — UMA ÚNICA INSTÂNCIA
===================================================== */
const supabase = window.supabase.createClient(
  "https://uxtgicfuggpuyjybwawa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg"
);

/* =====================================================
   HELPERS
===================================================== */
const $ = id => document.getElementById(id);
const n = v => Number(String(v || "").replace(",", ".")) || 0;
const f2 = v => n(v).toLocaleString("pt-BR",{ minimumFractionDigits:2 });
const f3 = v => n(v).toLocaleString("pt-BR",{ minimumFractionDigits:3 });

/* =====================================================
   MODAL
===================================================== */
$("btnNovaOp").onclick = async () => {
  $("modalBg").style.display = "flex";
  await carregarProdutos();
};

$("btnCancelar").onclick = () => {
  $("modalBg").style.display = "none";
};

/* =====================================================
   CARREGAR PRODUTOS
===================================================== */
async function carregarProdutos(){
  const select = $("peca");
  select.innerHTML = "<option>Carregando…</option>";

  const { data, error } = await supabase
    .from("produtos")
    .select("id,codigo,descricao,peso_caixa,quantidade_caixa,acabamento")
    .order("codigo");

  if (error) {
    console.error("Erro produtos:", error);
    select.innerHTML = "<option>Erro ao carregar</option>";
    return;
  }

  select.innerHTML = "<option value=''>Selecione</option>";

  data.forEach(p => {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = `${p.codigo} - ${p.descricao}`;
    o.dataset.peso = p.peso_caixa || 0;
    o.dataset.qtd  = p.quantidade_caixa || 0;
    o.dataset.acab = p.acabamento || "Zincado";
    select.appendChild(o);
  });
}

/* =====================================================
   EVENTOS DE CÁLCULO
===================================================== */
$("peca").onchange = calcular;
$("kg_liq").oninput = calcular;
$("rs_kg").oninput = calcular;

/* =====================================================
   CÁLCULO AUTOMÁTICO
===================================================== */
function calcular(){
  const opt = $("peca").selectedOptions[0];
  if (!opt || !opt.value) return;

  $("acabamento").value = opt.dataset.acab;

  const peso  = n(opt.dataset.peso);
  const kgLiq = n($("kg_liq").value);
  const rsKg  = n($("rs_kg").value);

  if (!peso || !kgLiq) return;

  const qtd      = Math.floor(kgLiq / peso);
  const kgBruto  = qtd * peso;
  const total    = kgBruto * rsKg;

  $("qtd").value       = qtd;
  $("kg_bruto").value = f3(kgBruto);
  $("total").value    = f2(total);
}
