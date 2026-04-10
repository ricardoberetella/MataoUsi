import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔥 COLOQUE SUA ANON KEY REAL AQUI
const supabase = createClient(
  'https://uxtgicfuggpuyjybwawa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg'
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
    console.error('Erro clientes:', error)
    return
  }

  const select = document.getElementById('clienteSelect')
  if (!select) return

  select.innerHTML = '<option value="">Selecione o cliente</option>'

  data.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nome_fantasia}</option>`
  })
}

// =========================
// CARREGAR PRODUTOS
// =========================
async function carregarProdutos() {
  const { data, error } = await supabase
    .from('produtos')
    .select('id, codigo, valor_unitario')

  if (error) {
    console.error('Erro produtos:', error)
    return
  }

  const select = document.getElementById('produtoSelect')
  if (!select) return

  select.innerHTML = '<option value="">Selecione o produto</option>'

  data.forEach(p => {
    const option = document.createElement('option')
    option.value = p.id
    option.textContent = `${p.codigo} - R$ ${p.valor_unitario}`
    option.dataset.valor = p.valor_unitario

    select.appendChild(option)
  })
}

// =========================
// ATUALIZAR TOTAL
// =========================
function atualizarTotalNF() {
  const el = document.getElementById('totalNF')
  if (!el) return

  const total = itensNF.reduce((s, i) => s + i.valor_total, 0)

  el.innerText = 'R$ ' + total.toFixed(2)
}

// =========================
// RENDER ITENS
// =========================
function renderItens() {
  const tbody = document.getElementById('tbodyItensNF')
  if (!tbody) return

  tbody.innerHTML = ''

  itensNF.forEach((item, index) => {
    tbody.innerHTML += `
      <tr>
        <td>${item.codigo}</td>
        <td>R$ ${item.valor_unitario}</td>
        <td>${item.quantidade}</td>
        <td>R$ ${item.valor_total.toFixed(2)}</td>
        <td>
          <button onclick="removerItem(${index})">❌</button>
        </td>
      </tr>
    `
  })
}

// =========================
// ADICIONAR ITEM
// =========================
window.adicionarItem = function () {
  const produto = document.getElementById('produtoSelect')
  const quantidade = document.getElementById('quantidadeNF')

  if (!produto.value || !quantidade.value) {
    alert('Preencha produto e quantidade')
    return
  }

  const option = produto.selectedOptions[0]

  const valorUnitario = Number(option.dataset.valor)
  const qtd = Number(quantidade.value)

  itensNF.push({
    produto_id: produto.value,
    codigo: option.textContent,
    quantidade: qtd,
    valor_unitario: valorUnitario,
    valor_total: valorUnitario * qtd
  })

  renderItens()
  atualizarTotalNF()
}

// =========================
// REMOVER ITEM
// =========================
window.removerItem = function (index) {
  itensNF.splice(index, 1)
  renderItens()
  atualizarTotalNF()
}

// =========================
// GERAR PARCELAS
// =========================
window.gerarParcelas = function () {
  const total = itensNF.reduce((s, i) => s + i.valor_total, 0)

  if (total <= 0) {
    alert('Adicione itens primeiro')
    return
  }

  boletos = []
  const parcela = total / 3

  for (let i = 1; i <= 3; i++) {
    boletos.push({
      valor: parcela,
      vencimento: new Date()
    })
  }

  renderBoletos()
}

// =========================
// RENDER BOLETOS
// =========================
function renderBoletos() {
  const tbody = document.getElementById('tbodyBoletos')
  if (!tbody) return

  tbody.innerHTML = ''

  boletos.forEach((b, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>R$ ${b.valor.toFixed(2)}</td>
        <td>${new Date(b.vencimento).toLocaleDateString()}</td>
        <td>✔</td>
      </tr>
    `
  })
}

// =========================
// SALVAR NF COMPLETA
// =========================
window.salvarNF = async function () {
  try {
    const cliente = document.getElementById('clienteSelect').value
    const numero = document.getElementById('nfNumero').value
    const data = document.getElementById('nfData').value

    if (!cliente || !numero) {
      alert('Preencha cliente e número')
      return
    }

    // 1. NF
    const { data: nf, error: erroNF } = await supabase
      .from('notas_fiscais')
      .insert([{
        cliente_id: cliente,
        numero_nf: numero,
        data_nf: data
      }])
      .select()
      .single()

    if (erroNF) throw erroNF

    const nf_id = nf.id

    // 2. ITENS
    if (itensNF.length > 0) {
      const lista = itensNF.map(i => ({
        nf_id,
        produto_id: i.produto_id,
        quantidade: i.quantidade
      }))

      const { error } = await supabase
        .from('notas_fiscais_itens')
        .insert(lista)

      if (error) throw error
    }

    // 3. BOLETOS
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
    console.error('Erro salvar:', e)
    alert('Erro ao salvar NF')
  }
}

// =========================
// INIT
// =========================
carregarClientes()
carregarProdutos()
