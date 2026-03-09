const express = require("express");
const app = express();
const fs = require("fs");


const multer = require("multer");
const path = require("path");

//salvando imagens com multer

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, "public/images");
  },

  filename: function (req, file, cb) {
    const nome = Date.now() + path.extname(file.originalname);
    cb(null, nome);
  }

});

const upload = multer({ storage: storage });




app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

function carregarProdutos(){
  const data = fs.readFileSync("./data/produtos.json");
  return JSON.parse(data);
}

// HOME
app.get("/", (req, res) => {

  const produtos = carregarProdutos();

  res.render("index", { produtos });

});

// SOBRE
app.get("/jr", (req, res) => {
  res.render("jr");
});

// DETALHE PRODUTO
app.get("/produto/:id", (req, res) => {

  const produtos = carregarProdutos();

  const produto = produtos.find(p => p.id == req.params.id);

  res.render("detail", { produto });

});

// Salvar produto

app.get("/admin", (req, res) => {
  res.render("admin");
});

app.post("/salvar-produto", upload.single("imagem"), (req, res) => {

  const produtos = carregarProdutos();

  const novoProduto = {
    id: Date.now(),
    titulo: req.body.titulo,
    subtitulo: req.body.subtitulo,
    valor: req.body.valor,
    descricao: req.body.descricao,
    imagem: "/images/" + req.file.filename
  };

  produtos.push(novoProduto);

  fs.writeFileSync(
    "./data/produtos.json",
    JSON.stringify(produtos, null, 2)
  );

  res.redirect("/");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});