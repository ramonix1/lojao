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



app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});


