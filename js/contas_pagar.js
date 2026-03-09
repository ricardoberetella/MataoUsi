import { supabase, verificarLogin } from "./auth.js";

const listaPagar = document.getElementById("listaPagar");
const cardsBancos = document.getElementById("cardsBancos");

const filtroBanco = document.getElementById("filtroBanco");
const filtroData = document.getElementById("filtroData");
const filtroMes = document.getElementById("filtroMes");
const filtroStatus = document.getElementById("filtroStatus");
const filtroTipo = document.getElementById("filtroTipo");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpar = document.getElementById("btnLimparFiltros");

const btnNovo = document.getElementById("btnNovoPagar");
const btnTransferir = document.getElementById("btnTransferir");
const btnNfEntrada = document.getElementById("btnNfEntrada");

const modalLancamento = document.getElementById("modalLancamento");
const btnSalvarModal = document.getElementById("btnSalvarModal");
const btnFecharModal = document.getElementById("btnFecharModal");
const tituloModalLancamento = document.getElementById("tituloModalLancamento");

const modalNfEntrada = document.getElementById("modalNfEntrada");
const btnSalvarNfEntrada = document.getElementById("btnSalvarNfEntrada");
const btnFecharNfEntrada = document.getElementById("btnFecharNfEntrada");

const nf_descricao = document.getElementById("nf_descricao");
const nf_valor = document.getElementById("nf_valor");
const nf_data = document.getElementById("nf_data");
const nf_banco = document.getElementById("nf_banco");

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
let bancosLancamento = [];
let bancosTransferencia = [];
let roleUsuario = "admin";
let contaEditandoId = null;

function moeda(v){
return Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function parseValor(v){
return Number(String(v||"").replace(/./g,"").replace(",",".").replace(/[^\d.-]/g,""))||0;
}

function formatarDataBR(d){
if(!d) return "-";
const p=String(d).split("-");
return `${p[2]}/${p[1]}/${p[0]}`;
}

function formatarValorInput(v){
return Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
}

function getFaixaMes(v){
if(!v) return null;
const [ano,mes]=v.split("-");
const inicio=`${ano}-${mes}-01`;
const ultimo=new Date(Number(ano),Number(mes),0).getDate();
const fim=`${ano}-${mes}-${String(ultimo).padStart(2,"0")}`;
return{inicio,fim};
}

function ehVisualizador(){
return roleUsuario==="viewer"||roleUsuario==="visualizador";
}

function aplicarPermissoesUI(){
const ocultar=ehVisualizador();
if(btnTransferir) btnTransferir.style.display=ocultar?"none":"inline-flex";
if(btnNovo) btnNovo.style.display=ocultar?"none":"inline-flex";
if(btnNfEntrada) btnNfEntrada.style.display=ocultar?"none":"inline-flex";
}

async function carregarRoleUsuario(){
try{
const {data}=await supabase.auth.getUser();
const user=data?.user;
roleUsuario=user?.user_metadata?.role||"admin";
aplicarPermissoesUI();
}catch{
roleUsuario="admin";
aplicarPermissoesUI();
}
}

function preencherSelect(select,itens,placeholder){
if(!select) return;
select.innerHTML=`<option value="">${placeholder}</option>`;
itens.forEach(b=>{
const o=document.createElement("option");
o.value=b.id;
o.textContent=b.nome;
select.appendChild(o);
});
}

function renderCards(){
cardsBancos.innerHTML="";
bancos.forEach(b=>{
const card=document.createElement("div");
card.style.flex="1";
card.style.minWidth="220px";
card.style.background="rgba(30,41,59,.7)";
card.style.padding="15px";
card.style.borderRadius="12px";
card.style.border="1px solid rgba(56,189,248,.25)";

card.innerHTML=`

<div style="color:#38bdf8;font-size:12px;text-transform:uppercase;margin-bottom:8px">
${b.nome}
</div>
<div style="font-size:24px;font-weight:bold;color:#fff">
${moeda(b.saldo)}
</div>
`;
cardsBancos.appendChild(card);
});
}

async function carregarBancos(){

const {data}=await supabase.from("bancos").select("*").order("nome");
bancos=data||[];

bancosLancamento=bancos;
bancosTransferencia=bancos;

filtroBanco.innerHTML=`<option value="">Todos</option>`;
bancos.forEach(b=>{
const o=document.createElement("option");
o.value=b.id;
o.textContent=b.nome;
filtroBanco.appendChild(o);
});

preencherSelect(m_banco,bancosLancamento,"Banco...");
preencherSelect(nf_banco,bancosTransferencia,"Banco...");
preencherSelect(t_origem,bancosTransferencia,"Origem...");
preencherSelect(t_destino,bancosTransferencia,"Destino...");

renderCards();
}

async function carregarContas(){

let query=supabase
.from("contas_pagar")
.select("*")
.order("vencimento",{ascending:true});

if(filtroBanco.value) query=query.eq("banco_id",filtroBanco.value);
if(filtroData.value) query=query.eq("vencimento",filtroData.value);

if(filtroMes.value){
const faixa=getFaixaMes(filtroMes.value);
query=query.gte("vencimento",faixa.inicio).lte("vencimento",faixa.fim);
}

if(filtroStatus.value!=="TODOS")
query=query.eq("status",filtroStatus.value);

if(filtroTipo && filtroTipo.value!=="TODOS")
query=query.eq("tipo",filtroTipo.value);

const {data}=await query;

if(!data||!data.length){
listaPagar.innerHTML=`<tr><td colspan="7">Nenhum lançamento encontrado</td></tr>`;
return;
}

listaPagar.innerHTML=data.map(l=>{

const banco=bancos.find(b=>b.id===l.banco_id);
const tipo=l.tipo||"SAIDA";

let entrada="-";
let saida="-";

if(tipo==="ENTRADA"){
entrada=`<span style="color:#22c55e;font-weight:bold">${moeda(l.valor)}</span>`;
}else{
saida=`<span style="color:#ef4444;font-weight:bold">${moeda(l.valor)}</span>`;
}

return`

<tr>
<td>${formatarDataBR(l.vencimento)}</td>
<td>${banco?.nome||"-"}</td>
<td>${l.descricao||"-"}</td>
<td>${entrada}</td>
<td>${saida}</td>
<td>${l.status}</td>
<td></td>
</tr>
`;
}).join("");

}

async function salvarConta(){

const descricao=m_descricao.value.trim();
const valor=parseValor(m_valor.value);
const vencimento=m_data.value;
const banco_id=m_banco.value;

await supabase.from("contas_pagar").insert({
descricao,
valor,
vencimento,
banco_id,
status:"ABERTO",
tipo:"SAIDA"
});

modalLancamento.style.display="none";
await carregarContas();
}

async function salvarNfEntrada(){

const descricao=nf_descricao.value.trim();
const valor=parseValor(nf_valor.value);
const data=nf_data.value;
const banco=nf_banco.value;

await supabase.from("contas_pagar").insert({
descricao,
valor,
vencimento:data,
banco_id:banco,
status:"PAGO",
tipo:"ENTRADA"
});

modalNfEntrada.style.display="none";

await carregarBancos();
await carregarContas();
}

btnFiltrar.onclick=carregarContas;

btnLimpar.onclick=()=>{
filtroBanco.value="";
filtroData.value="";
filtroMes.value="";
filtroStatus.value="ABERTO";
filtroTipo.value="TODOS";
carregarContas();
};

btnNovo.onclick=()=>modalLancamento.style.display="flex";

btnSalvarModal.onclick=salvarConta;

btnFecharModal.onclick=()=>modalLancamento.style.display="none";

btnNfEntrada.onclick=()=>{
nf_data.value=new Date().toISOString().slice(0,10);
modalNfEntrada.style.display="flex";
};

btnSalvarNfEntrada.onclick=salvarNfEntrada;

btnFecharNfEntrada.onclick=()=>modalNfEntrada.style.display="none";

document.addEventListener("DOMContentLoaded",async()=>{
await verificarLogin();
await carregarRoleUsuario();
await carregarBancos();
await carregarContas();
});
