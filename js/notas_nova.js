import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔴 COLOQUE SUA ANON KEY AQUI
const supabase = createClient(
  'https://uxtgicfuggpuyjybwawa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg'
)

let itensNF = []
let boletos = []

// =========================
// CARREGAR CLIENTES
// =========================
async function carregarClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome_fantasia, razao_social')

  if (error) {
    console.error('Erro clientes:', error)
    return
  }

  const select = document.getElementById('clienteSelect')

  select.innerHTML = '<option value="">Selecione o cliente</option>'

  data.forEach(c => {
    select.innerHTML += `
      <option value="${c.id}">
        ${c.nome_fantasia || c.razao_social}
      </option>
    `
  })
}

// =========================
// CARREGAR PRODUTOS
// =========================
async function carregarProdutos() {
  const { data, error } = await supabase
    .from('produtos')
    .select('id, descricao, valor_unitario')

  if (error) {
    console.error('Erro produtos:', error)
    return
  }

  const select = document.getElementById('produtoSelect')

  select.innerHTML = '<option value="">Selecione o produto</option>'

  data.forEach(p => {
    select.innerHTML += `
      <option value="${p.id}" data-valor="${p.valor_unitario || 0}">
        ${p.descricao} - R$ ${Number(p.valor_unitario || 0).toFixed(2)}
      </option>
    `
  })
}

// =========================
// ATUALIZAR TOTAL
// =========================
function atualizarTotalNF() {
  const el = document.getElementById('totalNF')

  let total = itensNF.reduce((s, i) => s + i.total, 0)

  el.innerText = 'R$ ' + total.toFixed(2)
}

// =========================
// RENDER ITENS
// =========================
function renderItens() {
  const tbody = document.getElementById('tbodyItensNF')
  tbody.innerHTML = ''

  itensNF.forEach((item, index) => {
    tbody.innerHTML += `
      <tr>
        <td>${item.nome}</td>
        <td>R$ ${item.valor.toFixed(2)}</td>
        <td>${item.quantidade}</td>
        <td>R$ ${item.total.toFixed(2)}</td>
        <td>
          <button onclick="removerItem(${index})">❌</button>
        </td>
      </tr>
    `
  })

  atualizarTotalNF()
}

// =========================
// ADICIONAR ITEM
// =========================
document.getElementById('btnAdicionarItem').onclick = () => {
  const select = document.getElementById('produtoSelect')
  const quantidade = Number(document.getElementById('quantidadeNF').value)

  if (!select.value || !quantidade) {
    alert('Selecione produto e quantidade')
    return
  }

  const option = select.options[select.selectedIndex]

  const valor = Number(option.dataset.valor)
  const nome = option.textContent

  itensNF.push({
    produto_id: select.value,
    nome,
    quantidade,
    valor,
    total: valor * quantidade
  })

  renderItens()
}

// =========================
// REMOVER ITEM
// =========================
window.removerItem = function (index) {
  itensNF.splice(index, 1)
  renderItens()
}

// =========================
// GERAR PARCELAS
// =========================
document.getElementById('btnGerarParcelas').onclick = () => {
  const total = itensNF.reduce((s, i) => s + i.total, 0)

  if (total <= 0) {
    alert('Sem valor')
    return
  }

  boletos = []

  const qtd = 3
  const valorParcela = total / qtd

  for (let i = 1; i <= qtd; i++) {
    const data = new Date()
    data.setMonth(data.getMonth() + i)

    boletos.push({
      parcela: i,
      valor: valorParcela,
      vencimento: data.toISOString().split('T')[0]
    })
  }

  renderBoletos()
}

// =========================
// RENDER BOLETOS
// =========================
function renderBoletos() {
  const tbody = document.getElementById('tbodyBoletos')
  tbody.innerHTML = ''

  boletos.forEach((b, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${b.parcela}</td>
        <td>R$ ${b.valor.toFixed(2)}</td>
        <td>${b.vencimento}</td>
        <td><button onclick="removerBoleto(${i})">❌</button></td>
      </tr>
    `
  })
}

window.removerBoleto = function (i) {
  boletos.splice(i, 1)
  renderBoletos()
}

// =========================
// SALVAR NF
// =========================
document.getElementById('btnSalvarNF').onclick = async () => {
  try {
    const cliente = document.getElementById('clienteSelect').value
    const numero = document.getElementById('nfNumero').value
    const data = document.getElementById('nfData').value

    if (!cliente || !numero) {
      alert('Preencha os dados')
      return
    }

    // 1. NF
    const { data: nf, error } = await supabase
      .from('notas_fiscais')
      .insert([{
        cliente_id: cliente,
        numero_nf: numero,
        dados_nf: data
      }])
      .select()
      .single()

    if (error) throw error

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
    console.error(e)
    alert('Erro ao salvar')
  }
}

// =========================
// INIT
// =========================
carregarClientes()
carregarProdutos()
