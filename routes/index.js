
const express = require("express");
 
const {regristrarUsuario, agregarDinero, comprarOvender} = require("../controlers")

const router = express.Router();

router.post("/account", regristrarUsuario);
router.post("/account/:id/order", comprarOvender);
router.put("/account/", agregarDinero);

module.exports = {
    router
}