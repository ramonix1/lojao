const express = require("express");
const path = require("path");

const produtoRoutes = require("./routes/produtoRoutes");

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", produtoRoutes);

app.use((req,res)=>{
    res.status(404).render("pages/error",{message:"Página não encontrada"})
})

const PORT = 3000;

app.listen(PORT, ()=>{
    console.log("Servidor rodando na porta", PORT)
})