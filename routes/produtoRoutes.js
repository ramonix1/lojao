const express = require("express");

const router = express.Router();

const produtoController = require("../controllers/produtoController");

const upload = require("../middlewares/upload");

router.get("/", produtoController.home);

router.get("/admin", produtoController.admin);

router.get("/produto/:id", produtoController.detail);

router.post(
    "/salvar-produto",
    upload.array("imagens",10),
    produtoController.salvar
);

router.get("/editar/:id", produtoController.editar);

router.post(
    "/atualizar/:id",
    upload.array("imagens",10),
    produtoController.atualizar
);

router.get("/excluir/:id", produtoController.excluir);

module.exports = router;