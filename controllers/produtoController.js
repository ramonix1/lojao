const db = require("../config/db");
const fs = require("fs").promises;
const path = require("path");

// ======================
// HOME
// ======================
exports.home = async (req, res) => {
  try {

    const produtos = await db.query(
      "SELECT * FROM produtos ORDER BY created_at DESC"
    );

    res.render("pages/index", {
      produtos: produtos.rows
    });

  } catch (error) {

    console.error("Erro ao carregar home:", error);
    res.status(500).render("pages/error", {
      message: "Erro ao carregar produtos"
    });

  }
};


// ======================
// ADMIN
// ======================
exports.admin = async (req, res) => {

  try {

    const produtos = await db.query(
      "SELECT * FROM produtos ORDER BY created_at DESC"
    );

    res.render("pages/admin", {
      produtos: produtos.rows
    });

  } catch (error) {

    console.error("Erro admin:", error);

    res.status(500).render("pages/error", {
      message: "Erro ao carregar painel"
    });

  }

};


// ======================
// DETAIL
// ======================
exports.detail = async (req, res) => {

  const id = req.params.id;

  try {

    const produto = await db.query(
      "SELECT * FROM produtos WHERE id = $1",
      [id]
    );

    if (produto.rows.length === 0) {
      return res.status(404).render("pages/error", {
        message: "Produto não encontrado"
      });
    }

    const imagens = await db.query(
      "SELECT * FROM produtos_imagens WHERE produto_id = $1",
      [id]
    );

    res.render("pages/detail", {
      produto: produto.rows[0],
      imagens: imagens.rows
    });

  } catch (error) {

    console.error("Erro detail:", error);

    res.status(500).render("pages/error", {
      message: "Erro ao carregar produto"
    });

  }

};


// ======================
// SALVAR PRODUTO
// ======================
exports.salvar = async (req, res) => {

  const { titulo, subtitulo, valor, descricao } = req.body;

  try {

    const produto = await db.query(
      `INSERT INTO produtos
      (nome, subtitulo, valor, descricao)
      VALUES ($1,$2,$3,$4)
      RETURNING id`,
      [titulo, subtitulo, valor, descricao]
    );

    const produtoId = produto.rows[0].id;

    if (req.files && req.files.length > 0) {

      for (const file of req.files) {

        await db.query(
          `INSERT INTO produtos_imagens
          (produto_id, url)
          VALUES ($1,$2)`,
          [produtoId, `/images/${file.filename}`]
        );

      }

    }

    res.redirect("/admin");

  } catch (error) {

    console.error("Erro ao salvar produto:", error);

    res.status(500).render("pages/error", {
      message: "Erro ao salvar produto"
    });

  }

};


// ======================
// EDITAR
// ======================
exports.editar = async (req, res) => {

  const id = req.params.id;

  try {

    const produto = await db.query(
      "SELECT * FROM produtos WHERE id = $1",
      [id]
    );

    if (produto.rows.length === 0) {
      return res.status(404).render("pages/error", {
        message: "Produto não encontrado"
      });
    }

    const imagens = await db.query(
      "SELECT * FROM produtos_imagens WHERE produto_id = $1",
      [id]
    );

    res.render("pages/editar", {
      produto: produto.rows[0],
      imagens: imagens.rows
    });

  } catch (error) {

    console.error("Erro ao abrir edição:", error);

    res.status(500).render("pages/error", {
      message: "Erro ao carregar edição"
    });

  }

};


// ======================
// ATUALIZAR
// ======================
exports.atualizar = async (req, res) => {

  const id = req.params.id;

  const { titulo, subtitulo, valor, descricao } = req.body;

  try {

    await db.query(
      `UPDATE produtos
      SET nome=$1, subtitulo=$2, valor=$3, descricao=$4
      WHERE id=$5`,
      [titulo, subtitulo, valor, descricao, id]
    );

    if (req.files && req.files.length > 0) {

      for (const file of req.files) {

        await db.query(
          `INSERT INTO produtos_imagens
          (produto_id, url)
          VALUES ($1,$2)`,
          [id, `/images/${file.filename}`]
        );

      }

    }

    res.redirect("/admin");

  } catch (error) {

    console.error("Erro ao atualizar:", error);

    res.status(500).render("pages/error", {
      message: "Erro ao atualizar produto"
    });

  }

};


// ======================
// EXCLUIR
// ======================
exports.excluir = async (req, res) => {

  const id = req.params.id;

  try {

    const imagens = await db.query(
      "SELECT url FROM produtos_imagens WHERE produto_id = $1",
      [id]
    );

    for (const img of imagens.rows) {

      const caminho = path.join(__dirname, "..", "public", img.url);

      try {
        await fs.unlink(caminho);
      } catch {}

    }

    await db.query(
      "DELETE FROM produtos WHERE id=$1",
      [id]
    );

    res.redirect("/admin");

  } catch (error) {

    console.error("Erro ao excluir:", error);

    res.status(500).render("pages/error", {
      message: "Erro ao excluir produto"
    });

  }

};