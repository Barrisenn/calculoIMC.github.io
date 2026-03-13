const botaoCalcular = document.getElementById("btnCalcular");
const btnLimpar = document.getElementById("btnLimpar");

const classificacoes = [
  { limite: 18.5, mensagem: "Abaixo do peso!", classe: "imc-baixo" },
  { limite: 25,   mensagem: "Peso ideal!",     classe: "imc-ideal" },
  { limite: 30,   mensagem: "Levemente acima do peso!", classe: "imc-leve" },
  { limite: 35,   mensagem: "Obesidade Grau I",  classe: "imc-ob1" },
  { limite: 40,   mensagem: "Obesidade Grau II", classe: "imc-ob2" },
  { limite: Infinity, mensagem: "Obesidade Grau III – procure um médico!", classe: "imc-ob3" },
];

function classificarIMC(imc) {
  return classificacoes.find(c => imc < c.limite);
}

function validarCampos(peso, altura) {
  let valido = true;

  const erroPeso = document.getElementById("erroPeso");
  const erroAltura = document.getElementById("erroAltura");
  erroPeso.textContent = "";
  erroAltura.textContent = "";

  if (!peso || peso <= 0 || peso > 500) {
    erroPeso.textContent = "Informe um peso válido entre 1 e 500 kg.";
    valido = false;
  }
  if (!altura || altura < 50 || altura > 300) {
    erroAltura.textContent = "Informe uma altura válida entre 50 e 300 cm.";
    valido = false;
  }

  return valido;
}

function carregarHistorico() {
  return JSON.parse(localStorage.getItem("historicoIMC") || "[]");
}

function salvarHistorico(historico) {
  localStorage.setItem("historicoIMC", JSON.stringify(historico));
}

function renderizarHistorico() {
  const lista = document.getElementById("listaHistorico");
  const historico = carregarHistorico();
  const secao = document.getElementById("secaoHistorico");

  lista.innerHTML = "";

  if (historico.length === 0) {
    secao.classList.add("oculto");
    return;
  }

  secao.classList.remove("oculto");
  historico.slice().reverse().forEach(item => {
    const li = document.createElement("li");
    li.className = item.classe;
    li.textContent = `${item.data} — Peso: ${item.peso} kg | Altura: ${item.altura} cm | IMC: ${item.imc} (${item.mensagem})`;
    lista.appendChild(li);
  });
}

function calculandoIMC() {
  const peso = parseFloat(document.getElementById("peso").value);
  const alturaCm = parseFloat(document.getElementById("altura").value);
  const resultadoEl = document.getElementById("resultado");

  if (!validarCampos(peso, alturaCm)) {
    resultadoEl.className = "resultado oculto";
    return;
  }

  const altura = alturaCm / 100;
  const imc = (peso / (altura * altura)).toFixed(2);
  const { mensagem, classe } = classificarIMC(parseFloat(imc));

  resultadoEl.textContent = `Seu IMC é ${imc} — ${mensagem}`;
  resultadoEl.className = `resultado ${classe}`;

  const historico = carregarHistorico();
  historico.push({
    data: new Date().toLocaleString("pt-BR"),
    peso,
    altura: alturaCm,
    imc,
    mensagem,
    classe,
  });
  salvarHistorico(historico);
  renderizarHistorico();
}

btnLimpar.addEventListener("click", () => {
  localStorage.removeItem("historicoIMC");
  renderizarHistorico();
});

botaoCalcular.addEventListener("click", calculandoIMC);

renderizarHistorico();
