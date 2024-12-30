const express = require('express')
const router = express.Router()
const {lawsonScraper,addLawsonProducts,getLawsonProducts} = require('../models/LawsonProducts');
router.get('/getProducts',(req,res)=>{
    const products = getLawsonProducts();
})

router.post('/',(req,res)=>{
    
})

router.put('/',(req,res)=>{
    
})

router.delete('/',(req,res)=>{
    
})
module.exports = router;

