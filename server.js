const express = require("express");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const multer = require("multer");
const app = express();

// Configuração do banco de dados
const db = require("./config/db");

// Teste de conexão com o banco
(async () => {
  try {
    const res = await db.query("SELECT NOW()");
    console.log("✅ Banco conectado:", res.rows[0].now);
  } catch (err) {
    console.error("❌ Erro no banco:", err.message);
    process.exit(1);
  }
})();

// Garantir que o diretório de uploads existe
const uploadDir = "public/images";
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Diretório criado: ${uploadDir}`);
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Apenas imagens são permitidas!"));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middlewares
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error("❌ Erro:", err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).render("error", { 
        message: "Arquivo muito grande. Tamanho máximo: 5MB" 
      });
    }
  }
  
  res.status(500).render("error", { 
    message: err.message || "Erro interno do servidor" 
  });
});

// ============ ROTAS ============

// HOME - Lista produtos
app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos ORDER BY created_at DESC");
    res.render("index", { produtos: result.rows });
  } catch (err) {
    console.error("❌ Erro ao carregar produtos:", err.message);
    res.status(500).render("error", { message: "Erro ao carregar produtos" });
  }
});

// SOBRE
app.get("/jr", (req, res) => {
  res.render("jr");
});

// ADMIN - Gerenciar produtos
app.get("/admin", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos ORDER BY created_at DESC");
    res.render("admin", { produtos: result.rows });
  } catch (err) {
    console.error("❌ Erro ao carregar admin:", err.message);
    res.status(500).render("error", { message: "Erro ao carregar admin" });
  }
});

// DETALHE DO PRODUTO
app.get("/produto/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos WHERE id = $1", [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).render("error", { 
        message: "Produto não encontrado" 
      });
    }
    
    res.render("detail", { produto: result.rows[0] });
  } catch (err) {
    console.error("❌ Erro ao buscar produto:", err.message);
    res.status(500).render("error", { message: "Erro ao buscar produto" });
  }
});

// CRIAR PRODUTO - CORRIGIDO (usando 'nome' no banco)
app.post("/salvar-produto", upload.single("imagem"), async (req, res) => {
  try {
    console.log("📦 Dados recebidos:", req.body);
    console.log("🖼️ Arquivo:", req.file);

    // Front-end envia "titulo", mas banco espera "nome"
    const { titulo, subtitulo, valor, descricao } = req.body;

    // Validações
    if (!titulo || !titulo.trim()) {
      return res.status(400).send("Título é obrigatório");
    }
    
    if (!valor || !valor.trim()) {
      return res.status(400).send("Valor é obrigatório");
    }
    
    if (!req.file) {
      return res.status(400).send("Imagem é obrigatória");
    }

    // Limpar valor (remover R$ e converter vírgula para ponto)
    let valorLimpo = valor.replace(/[R$\s.]/g, '').replace(',', '.');
    
    if (isNaN(valorLimpo) || valorLimpo === '') {
      return res.status(400).send("Valor inválido");
    }

    const imagemPath = `/images/${req.file.filename}`;

    // CORRIGIDO: usando "nome" no INSERT
    const result = await db.query(
      `INSERT INTO produtos (nome, subtitulo, valor, descricao, imagem) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [titulo.trim(), subtitulo?.trim() || '', valorLimpo, descricao?.trim() || '', imagemPath]
    );

    console.log("✅ Produto criado com ID:", result.rows[0].id);
    res.redirect("/admin");

  } catch (err) {
    console.error("❌ Erro detalhado ao salvar produto:");
    console.error("Mensagem:", err.message);
    console.error("Stack:", err.stack);
    
    if (err.code) {
      console.error("Código PG:", err.code);
      console.error("Detalhe PG:", err.detail);
    }
    
    res.status(500).send(`Erro ao salvar: ${err.message}`);
  }
});

// EDITAR PRODUTO - Formulário
app.get("/editar/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos WHERE id = $1", [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).send("Produto não encontrado");
    }
    
    res.render("editar", { produto: result.rows[0] });
  } catch (err) {
    console.error("❌ Erro ao carregar edição:", err.message);
    res.status(500).send("Erro ao carregar produto para edição");
  }
});

// ATUALIZAR PRODUTO - CORRIGIDO (usando 'nome' no banco)
app.post("/atualizar/:id", upload.single("imagem"), async (req, res) => {
  try {
    const { titulo, subtitulo, valor, descricao } = req.body;
    const id = req.params.id;

    // Validações
    if (!titulo || !titulo.trim()) {
      return res.status(400).send("Título é obrigatório");
    }
    
    if (!valor || !valor.trim()) {
      return res.status(400).send("Valor é obrigatório");
    }

    // Limpar valor
    let valorLimpo = valor.replace(/[R$\s.]/g, '').replace(',', '.');

    // Se uma nova imagem foi enviada
    if (req.file) {
      // Buscar imagem antiga para deletar
      const oldProduto = await db.query("SELECT imagem FROM produtos WHERE id = $1", [id]);
      
      // Deletar imagem antiga se existir
      if (oldProduto.rows.length > 0 && oldProduto.rows[0].imagem) {
        const oldImagePath = path.join(__dirname, "public", oldProduto.rows[0].imagem);
        try {
          await fs.unlink(oldImagePath);
          console.log(`🗑️ Imagem antiga deletada: ${oldImagePath}`);
        } catch (err) {
          console.warn("⚠️ Imagem antiga não encontrada:", oldImagePath);
        }
      }
      
      // CORRIGIDO: usando "nome" no UPDATE com nova imagem
      const imagemPath = `/images/${req.file.filename}`;
      await db.query(
        `UPDATE produtos SET nome=$1, subtitulo=$2, valor=$3, descricao=$4, imagem=$5 WHERE id=$6`,
        [titulo.trim(), subtitulo?.trim() || '', valorLimpo, descricao?.trim() || '', imagemPath, id]
      );
    } else {
      // CORRIGIDO: usando "nome" no UPDATE sem nova imagem
      await db.query(
        `UPDATE produtos SET nome=$1, subtitulo=$2, valor=$3, descricao=$4 WHERE id=$5`,
        [titulo.trim(), subtitulo?.trim() || '', valorLimpo, descricao?.trim() || '', id]
      );
    }

    console.log(`✅ Produto ${id} atualizado`);
    res.redirect("/admin");

  } catch (err) {
    console.error("❌ Erro ao atualizar produto:", err.message);
    res.status(500).send("Erro ao atualizar produto");
  }
});

// EXCLUIR PRODUTO
app.get("/excluir/:id", async (req, res) => {
  try {
    // Buscar imagem para deletar do disco
    const produto = await db.query("SELECT imagem FROM produtos WHERE id = $1", [req.params.id]);
    
    if (produto.rows.length === 0) {
      return res.status(404).send("Produto não encontrado");
    }
    
    // Deletar do banco
    await db.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);
    
    // Deletar arquivo de imagem
    if (produto.rows[0].imagem) {
      const imagemPath = path.join(__dirname, "public", produto.rows[0].imagem);
      try {
        await fs.unlink(imagemPath);
        console.log(`🗑️ Imagem deletada: ${imagemPath}`);
      } catch (err) {
        console.warn("⚠️ Imagem não encontrada no disco:", imagemPath);
      }
    }
    
    console.log(`✅ Produto ${req.params.id} excluído`);
    res.redirect("/admin");

  } catch (err) {
    console.error("❌ Erro ao excluir produto:", err.message);
    res.status(500).send("Erro ao excluir produto");
  }
});

// Rota 404
app.use((req, res) => {
  res.status(404).render("error", { 
    message: "Página não encontrada" 
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 Acesse: http://localhost:${PORT}`);
  console.log(`📁 Admin: http://localhost:${PORT}/admin`);
});

