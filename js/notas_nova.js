import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://uxtgicfuggpuyjybwawa.supabase.co',
  'SUA_ANON_KEY'
)

let itensNF = []
let boletos = []
let baixas = []

// =========================
// CARREGAR CLIENTES
// =========================
async function carregarClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome_fantasia')

  if (error) {
    console.error(error)
    return
  }

  const select = document.getElementById('cliente')

  if (!select) return

  select.innerHTML = '<option value="">Selecione o cliente</option>'

  data.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nome_fantasia}</option>`
  })
}

// =========================
// SOMAR TOTAL
// =========================
function atualizarTotalNF() {
  const elTotal = document.getElementById('total_nf')
  if (!elTotal) return

  let total = 0

  itensNF.forEach(item => {
    total += Number(item.valor || 0)
  })

  elTotal.innerText = 'R$ ' + total.toFixed(2)
}

// =========================
// ADICIONAR ITEM
// =========================
window.adicionarItem = function () {
  const produto = document.getElementById('produto')
  const quantidade = document.getElementById('quantidade')

  if (!produto || !quantidade) return

  itensNF.push({
    produto_id: produto.value,
    quantidade: Number(quantidade.value),
    valor: Number(quantidade.value)
  })

  atualizarTotalNF()
}

// =========================
// GERAR PARCELAS
// =========================
window.gerarParcelas = function () {
  const total = itensNF.reduce((s, i) => s + i.valor, 0)

  if (total <= 0) return

  boletos = []

  const parcela = total / 3

  for (let i = 1; i <= 3; i++) {
    boletos.push({
      valor: parcela,
      vencimento: new Date()
    })
  }

  console.log('Boletos gerados:', boletos)
}

// =========================
// SALVAR TUDO
// =========================
window.salvarNF = async function () {
  try {
    const cliente = document.getElementById('cliente')?.value
    const numero = document.getElementById('numero_nf')?.value
    const data = document.getElementById('data_nf')?.value

    if (!cliente || !numero) {
      alert('Preencha os dados')
      return
    }

    // ======================
    // 1. SALVAR NF
    // ======================
    const { data: nf, error: erroNF } = await supabase
      .from('notas_fiscais')
      .insert([{
        cliente_id: cliente,
        numero_nf: numero,
        dados_nf: data
      }])
      .select()
      .single()

    if (erroNF) throw erroNF

    const nf_id = nf.id

    // ======================
    // 2. SALVAR ITENS
    // ======================
    if (itensNF.length > 0) {
      const itens = itensNF.map(i => ({
        nf_id,
        produto_id: i.produto_id,
        quantidade: i.quantidade
      }))

      const { error } = await supabase
        .from('notas_fiscais_itens')
        .insert(itens)

      if (error) throw error
    }

    // ======================
    // 3. SALVAR BAIXAS
    // ======================
    if (baixas.length > 0) {
      const lista = baixas.map(b => ({
        nf_id,
        pedido_id: b.pedido_id,
        produto_id: b.produto_id,
        baixada: b.quantidade
      }))

      const { error } = await supabase
        .from('notas_pedidos_baixas')
        .insert(lista)

      if (error) throw error
    }

    // ======================
    // 4. SALVAR BOLETOS
    // ======================
    if (boletos.length > 0) {
      const lista = boletos.map(b => ({
        nf_id,
        valor: b.valor,
        data_vencimento: b.vencimento,
        status: 'ABERTO'
      }))

      const { error } = await supabase
        .from('boletos')
        .insert(lista)

      if (error) throw error
    }

    alert('NF salva com sucesso!')
    location.reload()

  } catch (e) {
    console.error(e)
    alert('Erro ao salvar NF')
  }
}

// =========================
// INIT
// =========================
carregarClientes()
