import { supabase, verificarLogin } from "./auth.js";

const listaPagar = document.getElementById("listaPagar");
const cardsBancos = document.getElementById("cardsBancos");

const filtroBanco = document.getElementById("filtroBanco");
const filtroData = document.getElementById("filtroData");
const filtroMes = document.getElementById("filtroMes");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpar = document.getElementById("btnLimparFiltros");

const btnNovo = document.getElementById("btnNovoPagar");
const btnTransferir = document.getElementById("btnTransferir");

const modalLancamento = document.getElementById("modalLancamento");
const btnSalvarModal = document.getElementById("btnSalvarModal");
const btnFecharModal = document.getElementById("btnFecharModal");

const modalTransferencia = document.getElementById("modalTransferencia");
const btnSalvarTransferencia = document.getElementById("btnSalvarTransferencia");
const btnFecharTransferencia = document.getElementById("btnFecharTransferencia");

const m_descricao = document.getElementById("m_descricao");
const m_valor = document.getElementById("m_valor");
const m_data = document.getElementById("m_data");
const m_banco = document.getElementById("m_banco");

const t_origem = document.getElementById("t_origem");
const t_destino = document.getElementById("t_destino");
const t_valor = document.getElementById("t_valor");
const t_data = document.getElementById("t_data");
const t_obs = document.getElementById("t_obs");

const listaTransferencias = document.getElementById("listaTransferencias");

let bancos = [];

function moeda(v) {
    return Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function parseValor(v){
    return Number(
        String(v)
        .replace(/\./g,"")
        .replace(",",".")
        .replace(/[^\d.-]/g,"")
    ) || 0
}

function formatarDataBR(d){
    if(!d) return "-"
    const [a,m,dia]=d.split("-")
    return `${dia}/${m}/${a}`
}

async function carregarBancos(){

    const {data,error} = await supabase
    .from("bancos")
    .select("*")
    .order("nome")

    if(error) return console.log(error)

    bancos = data

    cardsBancos.innerHTML=""

    filtroBanco.innerHTML=`<option value="">Todos</option>`
    m_banco.innerHTML=`<option value="">Selecione o Banco...</option>`
    t_origem.innerHTML=`<option value="">Origem...</option>`
    t_destino.innerHTML=`<option value="">Destino...</option>`

    bancos.forEach(b=>{

        const card=document.createElement("div")
        card.style.flex="1"
        card.style.minWidth="220px"
        card.style.background="rgba(30,41,59,.7)"
        card.style.padding="15px"
        card.style.borderRadius="12px"

        card.innerHTML=`
        <div style="color:#38bdf8;font-size:12px">${b.nome}</div>
        <div style="font-size:24px">${moeda(b.saldo)}</div>
        `

        cardsBancos.appendChild(card)

        const opt=document.createElement("option")
        opt.value=b.id
        opt.textContent=b.nome
        filtroBanco.appendChild(opt)

        const opt2=document.createElement("option")
        opt2.value=b.id
        opt2.textContent=b.nome
        m_banco.appendChild(opt2)

        const o=document.createElement("option")
        o.value=b.id
        o.textContent=b.nome
        t_origem.appendChild(o)

        const d=document.createElement("option")
        d.value=b.id
        d.textContent=b.nome
        t_destino.appendChild(d)

    })

}

async function carregarContas(){

    let query=supabase
    .from("contas_pagar")
    .select("*")
    .order("vencimento")

    if(filtroBanco.value)
        query=query.eq("banco_id",filtroBanco.value)

    if(filtroData.value)
        query=query.eq("vencimento",filtroData.value)

    if(filtroMes.value){

        const [a,m]=filtroMes.value.split("-")

        const inicio=`${a}-${m}-01`
        const fim=`${a}-${m}-31`

        query=query.gte("vencimento",inicio).lte("vencimento",fim)

    }

    const {data,error}=await query

    if(error) return console.log(error)

    if(!data.length){
        listaPagar.innerHTML=`<tr><td colspan="6">Nenhum lançamento encontrado</td></tr>`
        return
    }

    listaPagar.innerHTML=data.map(l=>{

        const banco=bancos.find(b=>b.id==l.banco_id)

        let botao="-"

        if(l.status!="PAGO"){
            botao=`<button onclick="pagar('${l.id}')" style="background:#10b981;border:none;padding:6px 10px;border-radius:6px">Pagar</button>`
        }

        return`
        <tr>
        <td>${l.descricao}</td>
        <td>${banco?.nome||"-"}</td>
        <td>${moeda(l.valor)}</td>
        <td>${formatarDataBR(l.vencimento)}</td>
        <td>${l.status}</td>
        <td>${botao}</td>
        </tr>
        `

    }).join("")
}

window.pagar=async(id)=>{

    const {data:conta}=await supabase
    .from("contas_pagar")
    .select("*")
    .eq("id",id)
    .single()

    const banco=bancos.find(b=>b.id==conta.banco_id)

    const novoSaldo=banco.saldo-conta.valor

    await supabase.from("bancos").update({saldo:novoSaldo}).eq("id",banco.id)

    await supabase.from("contas_pagar")
    .update({status:"PAGO"})
    .eq("id",id)

    await carregarBancos()
    await carregarContas()

}

async function salvarConta(){

    const valor=parseValor(m_valor.value)

    await supabase
    .from("contas_pagar")
    .insert({
        descricao:m_descricao.value,
        valor:valor,
        vencimento:m_data.value,
        banco_id:m_banco.value,
        status:"ABERTO"
    })

    modalLancamento.style.display="none"

    carregarContas()

}

async function transferir(){

    const valor=parseValor(t_valor.value)

    const origem=bancos.find(b=>b.id==t_origem.value)
    const destino=bancos.find(b=>b.id==t_destino.value)

    await supabase
    .from("bancos")
    .update({saldo:origem.saldo-valor})
    .eq("id",origem.id)

    await supabase
    .from("bancos")
    .update({saldo:destino.saldo+valor})
    .eq("id",destino.id)

    await supabase
    .from("transferencias_bancarias")
    .insert({
        origem_id:origem.id,
        destino_id:destino.id,
        valor:valor,
        data_transferencia:t_data.value,
        observacao:t_obs.value
    })

    modalTransferencia.style.display="none"

    carregarBancos()

}

btnFiltrar.onclick=carregarContas

btnLimpar.onclick=()=>{
    filtroBanco.value=""
    filtroData.value=""
    filtroMes.value=""
    carregarContas()
}

btnNovo.onclick=()=>modalLancamento.style.display="flex"

btnFecharModal.onclick=()=>modalLancamento.style.display="none"

btnSalvarModal.onclick=salvarConta

btnTransferir.onclick=()=>modalTransferencia.style.display="flex"

btnFecharTransferencia.onclick=()=>modalTransferencia.style.display="none"

btnSalvarTransferencia.onclick=transferir

document.addEventListener("DOMContentLoaded",async()=>{

    await verificarLogin()

    await carregarBancos()

    await carregarContas()

})
