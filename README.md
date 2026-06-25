# Rotina de medicação

Página simples para acompanhar a rotina diária de medicação e suplemento, com marcação por dia, visão do mês inteiro e sincronização entre aparelhos pelo Firebase.

## O que é cada arquivo

O arquivo index.html é a página inteira, tudo está dentro dele. O README.md é só este guia. Mantenha o nome index.html, porque o GitHub Pages abre esse arquivo por padrão.

## Antes de publicar, configure o Firebase

Para os aparelhos compartilharem o mesmo histórico, a página guarda os dados no Firebase. Faça uma vez:

1. Abra o console do Firebase em https://console.firebase.google.com e entre com a sua conta Google. Abra o seu projeto ou crie um novo.
2. Em Build e depois Firestore Database, crie o banco. Pode começar em modo de produção.
3. Em Build e depois Authentication, ative o método Email e senha. Na aba Users, clique em Add user e crie o seu acesso com email e senha.
4. Em Configurações do projeto, na seção Seus apps, registre um app da Web se ainda não tiver, e copie o objeto firebaseConfig.
5. Abra o index.html e cole esse firebaseConfig no lugar indicado, onde está escrito COLE AQUI.
6. Em Firestore Database, na aba Rules, cole as regras abaixo e publique.

Regras do Firestore:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /usuarios/{uid} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }

Essas regras deixam cada conta enxergar apenas os próprios dados.

## Como publicar no GitHub Pages

1. Entre em github.com e faça login. Se ainda não tiver conta, crie uma, é gratuito.
2. Clique em New para criar um repositório. Dê um nome, por exemplo rotina, e deixe como público. Clique em Create repository.
3. Dentro do repositório, clique em Add file e depois em Upload files. Arraste o index.html já com o firebaseConfig colado, mantendo esse nome exato. Clique em Commit changes.
4. Vá em Settings e depois em Pages, no menu lateral.
5. Em Branch, escolha main e a pasta root. Clique em Save.
6. Espere um ou dois minutos. O endereço aparece no topo dessa mesma tela, algo como https://seuusuario.github.io/rotina.

## Como usar em vários aparelhos

Abra o endereço da página em cada aparelho e entre com o mesmo email e senha. O histórico fica igual em todos e atualiza na hora. Você continua logada, então o login só é pedido na primeira vez de cada aparelho. Para trocar de conta, use o link sair desta conta no rodapé.

## Sobre os dados

As marcações ficam guardadas na sua conta do Firebase, e não mais presas a um aparelho só. Sem internet, a página guarda as marcações e sincroniza assim que a conexão voltar.

## A rotina cadastrada

- 8:00 às 9:00, guaraná, maca peruana e ginseng, suplemento
- 12:00, lurasidona 40 mg, com o almoço
- 17:00, alprazolam 1,5 mg
- 18:00, lamitor 200 mg
- 20:00, lítio 900 mg
- 21:00, quetiapina XR 50 mg
