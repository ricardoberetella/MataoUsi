const supabase = window.supabaseClient;

const tabela = document.getElementById("listaPagar");

function moeda(v){
 return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})
}

function dataBR(data){
 if(!data)return "-"
 return new Date(data+"T00:00:00").toLocaleDateString("pt-BR")
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

 if(!data || data.length===0){
 tabela.innerHTML=`<tr><td colspan="7" style="text-align:center">Nenhum lançamento</td></tr>`
 return
 }

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
 ${l.status!=="PAGO"
 ? `<button onclick="marcarPago(${l.id})" class="btn btn-verde">Pagar</button>`
 : `<span style="color:#22c55e;font-weight:bold;">Pago</span>`
 }
 </td>
 `

 tabela.appendChild(tr)

 })

}

async function marcarPago(id){

 const {error}=await supabase
 .from("contas_pagar")
 .update({status:"PAGO"})
 .eq("id",id)

 if(error){
 console.error(error)
 return
 }

 carregarContas()

}

window.marcarPago=marcarPago

carregarContas()
