const express = require("express");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const multer = require("multer");
const app = express();

const db = require("./config/db");

// =============================
// TESTE BANCO
// =============================
(async () => {
  try {
    const res = await db.query("SELECT NOW()");
    console.log("✅ Banco conectado:", res.rows[0].now);
  } catch (err) {
    console.error("❌ Erro no banco:", err.message);
    process.exit(1);
  }
})();

// =============================
// DIRETÓRIO UPLOAD
// =============================
const uploadDir = "public/images";

if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}

// =============================
// MULTER
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// =============================
// MIDDLEWARES
// =============================
app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

// =============================
// FUNÇÃO VALOR
// =============================
function converterValor(valor) {
  if (!valor) return null;

  valor = valor.replace("R$", "").trim();

  if (valor.includes(",")) {
    valor = valor.replace(/\./g, "").replace(",", ".");
  }

  return parseFloat(valor);
}

// =============================
// HOME
// =============================
app.get("/", async (req, res) => {
  const produtos = await db.query(
    "SELECT * FROM produtos ORDER BY created_at DESC"
  );

  res.render("index", { produtos: produtos.rows });
});

// =============================
// ADMIN
// =============================
app.get("/admin", async (req, res) => {
  const produtos = await db.query(
    "SELECT * FROM produtos ORDER BY created_at DESC"
  );

  res.render("admin", { produtos: produtos.rows });
});

// =============================
// DETAIL PRODUTO
// =============================
app.get("/produto/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const produto = await db.query(
      "SELECT * FROM produtos WHERE id = $1",
      [id]
    );

    const imagens = await db.query(
      "SELECT * FROM produtos_imagens WHERE produto_id = $1",
      [id]
    );

    if (produto.rows.length === 0) {
      return res.send("Produto não encontrado");
    }

    res.render("detail", {
      produto: produto.rows[0],
      imagens: imagens.rows,
    });
  } catch (err) {
    console.log(err);
    res.send("Erro ao carregar produto");
  }
});

// =============================
// SALVAR PRODUTO
// =============================
app.post("/salvar-produto", upload.array("imagens", 10), async (req, res) => {
  try {
    const { titulo, subtitulo, valor, descricao } = req.body;

    const valorLimpo = converterValor(valor);

    const produto = await db.query(
      `
      INSERT INTO produtos (nome, subtitulo, valor, descricao)
      VALUES ($1,$2,$3,$4)
      RETURNING id
      `,
      [titulo, subtitulo, valorLimpo, descricao]
    );

    const produtoId = produto.rows[0].id;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = `/images/${file.filename}`;

        await db.query(
          `
          INSERT INTO produtos_imagens (produto_id, url)
          VALUES ($1,$2)
          `,
          [produtoId, url]
        );
      }
    }

    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.send("Erro ao salvar produto");
  }
});

// =============================
// EDITAR PRODUTO
// =============================
app.get("/editar/:id", async (req, res) => {
  const id = req.params.id;

  const produto = await db.query(
    "SELECT * FROM produtos WHERE id = $1",
    [id]
  );

  const imagens = await db.query(
    "SELECT * FROM produtos_imagens WHERE produto_id = $1",
    [id]
  );

  res.render("editar", {
    produto: produto.rows[0],
    imagens: imagens.rows,
  });
});

// =============================
// ATUALIZAR PRODUTO
// =============================
app.post("/atualizar/:id", upload.array("imagens", 10), async (req, res) => {
  const id = req.params.id;

  const { titulo, subtitulo, valor, descricao } = req.body;

  const valorLimpo = converterValor(valor);

  await db.query(
    `
    UPDATE produtos
    SET nome=$1, subtitulo=$2, valor=$3, descricao=$4
    WHERE id=$5
    `,
    [titulo, subtitulo, valorLimpo, descricao, id]
  );

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = `/images/${file.filename}`;

      await db.query(
        `
        INSERT INTO produtos_imagens (produto_id, url)
        VALUES ($1,$2)
        `,
        [id, url]
      );
    }
  }

  res.redirect("/admin");
});

// =============================
// EXCLUIR PRODUTO
// =============================
app.get("/excluir/:id", async (req, res) => {
  const id = req.params.id;

  const imagens = await db.query(
    "SELECT * FROM produtos_imagens WHERE produto_id = $1",
    [id]
  );

  for (const img of imagens.rows) {
    const caminho = path.join(__dirname, "public", img.url);

    try {
      await fs.unlink(caminho);
    } catch {}
  }

  await db.query("DELETE FROM produtos WHERE id = $1", [id]);

  res.redirect("/admin");
});

// =============================
// 404
// =============================
app.use((req, res) => {
  res.status(404).send("Página não encontrada");
});

// =============================
// SERVER
// =============================
const PORT = 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT);
});