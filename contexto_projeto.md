# Projeto Lojao

## Stack
- Node.js
- Express
- EJS
- PostgreSQL
- TailwindCSS

## Estrutura do projeto

lojao
- server.js
- package.json
- db.js
- views
- public
- routes
- controllers

## Banco de dados

PostgreSQL

Tabela produtos:

CREATE TABLE produtos (
 id SERIAL PRIMARY KEY,
 nome VARCHAR(255),
 preco NUMERIC(10,2),
 descricao TEXT,
 imagem TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## Funcionalidades já feitas

- Página inicial
- Painel admin
- Cadastro de produtos
- Upload de imagem
- Preview da imagem no admin

## Próximos passos

- CRUD completo de produtos
- Editar produto
- Deletar produto
- Listagem de produtos no site