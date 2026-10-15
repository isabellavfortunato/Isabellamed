/* Avisos dos medicamentos.

   A função acorda de meia em meia hora, entre 10 e 20 horas de Brasília,
   e confere se aquele minuto é o horário de alguma dose. Se for, ela olha
   no documento da pessoa se a dose do dia já foi marcada como tomada.
   Se já tiver sido, fica quieta. Se não, manda o aviso para os aparelhos
   cadastrados.

   Além disso, uma vez por dia, às 10h, ela calcula quantos dias faltam de
   cada remédio, com a mesma conta do aplicativo, e avisa para pedir a receita
   quando faltar uma semana ou menos para acabar. */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

// Endereço onde o aplicativo está publicado, para o toque na notificação abrir nele.
const ENDERECO_DO_APP = "https://isabellavfortunato.github.io/Isabellamed/";

const FUSO = "America/Sao_Paulo";

const DOSES = [
  { id: "atentah", hora: "10:00", titulo: "Atentah 60 mg", corpo: "1 comprimido de 60 mg" },
  { id: "lubip", hora: "17:00", titulo: "Lubip 40 mg", corpo: "2 comprimidos de 20 mg, com o almoço" },
  { id: "litio-20", hora: "18:00", titulo: "Carbonato de lítio 900 mg", corpo: "3 comprimidos de 300 mg" },
  { id: "lamitor", hora: "18:00", titulo: "Lamotrigina 200 mg", corpo: "2 comprimidos de 100 mg" },
  { id: "quetiapina", hora: "19:00", titulo: "Quetiapina 25 mg", corpo: "" },
  { id: "alprazolam-noite", hora: "20:00", titulo: "Alprazolam 0,5 mg", corpo: "" },
  { id: "ansiodoron", hora: "20:00", titulo: "Ansiodoron", corpo: "2 comprimidos" }
];

// ---------- Aviso de receita ----------
// Estes números são iguais aos do aplicativo, para a conta bater com o que
// você vê na aba de estoque.
const DATA_BASE_PADRAO = "2026-08-21";
const DIAS_RECEITA = 7;        // avisa quando faltar esta quantidade de dias ou menos
const HORA_RECEITA = "10:00";  // uma vez por dia, neste horário

const MEDS_ESTOQUE = {
  atentah:     { curto: "Atentah",            diaria: 60,  baseMg: 39 * 60 },
  lubip:       { curto: "Lubip",              diaria: 40,  baseMg: 38 * 20 },
  lamotrigina: { curto: "lamotrigina",        diaria: 200, baseMg: 39 * 100 },
  litio:       { curto: "carbonato de lítio", diaria: 900, baseMg: 174 * 300 },
  quetiapina:  { curto: "quetiapina",         diaria: 25,  baseMg: 59 * 50 + 32 * 25 },
  alprazolam:  { curto: "alprazolam",         diaria: 0.5, baseMg: 52 * 1 + 8 * 2 },
  ansiodoron:  { curto: "Ansiodoron",         diaria: 2,   baseMg: 44 }
};

const DOSES_MG = {
  "atentah":          { med: "atentah",     mg: 60 },
  "lubip":            { med: "lubip",       mg: 40 },
  "litio-20":         { med: "litio",       mg: 900 },
  "lamitor":          { med: "lamotrigina", mg: 200 },
  "quetiapina":       { med: "quetiapina",  mg: 25 },
  "alprazolam-noite": { med: "alprazolam",  mg: 0.5 },
  "ansiodoron":       { med: "ansiodoron",  mg: 2 }
};

function diasRestantes(dados, med) {
  const cfg = MEDS_ESTOQUE[med];
  const estoque = dados.estoque || {};
  const mgMap = estoque.mg || {};
  const base = estoque.data || DATA_BASE_PADRAO;
  const baseMg = (typeof mgMap[med] === "number") ? mgMap[med] : cfg.baseMg;
  let consumido = 0;
  const dias = dados.dias || {};
  Object.keys(dias).forEach(function (dia) {
    if (dia < base) return;
    const o = dias[dia] || {};
    Object.keys(DOSES_MG).forEach(function (k) {
      if (o[k] && DOSES_MG[k].med === med) consumido += DOSES_MG[k].mg;
    });
    if (med === "alprazolam" && o.sos) consumido += o.sos * 0.5;
  });
  const restante = Math.max(0, baseMg - consumido);
  return { restante: restante, dias: restante / cfg.diaria };
}

function receitasParaAvisar(dados) {
  const baixos = [];
  Object.keys(MEDS_ESTOQUE).forEach(function (med) {
    const r = diasRestantes(dados, med);
    if (r.dias < DIAS_RECEITA) {
      baixos.push({ curto: MEDS_ESTOQUE[med].curto, restante: r.restante, dias: r.dias });
    }
  });
  baixos.sort(function (a, b) { return a.dias - b.dias; });
  return baixos;
}

async function removerMortos(refDoc, tokens, resposta) {
  const mortos = [];
  resposta.responses.forEach(function (r, i) {
    if (r.success) return;
    const codigo = r.error && r.error.code ? r.error.code : "sem código";
    const detalhe = r.error && r.error.message ? r.error.message : "";
    console.log("Aparelho " + i + " recusado: " + codigo + " " + detalhe);
    if (codigo === "messaging/registration-token-not-registered" ||
        codigo === "messaging/invalid-registration-token" ||
        codigo === "messaging/invalid-argument") {
      mortos.push(tokens[i]);
    }
  });
  if (mortos.length > 0) {
    console.log("Removendo " + mortos.length + " aparelhos que não existem mais.");
    await refDoc.update({ tokens: FieldValue.arrayRemove.apply(null, mortos) });
  }
}
// --------------------------------------

function agoraEmBrasilia() {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  const p = {};
  partes.forEach(function (x) { p[x.type] = x.value; });
  return {
    dia: p.year + "-" + p.month + "-" + p.day,
    hora: p.hour + ":" + p.minute
  };
}

exports.avisarMedicamentos = onSchedule(
  { schedule: "0,30 10-20 * * *", timeZone: FUSO, region: "southamerica-east1" },
  async function () {
    const agora = agoraEmBrasilia();
    const devidas = DOSES.filter(function (d) { return d.hora === agora.hora; });
    const horaDaReceita = (agora.hora === HORA_RECEITA);
    console.log("Acordei em " + agora.dia + " às " + agora.hora +
      ". Doses deste horário: " + devidas.length +
      (horaDaReceita ? ". Também vou conferir as receitas." : ""));
    if (devidas.length === 0 && !horaDaReceita) return;

    const usuarios = await db.collection("usuarios").get();
    console.log("Documentos em usuarios: " + usuarios.size);

    for (const doc of usuarios.docs) {
      const dados = doc.data() || {};
      const tokens = Array.isArray(dados.tokens) ? dados.tokens : [];
      console.log("Usuário " + doc.id + " tem " + tokens.length + " aparelhos cadastrados.");
      if (tokens.length === 0) continue;

      const marcadoHoje = (dados.dias && dados.dias[agora.dia]) ? dados.dias[agora.dia] : {};

      for (const dose of devidas) {
        if (marcadoHoje[dose.id]) {
          console.log("Pulei " + dose.id + " porque já está marcada como tomada hoje.");
          continue;
        }
        console.log("Enviando " + dose.id + " para " + tokens.length + " aparelhos.");

        const resposta = await getMessaging().sendEachForMulticast({
          tokens: tokens,
          notification: { title: dose.titulo, body: dose.corpo || "Hora de tomar." },
          webpush: {
            notification: {
              title: dose.titulo,
              body: dose.corpo || "Hora de tomar.",
              icon: "icone-192.png",
              badge: "favicon-32x32.png",
              tag: "dose-" + dose.id
            },
            fcmOptions: { link: ENDERECO_DO_APP + "?dose=" + dose.id }
          }
        });

        console.log("Resultado de " + dose.id + ": " + resposta.successCount +
          " aceitos e " + resposta.failureCount + " recusados.");

        await removerMortos(doc.ref, tokens, resposta);
      }

      // Uma vez por dia, avisa para pedir a receita do que está para acabar.
      if (horaDaReceita) {
        const baixos = receitasParaAvisar(dados);
        if (baixos.length > 0) {
          const nomes = baixos.map(function (b) {
            const dias = Math.max(0, Math.round(b.dias));
            if (b.restante <= 0) return b.curto + " (já acabou)";
            return b.curto + " (cerca de " + dias + (dias === 1 ? " dia" : " dias") + ")";
          }).join(", ");
          console.log("Aviso de receita para " + doc.id + ": " + nomes);

          const respostaReceita = await getMessaging().sendEachForMulticast({
            tokens: tokens,
            notification: { title: "Pedir a receita", body: "Está acabando: " + nomes + "." },
            webpush: {
              notification: {
                title: "Pedir a receita",
                body: "Está acabando: " + nomes + ".",
                icon: "icone-192.png",
                badge: "favicon-32x32.png",
                tag: "receita"
              },
              fcmOptions: { link: ENDERECO_DO_APP }
            }
          });

          console.log("Receita: " + respostaReceita.successCount +
            " aceitos e " + respostaReceita.failureCount + " recusados.");

          await removerMortos(doc.ref, tokens, respostaReceita);
        }
      }
    }
  }
);
