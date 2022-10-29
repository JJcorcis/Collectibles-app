const {db} = require("../firebase");

const regristrarUsuario = async (req, res) => {
    try {
        const {body: {money} }= req;
        if (money >= 0) {
            const collectiblesDB = db.collection("users");
            const newUser = {
                "current_balance": {
                    money,
                    collectibles: []
                },
            }
             const  {_path: {segments}} = await collectiblesDB.add(newUser);
             const id = segments[1];

             res.send({
                "status": 200,
                id, 
                ...newUser
             })
        } else {
            res.send({
                "status": 400,
                "current_balance": {},
                "business_errors": ["El valor ingresado tiene un valor inválido"]
            })
        }
    } catch (error) {
        console.log(error)
        res.send({
            "status": 400,
            "current_balance": {},
            "business_errors": [Error]
        })

    }
};

const agregarDinero = async (req, res) => {

    try {
        const {body: {money:reqMoney, id}} = req;

        if (reqMoney >= 0) {
            const collectiblesDB = db.collection("users").doc(id);
            await collectiblesDB.get()


                .then(response => {
                    const {_fieldsProto: {current_balance: {mapValue}}} = response;
                    const {fields: {collectibles, money}} = mapValue;

                    const newMoney = reqMoney + Number(money.integerValue || money.doubleValue);

                    const userCollectibles = collectibles.arrayValue.values.map(collectible => {
                        const {mapValue: {fields} } = collectible;
                        const {amount, collection_price, collection_name} = fields;
                        return {
                            collection_name: collection_name.stringValue,
                            amount: Number(amount.integerValue || amount.doubleValue),
                            collection_price: Number(collection_price.integerValue || collection_price.doubleValue),
                        }
                    })
                    

                    const updatedUser = {
                        "current_balance": {
                            "money": newMoney,
                            "collectibles": userCollectibles
                        },
                    }


                    collectiblesDB.update(
                        {
                            "current_balance": {
                                "money": newMoney,
                                "collectibles": userCollectibles
                            }
                        }
                    )


                    res.send({
                        "status": 200,
                        ...updatedUser,
                        "business_errors": []
                    })
                })


                .catch(error => {
                    console.log(error);
                    res.send({
                        "status": 400,
                        "current_balance": {},
                        "business_errors": [`No existe la información solicitada`]
                    })
                });


        } else {
            res.send({
                "status": 400,
                "current_balance": {},
                "business_errors": ["El valor ingresado tiene un valor inválido"]
            })
        }
    } catch (error) {
        console.log(error);
        res.send({
            "status": 500,
            "current_balance": {},
            "business_errors": ["Error desconocido"]
        });
    }

};


const comprarOvender = async (req, res) => {
    try {

        const {params: {id}} =  req;
        const {body: {operation, collection_name, amount, collection_price}} = req;


        const validAmount =  amount >= 0;
        const validPrice = collection_price >= 0;
        let foundedID = false;
        

        if (validAmount && validPrice) {
            const collectiblesDB = db.collection("users").doc(id);
            let userCollectibles;
            let chargeMoney;
            let userMoney;
            let collectibleIndex;

            await collectiblesDB.get()
                .then(response => {
                    const {_fieldsProto: {current_balance: {mapValue}}} = response;
                    const {fields: {collectibles, money}} = mapValue;
                    const {arrayValue: {values}} = collectibles;

                    userMoney =  Number(money.integerValue || money.doubleValue);

                    userCollectibles = values.map(collectible => {
                        const {mapValue: {fields} } = collectible;
                        const {amount, collection_price, collection_name} = fields;
                        return {
                            collection_name: collection_name.stringValue,
                            amount: Number(amount.integerValue || amount.doubleValue),
                            collection_price: Number(collection_price.integerValue || collection_price.doubleValue),
                        }
                    })

                    collectibleIndex = userCollectibles.findIndex(collectible => collection_name === collectible.collection_name);

                    if(collectibleIndex === -1) {
                        chargeMoney  = collection_price * amount;
                        userCollectibles.push({
                            collection_name,
                            amount: 0,
                            collection_price
                        })
                        collectibleIndex = userCollectibles.length-1;
                    }
                    else {
                        chargeMoney = userCollectibles[collectibleIndex].collection_price * amount;
                    }

                    foundedID = true;
                })
                .catch(error => {
                    console.log(error);
                    res.send({
                        "status": 400,
                        "current_balance": {},
                        "business_errors": [`Inexistente`]
                    })
                })


            if(!foundedID) return;


            if (operation === "BUY") {
                if (chargeMoney > userMoney) {
                    res.send({
                        "status": 400,
                        "current_balance": {},
                        "business_errors": ["Credito monetario insuficiente"]
                    })
                } else {
                    userMoney -= chargeMoney;
                    userCollectibles[collectibleIndex].amount += amount;

                    const updatedUser = {
                        "current_balance": {
                            "money": userMoney,
                            "collectibles": userCollectibles
                        }
                    }

                    collectiblesDB.update({...updatedUser});

                    res.send( {
                        "status": 200,
                        ...updatedUser,
                        "business_errors": []
                    })
                }
            } else if (operation === "SELL"){
                if(amount > userCollectibles[collectibleIndex].amount) {
                    res.send({
                        "status": 400,
                        "current_balance": {},
                        "business_errors": ["Coleccionables insuficientes para realizar esta acción"]
                    })
                } else {
                    userMoney += chargeMoney;
                    userCollectibles[collectibleIndex].amount -= amount;

                    const updatedUser = {
                        "current_balance": {
                            "money": userMoney,
                            "collectibles": userCollectibles
                        }
                    }

                    collectiblesDB.update({...updatedUser});

                    res.send( {
                        "status": 200,
                        ...updatedUser,
                        "business_errors": []
                    })
                }
            } else {
                res.send({
                    "status": 400,
                    "current_balance": {},
                    "business_errors": ["Operación no valida"]
                })
            }
        }
        else {
            res.send({
                "status": 400,
                "current_balance": {},
                "business_errors": ["Los valores proporcionados son invalidos"]
            })
        }
    } catch (error) {
        console.log(error);
        res.send({
            "status": 500,
            "current_balance": {},
            "business_errors": ["Error interno del servidor :("]
        });
    }
};

module.exports = {
    regristrarUsuario,
    agregarDinero,
    comprarOvender
}