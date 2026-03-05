const express = require("express");
const app = express();

app.set("view engine", "ejs");
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.render("index");
});


app.get('/jr', (req, res) => {
  res.render('jr')
})

app.get("/produto", (req, res) => {
  res.render("detail");
});





const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});



//app.listen(3000, () => {
//  console.log("Servidor rodando em http://localhost:3000");
//});
