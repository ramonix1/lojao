const { Pool } = require('pg');

// Verifica se está rodando no Render (produção)
const isProduction = process.env.NODE_ENV === "production" || process.env.DATABASE_URL;

const pool = new Pool({
  /* Se estiver no Render, ele usa a DATABASE_URL.
     Se estiver no seu PC, ele usa a string com seus dados:
     Formato: postgresql://USUARIO:SENHA@HOST:PORTA/BANCO
  */
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:123456@localhost:5432/lojao",
  
  // O SSL é obrigatório no Render, mas no seu PC (local) deve ser false
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = pool;