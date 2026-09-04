# Rotina de medicação

Aplicativo pessoal para acompanhar a rotina diária de medicação, com marcação por dia, visão do mês, controle de estoque e avisos na tela bloqueada do celular. Tudo sincroniza entre os aparelhos pela sua conta, e há uma função que roda sozinha na nuvem para lembrar das doses e da hora de pedir a receita.

## As peças do projeto

O aplicativo é uma página única, o index.html, publicada no GitHub Pages em https://isabellavfortunato.github.io/Isabellamed/. Junto dela ficam os arquivos que a transformam em aplicativo instalável no iPhone, que são o site.webmanifest, o firebase-messaging-sw.js e os ícones.

O restante vive no Firebase, no projeto isabella-meds, no plano Blaze. Ali estão o Firestore, que guarda os seus dados, a Authentication, que cuida do login por email e senha, o Cloud Messaging, que entrega os avisos, e a Cloud Function avisarMedicamentos, que roda em horários combinados e dispara as notificações.

## O aplicativo

Ao abrir, a página pede login com email e senha, e tem também o link de esqueci a minha senha, que manda um endereço de troca para o seu email. Depois de entrar, o aplicativo mostra três abas.

A aba Dia traz a lista dos remédios do dia, cada um com a sua própria caixinha para marcar conforme você toma. Quando você conclui todos os itens do dia, cai uma animação de confete com um parabéns. Se você tocar numa notificação de dose, o aplicativo abre já perguntando se você tomou aquele remédio, para marcar com um toque.

A aba Mês mostra um calendário em que cada dia fica mais preenchido conforme você marcou os remédios, com um resumo de quantos dias ficaram completos e um botão para limpar o mês.

A aba Estoque mostra quanto resta de cada remédio, quantos dias isso deve durar e a data aproximada em que acaba, com uma barrinha de progresso. Quando algo fica perto do fim, o cartão fica destacado e aparece um aviso no alto da aba do dia lembrando de providenciar a receita.

## Como os dados são guardados

No Firestore, cada pessoa tem um documento em usuarios com o seu identificador de login. Dentro dele ficam os dias marcados, o estoque e a lista de aparelhos que recebem aviso. O estoque é guardado em miligramas, com uma data de início da contagem, e cada dose marcada na aba do dia desconta do estoque, enquanto desmarcar devolve. A contagem atual começa em 21 de agosto de 2026.

## Os avisos na tela bloqueada

Os avisos são entregues pelo Cloud Messaging. O firebase-messaging-sw.js é a peça que fica no aparelho e recebe o aviso, e a função avisarMedicamentos é a peça que roda na nuvem e dispara.

Essa função acorda de meia em meia hora, entre 10h e 20h de Brasília. Em cada horário ela confere se há dose naquele minuto e, se você ainda não tiver marcado a dose como tomada, manda o lembrete. Uma vez por dia, às 10h, ela também calcula quantos dias faltam de cada remédio e, quando falta uma semana ou menos, manda um aviso com o título Pedir a receita, listando o que está acabando. Enquanto o remédio seguir baixo, esse aviso repete a cada manhã, como uma cobrança suave até a receita sair.

A antecedência de sete dias e o horário das 10h estão em linhas marcadas no começo do código da função, então dá para trocar com facilidade.

## A rotina cadastrada

- 10:00, atentah 60 mg, 1 comprimido de 60 mg
- 16:30, alprazolam 0,5 mg
- 17:00, lubip 40 mg, 2 comprimidos de 20 mg, com o almoço
- 18:00, carbonato de lítio 900 mg, 3 comprimidos de 300 mg
- 18:00, lamotrigina 200 mg, 2 comprimidos de 100 mg
- 19:00, quetiapina 25 mg
- 20:00, alprazolam 0,5 mg

## O estoque acompanhado

Os remédios acompanhados no estoque são atentah, lubip, lamotrigina, carbonato de lítio, quetiapina e alprazolam. A contagem fica em miligramas, o que permite lidar com comprimidos de gramagens diferentes, como no caso do alprazolam. Se em algum momento a conta divergir do que você tem na mão, use o botão de corrigir a quantidade dentro da aba de estoque, que grava o valor certo e passa a valer a partir dali.

## Como atualizar o aplicativo

1. Entre no repositório do GitHub onde estão os arquivos do aplicativo.
2. Clique em Add file e depois em Upload files, e suba o index.html novo por cima do antigo, mantendo o nome exato.
3. Clique em Commit changes. Em um ou dois minutos a página atualiza sozinha.
4. No iPhone, se a versão antiga ainda aparecer, feche e abra o aplicativo, ou dê um refresh forte no Safari.

## Como atualizar a função dos avisos

1. Abra o console em https://console.firebase.google.com/project/isabella-meds/functions ou o Cloud Run do mesmo projeto.
2. Entre na função avisarMedicamentos e abra a aba Origem.
3. Apague o conteúdo do arquivo principal, o index.js, e cole no lugar o conteúdo do arquivo da função.
4. Clique em salvar e reimplantar. A publicação leva um ou dois minutos, e o agendamento e o nome continuam os mesmos.

## Regras do Firestore

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /usuarios/{uid} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }

Essas regras deixam cada conta enxergar apenas os próprios dados.

## Chaves e configuração

No index.html ficam o firebaseConfig, que identifica o projeto, e a chave pública do Web Push, usada para registrar o aparelho que vai receber os avisos. A chave da Web do Firebase não é secreta e pode ficar visível no arquivo, porque quem protege os seus dados são as regras do Firestore e o login. A conta de serviço que a função usa para enviar os avisos fica no próprio Firebase e não aparece em nenhum arquivo do aplicativo.

## Arquivos do projeto

- index.html, o aplicativo inteiro
- site.webmanifest, a identidade do aplicativo instalado, com nome, cores e ícones
- firebase-messaging-sw.js, o recebedor dos avisos no aparelho
- os ícones e favicons referidos pelo manifesto e pelo index
- a função avisarMedicamentos, publicada no Firebase como index.js dentro da pasta functions
