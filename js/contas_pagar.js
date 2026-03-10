const supabase = window.supabaseClient;

const tabela = document.getElementById("listaPagar");

const modalNovo = document.getElementById("modalNovoPagar");
const modalNF = document.getElementById("modalNfEntrada");
const modalTransfer = document.getElementById("modalTransferencia");

function moeda(v){

return Number(v).toLocaleString("pt-BR",{
style:"currency",
currency:"BRL"
})

}

function dataBR(data){

return new Date(data).toLocaleDateString("pt-BR")

}

async function carregarContas(){

const {data,error}=await supabase
.from("contas_pagar")
.select("*,bancos(nome)")
.order("vencimento",{ascending:false})

if(error){
console.error(error)
return
}

tabela.innerHTML=""

data.forEach(l=>{

let entrada="-"
let saida="-"

if(l.tipo==="ENTRADA"){
entrada=`<span class="valor-entrada">${moeda(l.valor)}</span>`
}else{
saida=`<span class="valor-saida">${moeda(l.valor)}</span>`
}

const tr=document.createElement("tr")

tr.innerHTML=`

<td>${dataBR(l.vencimento)}</td>
<td>${l.bancos?.nome||"-"}</td>
<td>${l.descricao}</td>
<td>${entrada}</td>
<td>${saida}</td>
<td>${l.status}</td>
<td>
<button onclick="pagar(${l.id})" class="btn btn-verde">Pagar</button>
</td>

`

tabela.appendChild(tr)

})

}

async function pagar(id){

await supabase
.from("contas_pagar")
.update({status:"PAGO"})
.eq("id",id)

carregarContas()

}

window.pagar=pagar

/* MODAIS */

document.getElementById("btnNovoPagar").onclick=()=>{
modalNovo.style.display="flex"
}

document.getElementById("btnNfEntrada").onclick=()=>{
modalNF.style.display="flex"
}

document.getElementById("btnTransferir").onclick=()=>{
modalTransfer.style.display="flex"
}

document.getElementById("btnCancelarNovoPagar").onclick=()=>{
modalNovo.style.display="none"
}

document.getElementById("btnCancelarNfEntrada").onclick=()=>{
modalNF.style.display="none"
}

document.getElementById("btnCancelarTransferencia").onclick=()=>{
modalTransfer.style.display="none"
}

/* SALVAR */

document.getElementById("btnSalvarNovoPagar").onclick=async()=>{

const banco=document.getElementById("novoBanco").value
const desc=document.getElementById("novoDescricao").value
const valor=parseFloat(document.getElementById("novoValor").value)
const data=document.getElementById("novoVencimento").value

await supabase.from("contas_pagar").insert({

banco_id:banco,
descricao:desc,
valor:valor,
vencimento:data,
tipo:"SAIDA",
status:"ABERTO"

})

modalNovo.style.display="none"

carregarContas()

}

document.getElementById("btnSalvarNfEntrada").onclick=async()=>{

const banco=document.getElementById("nfBanco").value
const desc=document.getElementById("nfDescricao").value
const valor=parseFloat(document.getElementById("nfValor").value)
const data=document.getElementById("nfVencimento").value

await supabase.from("contas_pagar").insert({

banco_id:banco,
descricao:desc,
valor:valor,
vencimento:data,
tipo:"ENTRADA",
status:"ABERTO"

})

modalNF.style.display="none"

carregarContas()

}

document.getElementById("btnSalvarTransferencia").onclick=async()=>{

const origem=document.getElementById("transferBancoOrigem").value
const destino=document.getElementById("transferBancoDestino").value
const desc=document.getElementById("transferDescricao").value
const valor=parseFloat(document.getElementById("transferValor").value)
const data=document.getElementById("transferData").value

await supabase.from("contas_pagar").insert([

{
banco_id:origem,
descricao:desc+" saída",
valor:valor,
vencimento:data,
tipo:"SAIDA",
status:"PAGO"
},

{
banco_id:destino,
descricao:desc+" entrada",
valor:valor,
vencimento:data,
tipo:"ENTRADA",
status:"PAGO"
}

])

modalTransfer.style.display="none"

carregarContas()

}

carregarContas()
